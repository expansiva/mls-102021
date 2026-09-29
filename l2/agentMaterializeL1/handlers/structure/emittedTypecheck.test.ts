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
import { moduleSpecifier, renderMonitorCatalog, renderScenarioTest } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const FIXTURE = join(HERE, '../../../agentDefsL1/fixtures/agendaClinica-3f4f677');
const PROJECT = '102047';
const MODULE = 'agendaClinica';

void test('structure output of the clinic fixture typechecks on the official configs', async () => {
  // The frozen fixture predates d1_36: controllers60 now adds the authority map to a controller with grants.
  const texts = withAuthorityDependency(loadDefs(FIXTURE));
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
  assert.doesNotMatch(authority.reason, /NO_CONSUMER/);
  assert.equal(withheld.has(authority.defPath), false);
  const derived = deriveCatalog(MODULE, units, Object.fromEntries(texts), withheld);
  assert.equal(derived.gaps.some(gap => gap.artifactId === 'authorityMap'), false);
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
    files.set(scenario.testFile, renderScenarioTest(scenario));
    tests += 1;
  }
  assert.ok(tests > 0);
  assert.equal([...files.keys()].some(path => path.endsWith('/authorityMap.ts')), true);
  assert.equal([...files].some(([path, source]) => path.includes('/controllers/') && source.includes('actorRefFor(grantId)')), true);

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

    for (const relativePath of [...testFiles, ...production]) {
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

void test('m1_32/m1_35: the test of a unit promoted once and blocked now compiles whether the catalog keeps its scenario or not', async () => {
  const texts = withAuthorityDependency(loadDefs(FIXTURE));
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
  const bound = new Set(structureHandlerIds());
  const snapshot = await simulate({ moduleName: MODULE, units, io: diskIo(texts) });
  const sources = Object.fromEntries(texts);
  // The /structure run: outputs and tests on disk.
  const structured = deriveCatalog(MODULE, units, sources, catalogWithheld(snapshot.units, bound));
  const catalogRef = `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`;
  const structureCatalog = renderMonitorCatalog(structured.catalog, catalogRef);
  const read = async (ref: string): Promise<string | null> => ref === catalogRef ? structureCatalog : texts.get(ref) ?? null;
  const files = new Map<string, string>();
  for (const scenario of structured.catalog.scenarios) {
    const definition = definitions.get(scenario.source);
    if (!definition || definition.artifactType !== 'domainEntity') continue;
    const outcome = await runStructure(callFor(scenario.source, definition, read));
    assert.equal(outcome.failure, null, `${scenario.source} ${outcome.failure?.detail ?? ''}`);
    for (const [path, source] of Object.entries(outcome.files)) files.set(path, source);
    files.set(scenario.testFile, renderScenarioTest(scenario));
  }
  const target = structured.catalog.scenarios.find(scenario => files.has(scenario.testFile));
  assert.ok(target, 'the fixture has an entity scenario with a test');
  // The next run plans that unit blocked (STATUS_BLOCKED, as a case that did not run leaves it).
  const blocked = snapshot.units.map(unit => unit.defPath === target.source
    ? { ...unit, action: 'blocked' as const, reason: 'STATUS_BLOCKED: BLOCKED: case did not run.' }
    : unit);
  const kept = deriveCatalog(MODULE, units, sources, catalogWithheld(blocked, bound, new Set([target.source])));
  const dropped = deriveCatalog(MODULE, units, sources, catalogWithheld(blocked, bound));
  assert.equal(kept.catalog.scenarios.some(item => item.scenarioId === target.scenarioId), true);
  assert.equal(dropped.catalog.scenarios.some(item => item.scenarioId === target.scenarioId), false);

  const keptErrors = compileRuntime(files, catalogRef, renderMonitorCatalog(kept.catalog, catalogRef));
  assert.equal(keptErrors, '', keptErrors);
  const droppedErrors = compileRuntime(files, catalogRef, renderMonitorCatalog(dropped.catalog, catalogRef));
  // m1_35: the test is data and imports nothing, so a withheld scenario no longer breaks it.
  assert.equal(droppedErrors, '', droppedErrors);
});

void test('a qualified output path keeps the leading slash and a bare name is refused', () => {
  assert.equal(moduleSpecifier('_102047_/l1/agendaClinica/scope/accessScope.ts'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('/_102047_/l1/agendaClinica/scope/accessScope.js'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('./accessScope.ts'), '');
});

function withAuthorityDependency(texts: Map<string, string>): Map<string, string> {
  const authority = [...texts.keys()].find(path => path.endsWith('/authorityMap.defs.ts'));
  assert.ok(authority);
  const out = new Map<string, string>();
  for (const [path, text] of texts) {
    const isController = text.includes('"artifactType": "httpController"') && text.includes('"grantIds"');
    out.set(path, isController ? text.replace('"dependencies": [', `"dependencies": [\n    "${authority}",`) : text);
  }
  return out;
}

/** Runtime typecheck (tests and outputs) of `files` plus one catalog, in a sandbox that links the repo. */
function compileRuntime(files: ReadonlyMap<string, string>, catalogRef: string, catalogSource: string): string {
  const sandbox = mkdtempSync(join(tmpdir(), 'm1-32-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    mkdirSync(join(sandbox, 'test'));
    writeFileSync(join(sandbox, 'test/tsconfig.runtime.json'), readFileSync(join(ROOT, 'test/tsconfig.runtime.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (!/^mls-\d+$/.test(entry) || entry === `mls-${PROJECT}`) continue;
      symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    mkdirSync(join(sandbox, `mls-${PROJECT}`));
    symlinkSync(join(ROOT, `mls-${PROJECT}`, 'l2'), join(sandbox, `mls-${PROJECT}`, 'l2'));
    const include: string[] = [];
    for (const [qualified, source] of [...files, [catalogRef, catalogSource] as const]) {
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      include.push(relativePath);
    }
    return compile(sandbox, 'runtime', { extends: './test/tsconfig.runtime.json', include });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

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
      else if (entry.name.endsWith('.defs.ts') || entry.name.endsWith('.defs.txt')) {
        texts.set(`_${PROJECT}_/${fixtureLogicalRel(relative(root, full))}`, readFileSync(full, 'utf8'));
      }
    }
  };
  walk(root);
  return texts;
}
