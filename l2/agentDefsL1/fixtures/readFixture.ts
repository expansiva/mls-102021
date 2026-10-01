/// <mls fileReference="_102021_/l2/agentDefsL1/fixtures/readFixture.ts" enhancement="_blank"/>

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay, parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Logical path (`.defs.ts`, `.json`) to the stored bytes. `SOURCE.md` is omitted. */
export function loadD1Fixture(id: string): Readonly<Record<string, string>> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('bad fixture id.');
  const root = path.join(HERE, id);
  if (!existsSync(root)) throw new Error(`missing D1 fixture ${id}.`);
  const files: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (name === 'SOURCE.md' || name === 'DERIVED.md') continue;
      const rel = path.relative(root, abs).split(path.sep).join('/');
      files[fixtureLogicalRel(rel)] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return files;
}

/**
 * The input20 artifacts of a stored seed, parsed as `assembleD1Input` would. Hashes are a
 * placeholder: a test that needs the real digest seeds the host instead (`seedD1Fixture`).
 */
export function loadD1Artifacts(id: string, moduleName: string): D1InputArtifacts {
  const files = loadD1Fixture(id);
  const parsed = new Map<string, unknown>();
  const contractTexts: Record<string, string> = {};
  const contracts: D1InputArtifacts['contracts'] = {};
  for (const [file, text] of Object.entries(files)) {
    parsed.set(file, parseD1Source(text, file.endsWith('.defs.ts') ? 'defs' : 'json'));
    const contract = new RegExp(`^l2/${moduleName}/web/contracts/([A-Za-z0-9_]+)\\.defs\\.ts$`).exec(file);
    if (!contract) continue;
    contractTexts[contract[1]] = text;
    contracts[contract[1]] = readContractAst(text, file);
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.startsWith('_')) continue;
    const name = file.slice(file.lastIndexOf('/') + 1).replace(/\.defs\.ts$/, '');
    if (file.includes('/journeys/') && name !== 'index') journeys[name] = value;
    if (file.includes('/ontology/') && name !== 'index') entities[name] = value;
  }
  const root = `l4/${moduleName}`;
  return {
    sources: [...parsed.keys()].sort().map(file => ({
      path: file, sha256: 'fixture', bytes: 1, schemaVersion: '', state: 'present' as const,
    })),
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`${root}/pool/l1/pipeline.json`) ?? null,
    contracts,
    contractTexts,
    presentDefs: [],
  };
}

/** Writes a stored seed into the in-memory Studio host at its logical paths. */
export function seedD1Fixture(host: TestHost, id: string, project: number): string[] {
  const seeded: string[] = [];
  for (const [file, text] of Object.entries(loadD1Fixture(id))) {
    const platform = /^_(\d+)_\/(.+)$/.exec(file);
    const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(project, file);
    if (!info) throw new Error(`fixture ${id}: ${file} has no Studio path.`);
    seed(host, info, text, `fixture-${id}`);
    seeded.push(file);
  }
  return seeded.sort();
}
