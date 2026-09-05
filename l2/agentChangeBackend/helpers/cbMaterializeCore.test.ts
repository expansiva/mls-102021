/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { expandContextRef, CONTRACTS_102034, buildMicroRepairPrompt, isCompilerFinding, shouldTargetedRescue, compilerFindingsDegradeAfterBudget, isStale, applyHeader, ensureJsImportExtensions, isDeterministicMaterializeType } from './cbMaterializeCore.js';

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

test('compilerFindingsDegradeAfterBudget: leftover compiler findings degrade; mixed/structural still fail', () => {
  const compiler = [
    'compiler -> a.ts: TS2741 Property delete is missing',
    'compiler -> b.ts: TS2339 Property x does not exist on type never',
  ];
  assert.equal(compilerFindingsDegradeAfterBudget({ blocking: compiler, globalAttempts: 2, budget: 2 }), true);
  assert.equal(compilerFindingsDegradeAfterBudget({ blocking: compiler, globalAttempts: 3, budget: 2 }), true);
  assert.equal(compilerFindingsDegradeAfterBudget({ blocking: compiler, globalAttempts: 1, budget: 2 }), false);
  assert.equal(compilerFindingsDegradeAfterBudget({
    blocking: [...compiler, 'table without primary key -> x.defs.ts'],
    globalAttempts: 2,
    budget: 2,
  }), false);
  assert.equal(compilerFindingsDegradeAfterBudget({ blocking: [], globalAttempts: 2, budget: 2 }), false);
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

test('persistenceSeeds is compiled locally, not by the LLM materializer', () => {
  assert.equal(isDeterministicMaterializeType('persistenceSeeds'), true);
  assert.equal(isDeterministicMaterializeType('persistenceTable'), false);
  assert.deepEqual(expandContextRef('_102034_.d.ts', 'persistenceSeeds'), [PERSISTENCE]);
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

// ── freshness is existence, not a timestamp ──────────────────────────────────
// A present `.ts` is kept even if a caller still has defs/ts mtimes in hand (those stamps are
// diagnostic only). An absent `.ts` is generated. No comparison of carimbos in either case.
test('isStale: .ts absent generates; .ts present is skipped — timestamps are not consulted', () => {
  assert.equal(isStale(false), true);
  assert.equal(isStale(true), false);
});

// T12: two files of the buildFlowFsm run were saved with `enhancement="blank"` — the model retyped the
// header during a repair round and the writer trusted anything starting with `///`.
test('applyHeader rebuilds the platform header instead of trusting the model output', () => {
  const outputPath = '_102046_/l1/buildFlowFsm/layer_2_application/usecases/updateChangeOrder.ts';
  const expected = `/// <mls fileReference="${outputPath}" enhancement="_blank"/>`;

  // The real defect: `blank` instead of `_blank`.
  assert.equal(
    applyHeader(outputPath, '/// <mls fileReference="_102046_/l1/buildFlowFsm/layer_2_application/usecases/updateChangeOrder.ts" enhancement="blank"/>\n\nexport const x = 1;\n'),
    `${expected}\n\nexport const x = 1;\n`,
  );
  // The path is just as forgeable — a header pointing at another file is rewritten too.
  assert.equal(
    applyHeader(outputPath, '/// <mls fileReference="_102046_/l1/other/place.ts" enhancement="_blank"/>\nexport const x = 1;\n'),
    `${expected}\n\nexport const x = 1;\n`,
  );
  // No header at all: one is prepended, as before.
  assert.equal(applyHeader(outputPath, 'export const x = 1;\n'), `${expected}\n\nexport const x = 1;\n`);
  // A leading comment that is NOT an mls header is content, and keeps its place after the header.
  assert.equal(
    applyHeader(outputPath, '/// reference to something else\nexport const x = 1;\n'),
    `${expected}\n\n/// reference to something else\nexport const x = 1;\n`,
  );
});

test('ensureJsImportExtensions adds .js to path specifiers and leaves the rest', () => {
  const src = [
    "import { ok } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
    "import { listAtendente, type ListAtendenteInput } from '/_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente';",
    "import type { Comentario } from '/_102039_/l1/controleChamados/layer_3_domain/entities/comentario';",
    "export { routes } from '/_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoHub.js';",
    "const lazy = await import('/_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente');",
    "import { readFile } from 'node:fs';",
  ].join('\n');
  const out = ensureJsImportExtensions(src);
  assert.match(out, /usecases\/listAtendente\.js'/);
  assert.match(out, /entities\/comentario\.js'/);
  assert.match(out, /usecases\/getAtendente\.js'/);
  assert.match(out, /contracts\.js'/);
  assert.match(out, /chamadoHub\.js'/);
  assert.doesNotMatch(out, /contracts\.js\.js/);
  assert.match(out, /from 'node:fs'/);
});
