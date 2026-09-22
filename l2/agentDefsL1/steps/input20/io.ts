/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/io.ts" enhancement="_blank"/>

import {
  displayPath,
  inputFile,
  type D1FileInfo,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import {
  D1_INPUT_VERSION,
  contractPath,
  entityPath,
  inputPaths,
  isSafeToken,
  journeyPath,
  type D1InputArtifacts,
  type D1InputSnapshot,
  type D1PresentDef,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot, contractPageIds } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';

interface Loaded {
  path: string;
  text: string | null;
  parsed: unknown;
  digest: D1SourceDigest;
}

/** Reads the object of `export const name = { ... }` without evaluating the file. */
export function parseD1Source(text: string, kind: 'json' | 'defs'): unknown | null {
  const body = kind === 'json' ? text : extractDefsObject(text);
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function extractDefsObject(source: string): string {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

export async function readD1Input(project: number, moduleName: string): Promise<D1InputSnapshot | null> {
  const raw = await readText(inputFile(project, moduleName));
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const snapshot = parsed as D1InputSnapshot;
  if (snapshot.schemaVersion !== D1_INPUT_VERSION) return null;
  if (snapshot.project !== project || snapshot.moduleName !== moduleName) return null;
  return snapshot;
}

/** Reads the snapshot inputs and returns the inventory. Writes nothing. */
export async function assembleD1Input(project: number, moduleName: string): Promise<D1InputSnapshot> {
  const previous = await readD1Input(project, moduleName);
  const fixed = await Promise.all(fixedPaths(moduleName).map(path => loadOne(project, path)));
  const byPath = new Map(fixed.map(item => [item.path, item]));
  const journeyIndex = rec(byPath.get(inputPaths(moduleName).journeyIndex)?.parsed);
  const ontologyIndex = rec(byPath.get(inputPaths(moduleName).ontologyIndex)?.parsed);
  const dynamicPaths = [
    ...idList(journeyIndex.journeys, 'journeyId').filter(isSafeToken).map(id => journeyPath(moduleName, id)),
    ...idList(ontologyIndex.entities, 'entityId').filter(isSafeToken).map(id => entityPath(moduleName, id)),
  ];
  const dynamic = await Promise.all(dynamicPaths.map(path => loadOne(project, path)));
  const known = [...fixed, ...dynamic];
  const parsed = new Map(known.map(item => [item.path, item.parsed]));
  const paths = inputPaths(moduleName);
  const pageIds = contractPageIds({
    menu: parsed.get(paths.menu),
    needs: parsed.get(paths.needs),
    effort: parsed.get(paths.effort),
    backend: parsed.get(paths.backend),
  });
  const contracts = await Promise.all(pageIds.map(async pageId => {
    const path = contractPath(moduleName, pageId);
    const loaded = await loadOne(project, path);
    return { pageId, loaded };
  }));
  const contractMap: Record<string, unknown | null> = {};
  for (const contract of contracts) contractMap[contract.pageId] = contract.loaded.parsed;

  const artifacts = artifactsFrom(moduleName, known, contracts.map(item => item.loaded), parsed, contractMap, []);
  const draft = seal(buildD1InputSnapshot({ project, moduleName }, artifacts, previous));
  const present = await readPresent(project, draft.files.map(file => file.defPath));
  const sealed = seal(buildD1InputSnapshot(
    { project, moduleName },
    artifactsFrom(moduleName, known, contracts.map(item => item.loaded), parsed, contractMap, present),
    previous,
  ));
  sealed.snapshotHash = await sha256Text(stableStringify(withoutHash(sealed)));
  return sealed;
}

export async function persistD1Input(project: number, moduleName: string, snapshot: D1InputSnapshot): Promise<{ reused: boolean }> {
  const existing = await readD1Input(project, moduleName);
  if (existing?.snapshotHash && existing.snapshotHash === snapshot.snapshotHash) return { reused: true };
  await writeJson(inputFile(project, moduleName), snapshot);
  return { reused: false };
}

export function fileInfoFromDisplay(project: number, display: string): D1FileInfo | null {
  if (!display || display.includes('..')) return null;
  const match = /^l(\d+)\/(.+)\/([^/]+)$/.exec(display);
  if (!match) return null;
  const fileName = match[3];
  const extension = fileName.endsWith('.defs.ts') ? '.defs.ts' : fileName.includes('.') ? fileName.slice(fileName.indexOf('.')) : '';
  if (!extension) return null;
  const shortName = fileName.slice(0, fileName.length - extension.length);
  if (!isSafeToken(shortName)) return null;
  return {
    project,
    level: Number(match[1]),
    folder: match[2],
    shortName,
    extension,
  };
}

async function readPresent(project: number, defPaths: string[]): Promise<D1PresentDef[]> {
  const present: D1PresentDef[] = [];
  for (const defPath of defPaths) {
    if (!defPath.startsWith('l1/')) continue;
    const info = fileInfoFromDisplay(project, defPath);
    if (!info) continue;
    const text = await readText(info);
    if (text == null) continue;
    present.push({ path: defPath, sha256: await sha256Text(text) });
  }
  return present;
}

function artifactsFrom(
  moduleName: string,
  known: Loaded[],
  contracts: Loaded[],
  parsed: Map<string, unknown>,
  contractMap: Record<string, unknown | null>,
  presentDefs: D1PresentDef[],
): D1InputArtifacts {
  const sources = [...known, ...contracts].map(item => item.digest).sort((left, right) => left.path.localeCompare(right.path));
  const paths = inputPaths(moduleName);
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [path, value] of parsed) {
    if (path.startsWith(`l4/${moduleName}/journeys/`) && !path.endsWith('/index.defs.ts')) {
      const id = path.split('/').pop()?.replace(/\.defs\.ts$/, '') || '';
      if (id) journeys[id] = value;
    }
    if (path.startsWith(`l4/${moduleName}/ontology/`) && !path.endsWith('/index.defs.ts')) {
      const id = path.split('/').pop()?.replace(/\.defs\.ts$/, '') || '';
      if (id) entities[id] = value;
    }
  }
  return {
    sources,
    module: parsed.get(paths.module) ?? null,
    journeyIndex: parsed.get(paths.journeyIndex) ?? null,
    journeys,
    ontologyIndex: parsed.get(paths.ontologyIndex) ?? null,
    entities,
    rules: parsed.get(paths.rules) ?? null,
    workflows: parsed.get(paths.workflows) ?? null,
    access: parsed.get(paths.access) ?? null,
    integration: parsed.get(paths.integration) ?? null,
    menu: parsed.get(paths.menu) ?? null,
    needs: parsed.get(paths.needs) ?? null,
    backend: parsed.get(paths.backend) ?? null,
    effort: parsed.get(paths.effort) ?? null,
    planner: parsed.get(paths.planner) ?? null,
    contracts: contractMap,
    presentDefs,
  };
}

function fixedPaths(moduleName: string): string[] {
  const paths = inputPaths(moduleName);
  return [
    paths.module,
    paths.journeyIndex,
    paths.ontologyIndex,
    paths.rules,
    paths.workflows,
    paths.access,
    paths.integration,
    paths.menu,
    paths.needs,
    paths.backend,
    paths.effort,
    paths.planner,
  ];
}

async function loadOne(project: number, path: string): Promise<Loaded> {
  const info = fileInfoFromDisplay(project, path);
  const text = info ? await readText(info) : null;
  if (text == null) {
    return { path, text: null, parsed: null, digest: { path, sha256: '', bytes: 0, schemaVersion: '', state: 'missing' } };
  }
  const kind = path.endsWith('.json') ? 'json' : 'defs';
  const parsed = parseD1Source(text, kind);
  const sha256 = await sha256Text(text);
  const bytes = new TextEncoder().encode(text).length;
  if (parsed == null) {
    return { path, text, parsed: null, digest: { path, sha256, bytes, schemaVersion: '', state: 'invalid' } };
  }
  return {
    path,
    text,
    parsed,
    digest: { path, sha256, bytes, schemaVersion: textOf(rec(parsed).schemaVersion), state: 'present' },
  };
}

function seal(snapshot: D1InputSnapshot): D1InputSnapshot {
  return { ...snapshot, snapshotHash: '' };
}

function withoutHash(snapshot: D1InputSnapshot): Omit<D1InputSnapshot, 'snapshotHash'> {
  const copy = { ...snapshot };
  delete (copy as Partial<D1InputSnapshot>).snapshotHash;
  return copy;
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function idList(value: unknown, key: string): string[] {
  return Array.isArray(value) ? value.map(item => text(rec(item)[key])).filter(Boolean) : [];
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function textOf(value: unknown): string {
  return text(value);
}

export function ownedInputDisplay(project: number, moduleName: string): string {
  return displayPath(inputFile(project, moduleName));
}
