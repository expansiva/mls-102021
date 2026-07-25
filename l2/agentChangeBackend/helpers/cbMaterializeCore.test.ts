/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { expandContextRef, CONTRACTS_102034, buildMicroRepairPrompt, isCompilerFinding, shouldTargetedRescue } from './cbMaterializeCore.js';

test('shouldTargetedRescue (T6): fires once for a small compiler-only residual at exactly the spent budget', () => {
  const base = { budget: 2, maxTargets: 4 };
  const compiler = ['compiler -> a.ts: TS2322', 'compiler -> b.ts: TS2367'];
  // budget exactly spent (globalAttempts === budget), 2 compiler-only targets -> rescue.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 2, targetCount: 2, findings: compiler }), true);
  // one-shot: after the rescue bumped globalAttempts to 3, the gate is false.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 3, targetCount: 2, findings: compiler }), false);
  // budget not yet spent -> the normal global round handles it, not the rescue.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 1, targetCount: 2, findings: compiler }), false);
  // too many residual components -> genuine failure, not a last-mile fix.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 2, targetCount: 5, findings: compiler }), false);
  // a non-compiler finding present -> not micro-repairable; no rescue.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 2, targetCount: 2, findings: [...compiler, "usecase X: unknown port 'Y'"] }), false);
  // nothing pending -> no rescue.
  assert.equal(shouldTargetedRescue({ ...base, globalAttempts: 2, targetCount: 0, findings: [] }), false);
});

test('isCompilerFinding (T4): matches both per-file (compiler:) and whole-project (compiler ->) findings', () => {
  assert.equal(isCompilerFinding('compiler: TS2322 ...'), true);
  assert.equal(isCompilerFinding('compiler -> mod/x.ts: TS2367 ...'), true);
  assert.equal(isCompilerFinding("usecase Order: unknown port 'X'"), false); // structural finding
  assert.equal(isCompilerFinding('rulesApplied \'r\' not present in generated .ts'), false);
});

test('buildMicroRepairPrompt (T4): surgical prompt carries code+errors+pitfalls, NOT the full skills/contracts', () => {
  const code = 'export function createStockAdjustment() {\n  const a = { updatedAt: now };\n}\n';
  const { system, human } = buildMicroRepairPrompt({
    outputPath: '_102051_/l1/cafeFlow/layer_2_application/usecases/createStockAdjustment.ts',
    code,
    findings: ['compiler: TS2353 updatedAt does not exist in type StockAdjustment'],
    contextSections: ['### entity.d.ts\n```ts\ninterface StockAdjustment { createdAt: string; }\n```'],
    pitfalls: '- append-only EVENT entities have NO updatedAt',
  });
  // System = surgical instruction + the tool + the pitfalls skill; NOT architecture.md/layer skill/contracts.
  assert.match(system, /FIXING COMPILER ERRORS/);
  assert.match(system, /SMALLEST change/);
  assert.match(system, /submitGeneratedTs/);
  assert.match(system, /append-only EVENT entities have NO updatedAt/);
  assert.doesNotMatch(system, /Layers and dependency direction/); // no architecture.md
  // Human = the errors + the current code + the dependsFiles context.
  assert.match(human, /TS2353 updatedAt/);
  assert.match(human, /const a = \{ updatedAt: now \}/);
  assert.match(human, /interface StockAdjustment/);
  // The whole thing is far smaller than the full prompt (no 37.6KB contracts bundle).
  assert.ok((system.length + human.length) < 4000, 'micro prompt stays small');
});

test('buildMicroRepairPrompt (T4): omits the context section when there are no dependsFiles', () => {
  const { human } = buildMicroRepairPrompt({ outputPath: 'x.ts', code: 'const a=1;', findings: ['compiler: TS1005'], contextSections: [], pitfalls: null });
  assert.doesNotMatch(human, /Types it depends on/);
});

const MDM_FACADE = '_102034_/l1/mdm/layer_3_usecases/mdmFacade.ts';
const CONTRACTS = '_102034_/l1/server/layer_2_controllers/contracts.ts';
const PERSISTENCE = '_102034_/l1/server/layer_1_external/persistence/contracts.ts';

test('expandContextRef: non-alias refs pass through unchanged (dependsFiles .d.ts)', () => {
  assert.deepEqual(expandContextRef('_102051_/l1/cafeFlow/layer_3_domain/entities/order.d.ts', 'repositoryPort'), ['_102051_/l1/cafeFlow/layer_3_domain/entities/order.d.ts']);
});

test('expandContextRef (T5): domain entity and repository port carry NO platform contracts', () => {
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'domainEntity'), []);
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'repositoryPort'), []);
});

test('expandContextRef (T5): mdmFacade (21KB) is included ONLY for a usecase that references MDM', () => {
  const withMdm = expandContextRef('_102034_.d.ts', 'applicationUsecase', true);
  const withoutMdm = expandContextRef('_102034_.d.ts', 'applicationUsecase', false);
  assert.ok(withMdm.includes(MDM_FACADE), 'usecase with mdmRefs gets the facade');
  assert.ok(!withoutMdm.includes(MDM_FACADE), 'usecase without mdmRefs must NOT get the 21KB facade');
  assert.ok(withoutMdm.includes(CONTRACTS), 'usecase always gets RequestContext/AppError');
});

test('expandContextRef (T5): persistence table gets only TableDefinition; adapter never gets mdmFacade', () => {
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'persistenceTable'), [PERSISTENCE]);
  const adapter = expandContextRef('_102034_.d.ts', 'repositoryAdapter');
  assert.ok(adapter.includes(CONTRACTS) && adapter.includes(PERSISTENCE), 'adapter keeps contracts + persistence');
  assert.ok(!adapter.includes(MDM_FACADE), 'adapter must not carry the 21KB facade');
});

test('expandContextRef (T5): an UNKNOWN artifact type falls back to the full bundle (never starved)', () => {
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'somethingNew'), [...CONTRACTS_102034]);
  assert.deepEqual(expandContextRef('_102034_.d.ts'), [...CONTRACTS_102034]); // no type given -> full bundle
});
