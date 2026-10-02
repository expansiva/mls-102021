/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/scenario.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import {
  applyRepair,
  canonicalJson,
  catalogForStage,
  M1_CATALOG_CONFIG_KEY,
  M1_CATALOG_EXPORT,
  M1_STUB_ERROR,
  M1_STUB_STATUS,
  parseCatalog,
  renderMonitorCatalog,
  isLegacyNodeTest,
  M1_TEST_EXPORT,
  renderScenarioTest,
  testFileFor,
  withoutRule,
  type M1ScenarioCase,
  type M1ScenarioCatalog,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  checkpointDue,
  classifyCase,
  M1_CHECKPOINT_BUDGET_MS,
  noteMonitorFailure,
  verifyBatch,
  type M1Checkpoint,
  type M1Observation,
} from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { BASE, fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(HERE, 'catalogFixture.json'), 'utf8');
const CATALOG_REF = 'memory:scenarioCatalog';
const RUN = {
  runId: 'm1-04-structure',
  commit: '69adf1f',
  startedAt: '2026-09-25T12:00:00.000Z',
  finishedAt: '2026-09-25T12:00:01.000Z',
};

/**
 * m1_41 c2: the two frozen files are generated, not hand-kept. Input is the neutral v2 module
 * (`oracleModule` BASE) through `deriveCatalog`; the checkpoint is `verifyBatch` over those bytes.
 * `M1_REFREEZE=1` rewrites both files; without it the test only compares.
 */
async function frozenFiles(): Promise<{ catalog: string; checkpoint: string }> {
  const fx = fixture(BASE);
  const units = [...fx.defs.map(([, defPath, definition]) => ({ defPath, definition })), ...fx.controllers.map(([defPath, definition]) => ({ defPath, definition }))];
  const derived = deriveCatalog(fx.n.mod, units, fx.texts);
  const catalog = `${JSON.stringify(derived.catalog, null, 2)}\n`;
  const handler = handlerFor('usecase', 'structure');
  assert.ok(handler);
  const report = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: catalog }),
    catalogRef: CATALOG_REF,
    observations: observationsFor(derived.catalog, 'structure.usecase', 'stub'),
    ...RUN,
    monitorError: null,
  });
  return { catalog, checkpoint: `${JSON.stringify(report, null, 2)}\n` };
}

void test('catalogFixture.json and checkpointFixture.json are generated from the v2 neutral module', async () => {
  const generated = await frozenFiles();
  if (process.env.M1_REFREEZE === '1') {
    writeFileSync(join(HERE, 'catalogFixture.json'), generated.catalog);
    writeFileSync(join(HERE, 'checkpointFixture.json'), generated.checkpoint);
  }
  assert.equal(readFileSync(join(HERE, 'catalogFixture.json'), 'utf8'), generated.catalog);
  assert.equal(readFileSync(join(HERE, 'checkpointFixture.json'), 'utf8'), generated.checkpoint);
  const parsed = parseCatalog(generated.catalog).catalog;
  assert.ok(parsed);
  assert.deepEqual(parseCatalog(renderMonitorCatalog(parsed, 'x')).catalog, parsed);
});

void test('fixture is the catalog both adapters read', () => {
  const parsed = parseCatalog(FIXTURE);
  assert.deepEqual(parsed.issues, []);
  const catalog = parsed.catalog;
  assert.ok(catalog);
  assert.equal(catalog.store, 'memory');
  assert.equal(M1_CATALOG_CONFIG_KEY, 'backend.scenarioCatalog');
  const again = parseCatalog(renderMonitorCatalog(catalog, '_102047_/l1/reefLog/materialization/agentMaterializeL1/scenarioCatalog.ts'));
  assert.deepEqual(again.issues, []);
  assert.deepEqual(again.catalog, catalog);
  assert.equal(renderMonitorCatalog(catalog, 'x').includes("from 'node:test'"), false);
  assert.equal(renderMonitorCatalog(catalog, 'x').includes(`export const ${M1_CATALOG_EXPORT}`), true);

  for (const scenario of catalog.scenarios) {
    assert.equal(scenario.testFile, testFileFor(scenario.productionFile));
    assert.equal(scenario.testFile.endsWith('.test.ts'), true);
    assert.equal(scenario.productionFile.endsWith('.test.ts'), false);
    const node = renderScenarioTest(scenario);
    assert.doesNotMatch(node, /from\s*['"]node:/);
    assert.doesNotMatch(node, /^\s*import\b/m);
    assert.equal(node.includes(`export const ${M1_TEST_EXPORT} = `), true);
    assert.equal(isLegacyNodeTest(node, scenario.testFile), false);
    for (const item of scenario.cases) {
      assert.equal(node.includes(item.caseId), true);
      if (item.gate === 'business') {
        assert.equal(item.expectedFailure?.errorCode, M1_STUB_ERROR);
        assert.equal(item.expectedFailure?.status, M1_STUB_STATUS);
        assert.notEqual(item.expect.errorCode, M1_STUB_ERROR);
      } else {
        assert.equal(item.expectedFailure, null);
      }
    }
    const data = JSON.parse(node.slice(node.indexOf('{'), node.lastIndexOf('}') + 1)) as { cases: M1ScenarioCase[] };
    assert.deepEqual(data.cases, scenario.cases);
  }

  const usecase = handlerFor('usecase', 'structure');
  const controller = handlerFor('httpController', 'structure');
  assert.equal(usecase?.id, 'structure.usecase');
  assert.equal(controller?.id, 'structure.httpController');
  assert.ok(catalog.scenarios.some(scenario => scenario.handlerId === usecase?.id));
  assert.ok(catalog.scenarios.some(scenario => scenario.handlerId === controller?.id));
  assert.ok(catalog.scenarios.every(scenario => scenario.handlerId === handlerFor(scenario.artifactType, 'structure')?.id), 'each scenario names the registered structure handler');
});

void test('structure checkpoint is expected-red only on business cases', async () => {
  const catalog = mustCatalog();
  const handler = handlerFor('usecase', 'structure');
  assert.ok(handler);
  const report = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: FIXTURE }),
    catalogRef: CATALOG_REF,
    observations: observationsFor(catalog, 'structure.usecase', 'stub'),
    ...RUN,
    monitorError: null,
  });
  assert.equal(report.schemaVersion, '2026-09-25-m1-checkpoint-v1');
  assert.equal(report.stage, 'structure');
  assert.equal(report.commit, '69adf1f');
  assert.equal(report.ready, false);
  assert.equal(report.accepted, true);
  const usecaseCases = catalog.scenarios.filter(scenario => scenario.handlerId === 'structure.usecase').flatMap(scenario => scenario.cases);
  assert.deepEqual(report.counts, {
    passed: usecaseCases.filter(item => item.gate !== 'business').length,
    expectedRed: usecaseCases.filter(item => item.gate === 'business').length,
    failed: 0,
    blocked: 0,
    skipped: 0,
    inconclusive: 0,
  });
  assert.equal(report.evidence.some(item => item.verdict === 'expectedRed' && item.detail.includes(M1_STUB_ERROR)), true);
  assert.equal(report.nextAction.includes('not ready'), true);
  assert.equal(report.monitor.delivered, true);
  assert.equal(report.budgetMs, M1_CHECKPOINT_BUDGET_MS);
  const frozen = JSON.parse(readFileSync(join(HERE, 'checkpointFixture.json'), 'utf8')) as M1Checkpoint;
  assert.deepEqual(report, frozen);

  const kept = noteMonitorFailure(report, 'monitor down');
  assert.deepEqual(kept.counts, report.counts);
  assert.deepEqual(kept.evidence, report.evidence);
  assert.equal(kept.monitor.delivered, false);
  assert.equal(kept.monitor.error, 'monitor down');
  assert.equal(kept.accepted, true);
});

void test('controller gates stay green and do not accept the stub', async () => {
  const catalog = mustCatalog();
  const handler = handlerFor('httpController', 'structure');
  assert.ok(handler);
  const green = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: FIXTURE }),
    catalogRef: CATALOG_REF,
    observations: observationsFor(catalog, 'structure.httpController', 'gate'),
    ...RUN,
    monitorError: null,
  });
  const controllerCases = catalog.scenarios.filter(scenario => scenario.handlerId === 'structure.httpController').flatMap(scenario => scenario.cases);
  const marked = controllerCases.filter(item => item.expectedFailure);
  assert.equal(controllerCases.length > 0, true);
  // Gate observations are the real outcome. A case still marked for the structure stub has not earned that outcome.
  assert.deepEqual(green.counts, {
    passed: controllerCases.length - marked.length, expectedRed: 0, failed: marked.length, blocked: 0, skipped: 0, inconclusive: 0,
  });
  assert.equal(green.ready, false);

  const masked = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: FIXTURE }),
    catalogRef: CATALOG_REF,
    observations: catalog.scenarios.filter(scenario => scenario.handlerId === 'structure.httpController').flatMap(scenario => scenario.cases).map(item => (
      observation(item, { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR })
    )),
    ...RUN,
    monitorError: null,
  });
  assert.equal(masked.counts.expectedRed, marked.length);
  assert.equal(masked.counts.failed, controllerCases.length - marked.length);
  assert.equal(masked.accepted, false);
});

void test('a different failure, a broken compile and an exception are not expected-red', () => {
  const item = businessCase();
  const wrong = classifyCase('structure', item, observation(item, { ok: false, status: 500, errorCode: 'INTERNAL_ERROR' }));
  assert.equal(wrong.verdict, 'failed');
  assert.match(wrong.detail, /different failure/);
  const status = classifyCase('structure', item, observation(item, { ok: false, status: 500, errorCode: M1_STUB_ERROR }));
  assert.equal(status.verdict, 'failed');
  const compiled = classifyCase('structure', item, observation(item, { broken: 'compile' }));
  assert.equal(compiled.verdict, 'failed');
  assert.match(compiled.detail, /compile broken/);
  const imported = classifyCase('structure', item, observation(item, { broken: 'import' }));
  assert.equal(imported.verdict, 'failed');
  const thrown = classifyCase('structure', item, observation(item, { thrown: true, errorCode: M1_STUB_ERROR, status: M1_STUB_STATUS }));
  assert.equal(thrown.verdict, 'failed');
  assert.match(thrown.detail, /unstructured exception/);
  const transport = classifyCase('structure', item, observation(item, { broken: 'transport', errorCode: M1_STUB_ERROR, status: M1_STUB_STATUS }));
  assert.equal(transport.verdict, 'failed');
  const blocked = classifyCase('structure', item, observation(item, { blocked: true, blockOwner: 'x1_04' }));
  assert.equal(blocked.verdict, 'blocked');
  assert.equal(blocked.detail, 'blocked: x1_04');
});

void test('skipped, inconclusive and a missing case block acceptance', async () => {
  const catalog = mustCatalog();
  const handler = handlerFor('usecase', 'structure');
  assert.ok(handler);
  const rows = observationsFor(catalog, 'structure.usecase', 'stub').map(item => (
    item.caseId === businessCase().caseId ? observation(businessCase(), { skipped: true, reason: 'not run' }) : item
  ));
  const skipped = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: FIXTURE }),
    catalogRef: CATALOG_REF,
    observations: rows,
    ...RUN,
    monitorError: null,
  });
  assert.equal(skipped.counts.skipped, 1);
  assert.equal(skipped.accepted, false);

  const missing = classifyCase('structure', businessCase(), undefined);
  assert.equal(missing.verdict, 'inconclusive');
});

void test('implement drops the tolerance and an expired mark fails the checkpoint', async () => {
  const catalog = mustCatalog();
  const structureHandler = handlerFor('usecase', 'structure');
  const implementHandler = handlerFor('usecase', 'implement');
  assert.ok(structureHandler);
  assert.equal(implementHandler?.id, 'implement.usecase');
  assert.equal(implementHandler?.needsLlm, false);
  const handler = { ...structureHandler, stage: 'implement' as const, id: 'structure.usecase' };
  const registered = handlerFor('usecase', 'implement');
  assert.equal(registered?.id, 'implement.usecase');
  const forged = await verifyBatch({
    handler,
    io: memoryIo({ [CATALOG_REF]: FIXTURE }),
    catalogRef: CATALOG_REF,
    observations: [],
    ...RUN,
    monitorError: null,
  });
  assert.equal(forged.evidence[0]?.detail, 'handler is not the registered one');
  assert.equal(forged.counts.expectedRed, 0);

  const item = businessCase();
  const expired = classifyCase('implement', item, observation(item, { ok: true, status: 200, errorCode: null }));
  assert.equal(expired.verdict, 'failed');
  assert.equal(expired.detail, 'expected mark expired');
  const stillStub = classifyCase('implement', item, observation(item, { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR }));
  assert.equal(stillStub.verdict, 'failed');
  assert.notEqual(stillStub.verdict, 'expectedRed');

  const stripped = catalogForStage(catalog, 'implement');
  const created = stripped.scenarios.flatMap(scenario => scenario.cases).find(entry => entry.caseId === businessCase().caseId);
  assert.ok(created);
  assert.equal(created.expectedFailure, null);
  assert.equal(classifyCase('implement', created, observation(created, { ok: true, status: 200, errorCode: null })).verdict, 'passed');
  assert.equal(classifyCase('implement', created, observation(created, { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR })).verdict, 'failed');
});

void test('removing the projection filter or the actor filter blinds the test, and repair refuses it', () => {
  // The derived v2 catalog declares disclosure and own-scope cases as gaps, never as executable cases;
  // the restricted cases are built here on a derived business case, with arbitrary field names.
  const base = businessCase();
  const hidden = 'hiddenNote';
  const owner = 'ownerId';
  const projection: M1ScenarioCase = { ...base, caseId: `${base.caseId}.projection`, expect: { ...base.expect, forbiddenFields: [hidden] } };
  const isolation: M1ScenarioCase = { ...base, caseId: `${base.caseId}.own`, actorId: 'actor-1', expect: { ...base.expect, isolatedActorField: owner } };
  const original = mustCatalog();
  const catalog: M1ScenarioCatalog = {
    ...original,
    scenarios: original.scenarios.map(scenario => scenario.cases.some(item => item.caseId === base.caseId)
      ? { ...scenario, cases: [...scenario.cases, projection, isolation] }
      : scenario),
  };
  const stripped = catalogForStage(catalog, 'implement');
  const openProjection = caseIn(stripped, projection.caseId);
  const leaked = observation(openProjection, { ok: true, status: 200, errorCode: null, fields: ['id', hidden] });
  assert.equal(classifyCase('implement', openProjection, leaked).detail, `forbidden field present: ${hidden}`);
  const blind = withoutRule(openProjection, hidden);
  assert.equal(classifyCase('implement', blind, leaked).verdict, 'passed');
  const refused = applyRepair(catalog, { caseId: projection.caseId, dropForbiddenFields: [hidden] });
  assert.deepEqual(refused.refused, ['forbiddenFields']);
  assert.equal(refused.catalog, catalog);

  const openIsolation = caseIn(stripped, isolation.caseId);
  const foreign = observation(openIsolation, { ok: true, status: 200, errorCode: null, rowActorIds: ['actor-1', 'actor-2'] });
  assert.equal(classifyCase('implement', openIsolation, foreign).detail, 'actor filter missed');
  const unfiltered = withoutRule(openIsolation, owner);
  assert.equal(classifyCase('implement', unfiltered, foreign).verdict, 'passed');
  const actorRepair = applyRepair(catalog, { caseId: isolation.caseId, clearActorFilter: true });
  assert.deepEqual(actorRepair.refused, ['actorFilter']);
  assert.equal(actorRepair.catalog, catalog);

  const swapped = applyRepair(catalog, {
    caseId: base.caseId,
    replaceExpectedFailure: { errorCode: 'INTERNAL_ERROR', status: 500 },
  });
  assert.deepEqual(swapped.refused, ['expectedFailure']);
  assert.equal(swapped.catalog, catalog);
});

void test('checkpoint budget, unreadable catalog and a database store', async () => {
  assert.equal(checkpointDue(M1_CHECKPOINT_BUDGET_MS - 1, false), false);
  assert.equal(checkpointDue(M1_CHECKPOINT_BUDGET_MS, false), true);
  assert.equal(checkpointDue(0, true), true);

  const handler = handlerFor('usecase', 'structure');
  assert.ok(handler);
  const missing = await verifyBatch({
    handler,
    io: memoryIo({}),
    catalogRef: CATALOG_REF,
    observations: [],
    ...RUN,
    monitorError: null,
  });
  assert.equal(missing.evidence[0]?.detail, 'catalog unreadable');
  assert.equal(missing.counts.expectedRed, 0);

  const thrown = await verifyBatch({
    handler,
    io: { async read() { throw new Error('disk'); } },
    catalogRef: CATALOG_REF,
    observations: [],
    ...RUN,
    monitorError: null,
  });
  assert.match(thrown.evidence[0]?.detail ?? '', /catalog read failed: disk/);

  const postgres = parseCatalog(FIXTURE.replace('"store": "memory"', '"store": "postgres"'));
  assert.equal(postgres.catalog, null);
  assert.equal(postgres.issues.includes('store must be memory'), true);

  const reads: string[] = [];
  const io: MaterializeReadIo = memoryIo({ [CATALOG_REF]: FIXTURE }, reads);
  await verifyBatch({
    handler,
    io,
    catalogRef: CATALOG_REF,
    observations: observationsFor(mustCatalog(), 'structure.usecase', 'stub'),
    ...RUN,
    monitorError: null,
  });
  assert.deepEqual(reads, [CATALOG_REF]);
  assert.equal('write' in io, false);
});

void test('catalog module has no node importer', () => {
  const files = readdirSync(HERE);
  for (const file of files) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
    const text = readFileSync(join(HERE, file), 'utf8').replace(/`(?:\\`|[^`])*`/gs, '""');
    assert.equal(text.includes('node:test'), false, file);
    assert.equal(text.includes('node:fs'), false, file);
  }
  const fixture = readFileSync(join(HERE, 'catalogFixture.json'), 'utf8');
  assert.equal(fixture.includes('node:test'), false);
  assert.equal(canonicalJson(mustCatalog()).includes('node:test'), false);
});

void test('m1_35: a pre-m1_35 node runner is recognised; the data test and a hand file are not', () => {
  const catalog = mustCatalog();
  const scenario = catalog.scenarios[0];
  const legacy = [
    `/// <mls fileReference="${scenario.testFile}" enhancement="_blank"/>`,
    '',
    `import assert from 'node:assert/strict';`,
    `import test from 'node:test';`,
    `import { ${M1_CATALOG_EXPORT} } from '/_102047_/l1/reefLog/materialization/agentMaterializeL1/scenarioCatalog.js';`,
    `const scenario = ${M1_CATALOG_EXPORT}.scenarios.find(item => item.scenarioId === '${scenario.scenarioId}');`,
    `void test('x', () => { assert.ok(scenario); });`,
  ].join('\n');
  assert.equal(isLegacyNodeTest(legacy, scenario.testFile), true);
  assert.equal(isLegacyNodeTest(legacy, 'other.test.ts'), false);
  assert.equal(isLegacyNodeTest(renderScenarioTest(scenario), scenario.testFile), false);
  assert.equal(isLegacyNodeTest(`import test from 'node:test';\n${M1_CATALOG_EXPORT}.scenarios.find(`, scenario.testFile), false);
});

function mustCatalog(): M1ScenarioCatalog {
  const parsed = parseCatalog(FIXTURE);
  if (!parsed.catalog) throw new Error(parsed.issues.join('; '));
  return parsed.catalog;
}

/** The first business case of a usecase scenario: it carries the structure stub mark. */
function businessCase(): M1ScenarioCase {
  const found = mustCatalog().scenarios.filter(scenario => scenario.handlerId === 'structure.usecase')
    .flatMap(scenario => scenario.cases).find(item => item.gate === 'business');
  if (!found) throw new Error('no usecase business case');
  return found;
}

function caseIn(catalog: M1ScenarioCatalog, caseId: string): M1ScenarioCase {
  const found = catalog.scenarios.flatMap(scenario => scenario.cases).find(item => item.caseId === caseId);
  if (!found) throw new Error(caseId);
  return found;
}

function observationsFor(catalog: M1ScenarioCatalog, handlerId: string, mode: 'stub' | 'gate'): M1Observation[] {
  return catalog.scenarios.filter(scenario => scenario.handlerId === handlerId).flatMap(scenario => scenario.cases).map(item => {
    if (mode === 'stub' && item.gate === 'business') {
      return observation(item, { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR });
    }
    return observation(item, {
      ok: item.expect.ok,
      status: item.expect.status,
      errorCode: item.expect.errorCode,
      ruleId: item.expect.ruleId,
      rowActorIds: item.expect.isolatedActorField ? [item.actorId] : [],
    });
  });
}

function observation(item: M1ScenarioCase, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId: item.caseId,
    durationMs: 1,
    broken: 'none',
    thrown: false,
    skipped: false,
    inconclusive: false,
    blocked: false,
    blockOwner: '',
    ok: false,
    status: 0,
    errorCode: null,
    ruleId: null,
    fields: [],
    rowActorIds: [],
    reason: '',
    ...patch,
  };
}

function memoryIo(files: Record<string, string>, reads: string[] = []): MaterializeReadIo {
  return {
    async read(ref: string): Promise<string | null> {
      reads.push(ref);
      return Object.prototype.hasOwnProperty.call(files, ref) ? files[ref] : null;
    },
  };
}
