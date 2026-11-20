/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/io.ts" enhancement="_blank"/>

import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import {
  derivationFile,
  displayPath,
  inputFile,
  type D1FileInfo,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { hashesAgree, sourceIdentityHash } from '/_102021_/l2/helpers/l1Defs/identity.js';
import { readWriterReceipts } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readRederive, rederiveTypesFrom } from '/_102021_/l2/agentDefsL1/helpers/d1Rederive.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import { externalConnectionIds } from '/_102021_/l2/agentDefsL1/steps/input20/entityCatalog.js';
import { catalogFilePath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import {
  REGISTRY_LOGICAL_PATH,
  declarationRef,
  declaredSystemsOf,
  integrationLogicalPath,
  siblingModuleNames,
  type ConnectionScope,
  type SiblingSystems,
} from '/_102021_/l2/helpers/connections/catalogResolve.js';
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
  type D1RequestGapAnswer,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot, contractPageIds } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { readContractAst, type D1ContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

interface Loaded {
  path: string;
  text: string | null;
  parsed: unknown;
  digest: D1SourceDigest;
}

export { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';

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

/** The input20 receipt: the snapshot without answers, and the key of its sources (d1_62). */
export type D1InputDerivation = D1InputSnapshot & { sourceKey: string };

/**
 * Reads the snapshot inputs and returns the inventory. Writes nothing. `previous` is the final `input.json` on disk.
 * Without `answers` it is the input20 view (the gaps stay); with the resolve25 answers it is the final inventory.
 */
export async function assembleD1Input(
  project: number,
  moduleName: string,
  answers: ReadonlyMap<string, readonly D1RequestGapAnswer[]> = new Map(),
): Promise<D1InputSnapshot> {
  const previous = await readD1Input(project, moduleName);
  const { known, loaded, parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope } = await loadInputSources(project, moduleName);
  const artifacts = artifactsFrom(moduleName, known, loaded, parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope, [], []);
  const draft = seal(buildD1InputSnapshot({ project, moduleName }, artifacts, previous, answers));
  const writerReceipts = await readWriterReceipts(project, moduleName);
  const present = await readPresent(project, draft.files.map(file => file.defPath), writerReceipts);
  const marker = await readRederive(project, moduleName);
  const sealed = seal(buildD1InputSnapshot(
    { project, moduleName },
    { ...artifactsFrom(moduleName, known, loaded, parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope, present, writerReceipts), ...(marker ? { rederiveTypes: rederiveTypesFrom(marker.from) } : {}) },
    previous,
    answers,
  ));
  sealed.snapshotHash = await sha256Text(stableStringify(withoutHash(sealed)));
  return sealed;
}

/**
 * The same sources input20 reads, as artifacts, without the present defs. A later step compares their digests with
 * the snapshot `sources` to know it reads what input20 sealed (d1_62).
 */
export async function readD1InputArtifacts(project: number, moduleName: string): Promise<D1InputArtifacts> {
  const { known, loaded, parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope } = await loadInputSources(project, moduleName);
  return artifactsFrom(moduleName, known, loaded, parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope, [], []);
}

/**
 * The key of the input20 and resolve25 receipts (d1_62): the hash of the snapshot built from the sources alone,
 * without the present defs, the writer receipts, a previous snapshot or answers. Same sources, same key.
 */
export async function d1SourceKey(identity: { project: number; moduleName: string }, artifacts: D1InputArtifacts): Promise<string> {
  const bare: D1InputArtifacts = { ...artifacts, presentDefs: [], writerReceipts: [] };
  return sha256Text(stableStringify(withoutHash(seal(buildD1InputSnapshot(identity, bare, null)))));
}

export async function readD1Derivation(project: number, moduleName: string): Promise<D1InputDerivation | null> {
  const raw = await readText(derivationFile(project, moduleName));
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const derivation = parsed as D1InputDerivation;
  if (derivation.schemaVersion !== D1_INPUT_VERSION || typeof derivation.sourceKey !== 'string') return null;
  if (derivation.project !== project || derivation.moduleName !== moduleName) return null;
  return derivation;
}

/** Writes `input20.json` unless the same snapshot with the same key is there. */
export async function persistD1Derivation(project: number, moduleName: string, snapshot: D1InputSnapshot, sourceKey: string): Promise<{ reused: boolean }> {
  const existing = await readD1Derivation(project, moduleName);
  if (existing && existing.sourceKey === sourceKey && existing.snapshotHash === snapshot.snapshotHash) return { reused: true };
  await writeJson(derivationFile(project, moduleName), { ...snapshot, sourceKey });
  return { reused: false };
}

async function loadInputSources(project: number, moduleName: string): Promise<{
  known: Loaded[];
  loaded: Loaded[];
  parsed: Map<string, unknown>;
  contractMap: Record<string, D1ContractAst | null>;
  contractTexts: Record<string, string>;
  catalogTexts: Record<string, string>;
  catalogs: Loaded[];
  connectionScope: ConnectionScope;
}> {
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
    const loaded = await loadContract(project, path);
    return { pageId, loaded };
  }));
  const contractMap: Record<string, D1ContractAst | null> = {};
  const contractTexts: Record<string, string> = {};
  for (const contract of contracts) {
    contractMap[contract.pageId] = contract.loaded.parsed as D1ContractAst | null;
    if (contract.loaded.text != null) contractTexts[contract.pageId] = contract.loaded.text;
  }
  const { catalogTexts, catalogs, connectionScope } = await loadServeCatalogs(project, moduleName, parsed.get(paths.integration), externalConnectionIds(dynamic.map(item => item.parsed)));
  return { known, loaded: contracts.map(item => item.loaded), parsed, contractMap, contractTexts, catalogTexts, catalogs, connectionScope };
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

async function readPresent(
  project: number,
  defPaths: string[],
  receipts: ReadonlyArray<{ defPath: string; desiredHash: string }>,
): Promise<D1PresentDef[]> {
  const present: D1PresentDef[] = [];
  for (const defPath of defPaths) {
    if (!defPath.startsWith('l1/')) continue;
    const info = fileInfoFromDisplay(project, defPath);
    if (!info) continue;
    const text = await readText(info);
    if (text == null) continue;
    const identity = await sourceIdentityHash(text);
    let sha256 = identity;
    for (const receipt of receipts) {
      if (receipt.defPath !== defPath || !receipt.desiredHash) continue;
      if (await hashesAgree(text, receipt.desiredHash)) {
        sha256 = receipt.desiredHash;
        break;
      }
    }
    present.push({ path: defPath, sha256 });
  }
  return present;
}

function artifactsFrom(
  moduleName: string,
  known: Loaded[],
  contracts: Loaded[],
  parsed: Map<string, unknown>,
  contractMap: Record<string, D1ContractAst | null>,
  contractTexts: Record<string, string>,
  catalogTexts: Record<string, string>,
  catalogs: Loaded[],
  connectionScope: ConnectionScope,
  presentDefs: D1PresentDef[],
  writerReceipts: ReadonlyArray<{ defPath: string; desiredHash: string }>,
): D1InputArtifacts {
  const sources = [...known, ...contracts, ...catalogs].map(item => item.digest).sort((left, right) => left.path.localeCompare(right.path));
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
    contractTexts,
    catalogTexts,
    ...(connectionScope.own.length || connectionScope.siblings.length ? { connectionScope } : {}),
    presentDefs,
    writerReceipts,
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

/**
 * Catalog text of each `serve` connection of the platform, and the systems the L4 declares (d1_208): this module's, then a
 * sibling's. A missing platform file stays out of `catalogTexts` and is a `missing` digest, unless a declared system owns the id
 * (a declared system has no catalog file). The sibling L4 and the project registry are sealed in the sources only when a connection
 * is neither on the platform nor this module's: a module with platform connections only reads what it read before.
 */
async function loadServeCatalogs(project: number, moduleName: string, integration: unknown, entityConnectionIds: readonly string[]): Promise<{
  catalogTexts: Record<string, string>;
  catalogs: Loaded[];
  connectionScope: ConnectionScope;
}> {
  const catalogTexts: Record<string, string> = {};
  const catalogs: Loaded[] = [];
  const own = declaredSystemsOf(integration);
  const ownIds = new Set(own.map(system => system.id));
  const platformPresent = new Map<string, boolean>();
  const platformCatalog = async (connectionId: string): Promise<string | null> => {
    const path = catalogFilePath(connectionId);
    const info = path ? catalogInfo(path) : null;
    const body = info ? await readText(info) : null;
    platformPresent.set(connectionId, Boolean(body));
    return body;
  };
  const serveIds: string[] = [];
  const otherIds: string[] = [];
  for (const row of rows(rec(integration).connections)) {
    const connectionId = text(row.connectionId);
    if (!isSafeToken(connectionId) || serveIds.includes(connectionId) || otherIds.includes(connectionId)) continue;
    (text(row.direction) === 'serve' ? serveIds : otherIds).push(connectionId);
  }
  // d1_220: the connection an `external` entity names is resolved like the lines of `connections[]`, and its sibling declaration is sealed too.
  for (const connectionId of entityConnectionIds) if (!serveIds.includes(connectionId) && !otherIds.includes(connectionId)) otherIds.push(connectionId);
  const bodies = new Map<string, string | null>();
  for (const connectionId of serveIds) bodies.set(connectionId, await platformCatalog(connectionId));
  for (const connectionId of otherIds) if (!ownIds.has(connectionId)) await platformCatalog(connectionId);
  // Neither the platform nor this module: a sibling may declare it.
  const unresolved = [...serveIds, ...otherIds].filter(id => !platformPresent.get(id) && !ownIds.has(id));
  const siblings: SiblingSystems[] = [];
  if (unresolved.length) {
    const registry = await loadOne(project, REGISTRY_LOGICAL_PATH);
    catalogs.push(registry);
    for (const sibling of siblingModuleNames(registry.parsed, moduleName)) {
      const loadedSibling = await loadOne(project, integrationLogicalPath(sibling));
      const systems = declaredSystemsOf(loadedSibling.parsed);
      if (systems.some(system => unresolved.includes(system.id))) {
        catalogs.push(loadedSibling);
        siblings.push({ moduleName: sibling, systems });
      }
    }
  }
  for (const connectionId of entityConnectionIds) {
    if (platformPresent.get(connectionId)) continue;
    // The declaration of this module or of a sibling, read like any other source of the run.
    const owner = ownIds.has(connectionId) ? moduleName : siblings.find(item => item.systems.some(system => system.id === connectionId))?.moduleName;
    if (!owner) continue;
    // A declaration not generated yet is not sealed: the domain step refuses it by name (SIBLING_DECLARATION_MISSING, OWN_DECLARATION_NOT_GENERATED).
    const ref = `/${declarationRef(project, owner, connectionId)}`;
    const info = catalogInfo(ref);
    const body = info ? await readText(info) : null;
    if (!body) continue;
    catalogs.push({
      path: ref,
      text: body,
      parsed: null,
      digest: { path: ref, sha256: await sha256Text(body), bytes: new TextEncoder().encode(body).length, schemaVersion: '', state: 'present' },
    });
  }
  for (const connectionId of serveIds) {
    const body = bodies.get(connectionId) ?? null;
    const path = catalogFilePath(connectionId);
    if (!path) continue;
    if (body) catalogTexts[connectionId] = body;
    // A declared system has no catalog file: no digest of a file that is not meant to exist.
    if (!body && (ownIds.has(connectionId) || siblings.some(item => item.systems.some(system => system.id === connectionId)))) continue;
    const sha256 = body ? await sha256Text(body) : '';
    catalogs.push({
      path,
      text: body,
      parsed: null,
      digest: {
        path,
        sha256,
        bytes: body ? new TextEncoder().encode(body).length : 0,
        schemaVersion: '',
        state: body ? 'present' : 'missing',
      },
    });
  }
  return { catalogTexts, catalogs, connectionScope: { moduleName, own, siblings } };
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(rec) : [];
}

async function loadContract(project: number, path: string): Promise<Loaded> {
  const info = fileInfoFromDisplay(project, path);
  const text = info ? await readText(info) : null;
  if (text == null) {
    return { path, text: null, parsed: null, digest: { path, sha256: '', bytes: 0, schemaVersion: '', state: 'missing' } };
  }
  const ast = readContractAst(text, path);
  const sha256 = await sha256Text(text);
  const bytes = new TextEncoder().encode(text).length;
  return {
    path,
    text,
    parsed: ast,
    digest: { path, sha256, bytes, schemaVersion: '', state: ast.unparsed.length ? 'invalid' : 'present' },
  };
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
