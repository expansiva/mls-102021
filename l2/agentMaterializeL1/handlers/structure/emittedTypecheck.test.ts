/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/emittedTypecheck.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, readDefinition, receiptFolder, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { simulate, type SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { runStructure, structureHandlerIds } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import { catalogWithheld, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { moduleSpecifier, renderMonitorCatalog, renderNodeTest } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { emittedValueExports } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const FIXTURE = join(HERE, '../../../agentDefsL1/fixtures/agendaClinica-3f4f677');
const PROJECT = '102047';
const MODULE = 'agendaClinica';

void test('structure output of the clinic fixture typechecks on the official configs', async () => {
  const texts = loadDefs(FIXTURE);
  assert.ok(texts.has(`_${PROJECT}_/l2/${MODULE}/web/contracts/agenda.defs.ts`));
  const units: PlanUnitInput[] = [];
  const definitions = new Map<string, M1Definition>();
  for (const [defPath, text] of texts) {
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.moduleName !== MODULE) continue;
    units.push({ defPath, definition });
    definitions.set(defPath, definition);
  }
  const snapshot = await simulate({ moduleName: MODULE, units, io: diskIo(texts) });
  const withheld = catalogWithheld(snapshot.units, new Set(structureHandlerIds()));
  const authority = snapshot.units.find(unit => unit.artifactType === 'authorityMap');
  assert.ok(authority);
  assert.match(authority.reason, /^NO_CONSUMER:/);
  assert.equal(withheld.get(authority.defPath), authority.reason);
  const derived = deriveCatalog(MODULE, units, Object.fromEntries(texts), withheld);
  assert.equal(derived.catalog.scenarios.some(item => item.artifactId === 'authorityMap'), false);
  assert.equal(derived.gaps.some(gap => gap.artifactId === 'authorityMap' && gap.reason.startsWith('NO_CONSUMER:')), true);
  const catalogRef = `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`;
  const catalogSource = renderMonitorCatalog(derived.catalog, catalogRef);
  const read = async (ref: string): Promise<string | null> => ref === catalogRef ? catalogSource : texts.get(ref) ?? null;
  const files = new Map<string, string>();
  for (const unit of units) {
    if (withheld.has(unit.defPath)) continue;
    const definition = definitions.get(unit.defPath);
    const handler = handlerFor(definition.artifactType, 'structure');
    if (!definition || !handler || !handler.id.startsWith('structure.')) continue;
    const outcome = await runStructure(callFor(unit.defPath, definition, read));
    assert.equal(outcome.failure, null, `${unit.defPath} ${outcome.failure?.detail ?? ''}`);
    for (const [path, source] of Object.entries(outcome.files)) files.set(path, source);
  }
  files.set(catalogRef, catalogSource);
  let tests = 0;
  for (const scenario of derived.catalog.scenarios) {
    if (!files.has(scenario.productionFile)) continue;
    const definition = definitions.get(scenario.source);
    const values = definition ? emittedValueExports(definition) : [];
    files.set(scenario.testFile, renderNodeTest(scenario, catalogRef, values));
    tests += 1;
  }
  assert.ok(tests > 0);
  assert.equal([...files.keys()].some(path => path.endsWith('/authorityMap.test.ts')), false);

  const sandbox = mkdtempSync(join(tmpdir(), 'm1-15-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    writeFileSync(join(sandbox, 'tsconfig.backend.json'), readFileSync(join(ROOT, 'tsconfig.backend.json')));
    mkdirSync(join(sandbox, 'test'));
    writeFileSync(join(sandbox, 'test/tsconfig.runtime.json'), readFileSync(join(ROOT, 'test/tsconfig.runtime.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (!/^mls-\d+$/.test(entry) || entry === `mls-${PROJECT}`) continue;
      symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    mkdirSync(join(sandbox, `mls-${PROJECT}`));
    symlinkSync(join(ROOT, `mls-${PROJECT}`, 'l2'), join(sandbox, `mls-${PROJECT}`, 'l2'));
    const production: string[] = [];
    const testFiles: string[] = [];
    for (const [qualified, source] of files) {
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      if (relativePath.endsWith('.test.ts')) testFiles.push(relativePath);
      else production.push(relativePath);
    }
    const backend = compile(sandbox, 'backend', {
      extends: './tsconfig.backend.json',
      include: production,
      exclude: ['**/*.test.ts'],
    });
    assert.equal(backend, '', backend);
    const runtime = compile(sandbox, 'runtime', {
      extends: './test/tsconfig.runtime.json',
      include: [...testFiles, ...production],
    });
    assert.equal(runtime, '', runtime);

    for (const relativePath of testFiles) {
      const full = join(sandbox, relativePath);
      writeFileSync(full, readFileSync(full, 'utf8').replaceAll("from '/_", "from '_"));
    }
    const stripped = compile(sandbox, 'stripped', {
      extends: './test/tsconfig.runtime.json',
      include: [...testFiles, ...production],
    });
    assert.match(stripped, /TS2307/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

void test('a qualified output path keeps the leading slash and a bare name is refused', () => {
  assert.equal(moduleSpecifier('_102047_/l1/agendaClinica/scope/accessScope.ts'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('/_102047_/l1/agendaClinica/scope/accessScope.js'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('./accessScope.ts'), '');
});

function compile(root: string, name: string, config: { extends: string; include: string[]; exclude?: string[] }): string {
  const configPath = join(root, `.tsconfig.m1-15-${name}.json`);
  writeFileSync(configPath, `${JSON.stringify({ ...config, compilerOptions: { noEmit: true } }, null, 2)}\n`);
  const tsc = join(root, 'node_modules/typescript/bin/tsc');
  const result = spawnSync(process.execPath, [tsc, '-p', configPath, '--pretty', 'false'], { cwd: root, encoding: 'utf8' });
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('error TS')).join('\n');
}

function callFor(defPath: string, definition: M1Definition, read: HandlerCall['read']): HandlerCall {
  const handler = handlerFor(definition.artifactType, 'structure');
  if (!handler) throw new Error(definition.artifactType);
  const unit: SimulatedUnit = {
    defPath,
    artifactType: definition.artifactType,
    artifactId: definition.artifactId,
    action: 'generate',
    reason: '',
    handlerId: handler.id,
    needsLlm: false,
    unresolved: [],
    contextRefs: [],
    blockedBy: [],
    prompt: '',
  };
  return {
    handler,
    unit,
    definition,
    read,
    catalogRef: `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`,
    repair: false,
    signal: new AbortController().signal,
    eventId: defPath,
    profile: decideProfile('development', true),
    modelText: null,
  };
}

function diskIo(defs: ReadonlyMap<string, string>): MaterializeReadIo {
  return {
    async read(ref: string): Promise<string | null> {
      const own = defs.get(ref);
      if (own !== undefined) return own;
      const match = /^_(\d+)_\/(.+)$/.exec(ref);
      if (!match) return null;
      const disk = join(ROOT, `mls-${match[1]}`, match[2]);
      if (!existsSync(disk) || !statSync(disk).isFile()) return null;
      return readFileSync(disk, 'utf8');
    },
  };
}

function loadDefs(root: string): Map<string, string> {
  const texts = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.defs.ts')) {
        texts.set(`_${PROJECT}_/${relative(root, full)}`, readFileSync(full, 'utf8'));
      }
    }
  };
  walk(root);
  return texts;
}
