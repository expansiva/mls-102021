/// <mls fileReference="_102021_/l2/agentMaterializeL1/agentMaterializeL1.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildM12PlannedSteps, parseM12MessageInvocation, parseM12StepInvocation } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { defOfRef, fileRef, infoOfRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadModuleUnits, orderWithinLayer, registersModule, requestModules, selectUnits, selectedLayers, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { emitDomain, membersOfType, namedMemberType, ontologyCollections, unopenedNamedMembers } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { derivedReadProblems, inputMembers, listFilterProblems, parentRuleProblems, repositoryProblems, transitionTargetProblems, undeclaredInputProblems, usesNodeBuiltin, testsGate, usecaseGate, usecaseParameterCount, versionProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { createContext, layerUnits, materializeUnit, recipeDraft, rulesNotEmitted, rulesToEnforce, unitInputHash, unitNeedsLlm, writeAndProve } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { missingImports, readNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { USECASE_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import { citedEntities, mdmContextSection, ontologyNames, ruleNames, transitionTarget, usesMdm } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { REQUEST_SPEC } from '/_102021_/l2/agentMaterializeL1/steps/requests50/agentM12RequestService.js';
import { delegatedRuleProblems, normalizeRequestsTyping, requestGate, requestsTypeOf, untypedInputProblems } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';
import { buildM12PlannedSteps as planSteps, runArgsJson, type M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { createAgent as domainAgent } from '/_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.js';
import { createAgent as persistenceAgent } from '/_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.js';
import { createAgent as controllersAgent } from '/_102021_/l2/agentMaterializeL1/steps/controllers30/agentM12Controllers.js';
import { createAgent as usecasesAgent } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readOptional, readUnitStatus, writeText, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { compileM12Files, diagnosticLocation, isUnavailable, markWorkerDown, withCompileTimeout, type M12Compiler } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import { contractRoutes } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import { exportSignatures, ruleTexts } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { normalizeTestCases, orderCases, renderPageTests } from '/_102021_/l2/agentMaterializeL1/steps/tests60/render.js';
import { buildM12Report } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PROJECT = 102047;
const MODULE = 'comandaRestaurante';
const HAS_BENCH = existsSync(path.join(ROOT, `mls-${PROJECT}`, 'l1', MODULE));

// ---- an in-memory Studio stor over the real files ----

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  updatedAt: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function extOf(name: string): string {
  for (const ext of ['.defs.ts', '.test.ts', '.d.ts']) if (name.endsWith(ext)) return ext;
  const at = name.lastIndexOf('.');
  return at < 0 ? '' : name.slice(at);
}

function fakeFile(info: M12FileInfo, content: string, status = 'changed'): FakeFile {
  const file: FakeFile = {
    ...info, status, content, updatedAt: 'seed',
    getContent: async () => file.content,
    getValueInfo: async () => ({ content: file.content }),
  };
  return file;
}

/** Files under `mls-<project>/l<level>/<start>`, seeded with their stor identity. */
function seedTree(files: Record<string, FakeFile>, project: number, level: number, start: string, only?: (name: string) => boolean): void {
  const base = path.join(ROOT, `mls-${project}`, `l${level}`);
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) { walk(abs); continue; }
      if (only && !only(name)) continue;
      const extension = extOf(name);
      const info = { project, level, folder: path.relative(base, dir).split(path.sep).join('/'), shortName: name.slice(0, name.length - extension.length), extension };
      files[keyOf(info)] = fakeFile(info, readFileSync(abs, 'utf8'));
    }
  };
  walk(path.join(base, start));
}

function installStor(): Record<string, FakeFile> {
  const files: Record<string, FakeFile> = {};
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      // As the Studio: an existing entry is updated in place, a new one is created.
      addOrUpdateFile: async (params: M12FileInfo) => {
        const key = keyOf(params);
        const file = files[key] ?? fakeFile(params, '', 'new');
        files[key] = file;
        return file;
      },
      localStor: {
        setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; },
        deleteFile: async (file: FakeFile) => { file.status = 'deleted'; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  return files;
}

/** A compiler that checks the bytes like the Studio path does and reports no diagnostic. */
const BYTES_COMPILER: M12Compiler = {
  available: () => true,
  enter: () => undefined,
  leave: () => undefined,
  read: async info => {
    const file = (mls.stor.files as unknown as Record<string, FakeFile>)[keyOf(info)];
    return file && file.status !== 'deleted' ? await file.getContent() : null;
  },
  model: async info => {
    const file = (mls.stor.files as unknown as Record<string, FakeFile>)[keyOf(info)];
    if (!file) return null;
    const text = await file.getContent();
    return { model: { getValue: () => text } };
  },
  preload: async () => [],
  compile: async () => ({ errors: [] }),
};

// ---- invocation, refs, selection ----

void test('the invocation takes scope, target and force as the L22 does', () => {
  assert.deepEqual(parseM12MessageInvocation('@@agentMaterializeL1 {"scope":"comandaRestaurante"}', PROJECT), { kind: 'run', project: PROJECT, scope: 'comandaRestaurante', target: '', force: false });
  const target = parseM12MessageInvocation('@@agentMaterializeL1 {"target":"_102047_/l1/comandaRestaurante/layer_2_application/usecases/createMesa.defs.ts"}', PROJECT);
  assert.equal(target.kind, 'run');
  assert.equal(target.kind === 'run' && target.force, true, 'a target regenerates regardless of reuse');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1', PROJECT).kind, 'run');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 /help', PROJECT).kind, 'help');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 {"scope":"a","target":"b"}', PROJECT).kind, 'refusal');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 {"module":"x"}', PROJECT).kind, 'refusal');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 comandaRestaurante', PROJECT).kind, 'refusal');
  assert.equal(parseM12StepInvocation(JSON.stringify({ project: 1, module: 'x', scope: '', target: '', force: false }), PROJECT).kind, 'refusal');
});

void test('refs read in every form the emitters pass', () => {
  assert.deepEqual(infoOfRef('_102047_/l1/m/layer_3_domain/entities/mesa.defs.ts', 1), { project: 102047, level: 1, folder: 'm/layer_3_domain/entities', shortName: 'mesa', extension: '.defs.ts' });
  assert.deepEqual(infoOfRef('/_102034_/l1/server/layer_2_controllers/contracts.js', 1), { project: 102034, level: 1, folder: 'server/layer_2_controllers', shortName: 'contracts', extension: '.ts' });
  assert.deepEqual(infoOfRef('/_102047_/l2/m/web/contracts/a.defs.js', 1), { project: 102047, level: 2, folder: 'm/web/contracts', shortName: 'a', extension: '.defs.ts' });
  assert.deepEqual(infoOfRef('l2/m/web/contracts/a.defs.ts', 102047), { project: 102047, level: 2, folder: 'm/web/contracts', shortName: 'a', extension: '.defs.ts' });
  assert.equal(infoOfRef('_102047_/l1/../x.ts', 1), null);
  assert.equal(fileRef(defOfRef('_102047_/l1/m/x/createMesa.ts', 102047)!), '_102047_/l1/m/x/createMesa.defs.ts');
});

void test('the plan chains the phases and registers only a whole-module run', () => {
  const steps = buildM12PlannedSteps(PROJECT, { scope: MODULE, target: '', force: false }, [{ module: MODULE, layers: ['domain', 'usecases', 'controllers', 'tests'], register: true }]);
  assert.deepEqual(steps.map(step => step.planning?.planId), ['domain10-m', 'usecases40-m', 'controllers30-m', 'tests60-m', 'register70-m', 'finalize80-m'].map(id => id.replace('-m', `-${MODULE}`)));
  assert.deepEqual(steps[2].planning?.dependsOn, [`usecases40-${MODULE}`], 'a controller compiles after what it imports');
  assert.equal(registersModule({ scope: MODULE, target: '', force: false }, MODULE), true);
  assert.equal(registersModule({ scope: `${MODULE}/layer_2_application`, target: '', force: false }, MODULE), false);
  assert.equal(registersModule({ scope: '', target: 'x', force: true }, MODULE), false);
});

// ---- gates ----

void test('the usecase gate names every problem a repair can act on', () => {
  const header = '/// <mls fileReference="_102047_/l1/m/u/fecharComanda.ts" enhancement="_blank"/>';
  const good = [header, "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';", "export async function fecharComanda(input: unknown, ctx: unknown) { throw new AppError('X', 'y', 400, { ruleId: 'pagamentoObrigatorioNoFechamento' }); }"].join('\n');
  assert.deepEqual(usecaseGate(good, { header, functionName: 'fecharComanda', project: 102047, moduleName: 'm', ruleIds: ['pagamentoObrigatorioNoFechamento'] }), []);
  const bad = ['// no header', "import x from 'lodash';", "import { y } from '/_102099_/l1/other/y.js';", 'export function fecharComanda() { try { } catch { } }'].join('\n');
  const problems = usecaseGate(bad, { header, functionName: 'fecharComanda', project: 102047, moduleName: 'm', ruleIds: ['descontoNaoExcedeSubtotal'] });
  assert.ok(problems.some(item => item.startsWith('The first line')));
  assert.ok(problems.some(item => item.includes('async function fecharComanda')));
  assert.ok(problems.some(item => item.includes('"lodash"')));
  assert.ok(problems.some(item => item.includes('/_102099_/')));
  assert.ok(problems.some(item => item.includes('empty catch')));
  assert.ok(problems.some(item => item.includes('descontoNaoExcedeSubtotal')));
});

void test('the tests gate refuses an unknown route, a wrong mutating flag and a marker without its field ref', () => {
  const routes = [{ route: 'm.p.load', kind: 'qry' as const, inputFields: ['id'] }, { route: 'm.p.save', kind: 'cmd' as const, inputFields: ['name'] }];
  const ok = normalizeTestCases([
    { id: 'm.p.load.ok', routine: 'm.p.load', params: { id: '<seedRef>' }, paramFieldRefs: { id: 'Mesa.id' }, expect: { ok: true }, mutating: false },
    { id: 'm.p.save.ok', routine: 'm.p.save', params: { name: 'A' }, expect: { ok: true }, mutating: true },
    { id: 'm.p.save.name.required', routine: 'm.p.save', params: {}, expect: { ok: false, errorCode: 'VALIDATION_ERROR' }, mutating: true },
  ]);
  assert.deepEqual(testsGate(ok, { routes, entities: ['Mesa'] }), []);
  const bad = normalizeTestCases([
    { id: 'x', routine: 'm.p.nope', params: {}, expect: { ok: true }, mutating: false },
    { id: 'y', routine: 'm.p.save', params: { id: '<seedRef>' }, expect: { ok: true }, mutating: false },
    { id: 'm.p.save.code.required', routine: 'm.p.save', params: {}, expect: { ok: false }, mutating: true },
  ]);
  const problems = testsGate(bad, { routes, entities: ['Mesa'] });
  assert.ok(problems.some(item => item.includes('m.p.nope')));
  assert.ok(problems.some(item => item.includes('mutating must be true')));
  assert.ok(problems.some(item => item.includes('paramFieldRefs.id')));
  assert.ok(problems.some(item => item.includes('"code"') || item.includes('code is not one')));
  assert.ok(problems.some(item => item.includes('m.p.load has no positive case')));
});

void test('read cases are rendered first and the file is data only', () => {
  const cases = normalizeTestCases([
    { id: 'c', routine: 'm.p.save', params: {}, expect: { ok: true }, mutating: true },
    { id: 'r', routine: 'm.p.load', params: {}, expect: { ok: true }, mutating: false },
  ]);
  assert.deepEqual(orderCases(cases).map(item => item.id), ['r', 'c']);
  const file = { project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/http/controllers`, shortName: 'mesas', extension: '.test.ts' };
  const text = renderPageTests({ file, moduleName: MODULE, pageId: 'mesas', actor: 'caixa', cases });
  assert.ok(text.startsWith(`/// <mls fileReference="${fileRef(file)}"`));
  assert.ok(text.includes('export const pageTests = '));
  assert.ok(!/\bimport\b/u.test(text));
});

void test('rule ids are read from the def and searched as literals in the source', () => {
  const definition = { data: { rulePlan: [
    { ruleId: 'a', enforcement: 'local', origin: 'l4/x/rules.defs.ts#a' },
    { ruleId: '', enforcement: 'local', origin: 'l4/x/ontology/E.defs.ts#uniqueKeys' },
    { ruleId: 'b', enforcement: 'pending', gap: 'RULE_UNBOUND' },
    { ruleId: 'c', enforcement: 'pending', gap: 'APPLICABILITY_UNDECLARED' },
  ] } } as never;
  assert.deepEqual(rulesToEnforce(definition), ['a', 'b']);
  assert.deepEqual(rulesNotEmitted(definition, 'throw x({ ruleId: "a" })'), ['b']);
  assert.deepEqual(rulesNotEmitted(definition, "throw x({ ruleId: 'a' }); throw y({ ruleId: 'b' })"), [], 'single quotes, as the prompt asks, count');
  assert.deepEqual(ruleTexts('"rules": { "a": "Texto \\"A\\"." }', ['a', 'z']), [{ ruleId: 'a', text: 'Texto "A".' }, { ruleId: 'z', text: '(text not found in rules.defs.ts)' }]);
  assert.match(exportSignatures('export interface X {\n  a: string;\n}\nconst y = 1;\nexport function f(a: string): number {\n  return 1;\n}'), /export interface X \{\n  a: string;\n\}\nexport function f\(a: string\): number \{ … \}/u);
});

void test('the report keeps every unit that is not generated, with its code', () => {
  const status = (unitId: string, state: M12UnitStatus['status'], code = ''): M12UnitStatus => ({ schemaVersion: '2026-10-05-m12-unit-v1', layer: 'usecases', unitId, defRef: '', status: state, code, attempt: 1, diagnostic: code, inputHash: '', outputs: {}, updatedAt: '' });
  const report = buildM12Report(PROJECT, MODULE, [status('a', 'done'), status('b', 'blocked', 'RULE_NOT_EMITTED'), status('c', 'gap', 'MECHANISM_UNBOUND')], [], [], null);
  assert.equal(report.status, 'partial');
  assert.deepEqual(report.open.map(item => `${item.unitId}:${item.code}`), ['b:RULE_NOT_EMITTED', 'c:MECHANISM_UNBOUND']);
  assert.equal(buildM12Report(PROJECT, MODULE, [status('a', 'done'), status('c', 'gap', 'MECHANISM_UNBOUND')], [], [], null).status, 'complete');
});

void test('a worker call that never answers fails by name instead of hanging the phase', async () => {
  const never = new Promise<never>(() => undefined);
  await assert.rejects(withCompileTimeout('_102047_/l1/m/x.ts', never, 20), /M12_COMPILER_TIMEOUT: .*_102047_\/l1\/m\/x\.ts/u);
  assert.equal(await withCompileTimeout('x', Promise.resolve(7), 20), 7);
});

void test('a write stays in memory; once the worker is down the l1 compile is reported unavailable without touching the editor', async () => {
  const files = installStor();
  const calls: string[] = [];
  const stor = (mls as unknown as { stor: { localStor: Record<string, unknown> } }).stor;
  stor.localStor.setContent = async () => { calls.push('setContent'); return true; };
  (mls as unknown as Record<string, unknown>).editor = new Proxy({}, { get: (_target, name) => { calls.push(`editor.${String(name)}`); return () => undefined; } });
  (mls as unknown as Record<string, unknown>).l2 = { typescript: new Proxy({}, { get: (_target, name) => { calls.push(`typescript.${String(name)}`); return () => undefined; } }) };
  const info = { project: PROJECT, level: 1, folder: `${MODULE}/x`, shortName: 'unit', extension: '.ts' };
  await writeText(info, 'export const a = 1;\n');
  assert.equal(await readOptional(info), 'export const a = 1;\n');
  assert.equal(files[keyOf(info)].status, 'new');
  assert.deepEqual(calls, [], 'a write registers the file and keeps the bytes in memory: no setContent, no editor model');
  markWorkerDown('M12_COMPILER_TIMEOUT: test');
  const results = await compileM12Files([{ info, expected: 'export const a = 1;\n' }]);
  assert.ok(isUnavailable(results[0].errors[0]) && results[0].errors[0].includes('M12_COMPILER_TIMEOUT: test'), results[0].errors[0]);
  assert.deepEqual(calls, [], 'with the worker down, the Studio editor and worker are not asked again');
  markWorkerDown('');
});

void test('the request gate holds the contract routes, the atomic command and the route rules', () => {
  const routes = [
    { route: 'm.p.load', kind: 'qry' as const, inputFields: [], actors: ['a'], rules: ['subtotalCalc'] },
    { route: 'm.p.close', kind: 'cmd' as const, inputFields: ['id'], actors: ['a'], rules: ['payRequired'] },
  ];
  const header = '/// <mls fileReference="_102047_/l1/m/layer_2_application/requests/p.ts" enhancement="_blank"/>';
  const good = [header, "import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';", 'export const requests = {',
    "  'm.p.load': async function (input, ctx) { /* subtotalCalc */ return {}; },",
    "  'm.p.close': async function (input, ctx) { return ctx.data.moduleData.runInTransaction(async () => { throw new AppError('X', 'y', 400, { ruleId: 'payRequired' }); }); },",
    '};'].join('\n');
  assert.deepEqual(requestGate(good, { header, routes, project: 102047, moduleName: 'm', pageId: 'p', waived: new Set() }), []);
  const bad = [header, 'export const requests = {', "  'm.p.load': async function () { return {}; },", "  'm.p.extra': async function () { return {}; },", '};'].join('\n');
  const problems = requestGate(bad, { header, routes, project: 102047, moduleName: 'm', pageId: 'p', waived: new Set(['subtotalCalc']) });
  assert.ok(problems.some(item => item.includes('m.p.close of the contract has no function')));
  assert.ok(problems.some(item => item.includes('runInTransaction')));
  assert.ok(problems.some(item => item.includes('m.p.extra, which is not a route')));
  assert.ok(!problems.some(item => item.includes('subtotalCalc')), 'a rule declared not applicable is not required');
  const prescribed = good.replace('export const requests = {', 'export const requests: Record<string, (input: Record<string, unknown>, ctx: RequestContext) => Promise<Record<string, unknown>>> = {');
  assert.ok(requestGate(prescribed, { header, routes, project: 102047, moduleName: 'm', pageId: 'p', waived: new Set() }).some(item => item.includes('Do not type a parameter `input: Record')), 'an input typed Record<…unknown> hides the contract input');
  // With the page interface known, only the contract-mapped type passes, and escape casts are refused.
  const withIface = { header, contractsInterface: 'PContracts', routes, project: 102047, moduleName: 'm', pageId: 'p', waived: new Set<string>() };
  assert.ok(requestGate(prescribed, withIface).some(item => item.includes('must be typed')), 'a Record<…unknown> type hides the output shape');
  const mappedGood = good.replace('export const requests = {', `export const requests: ${requestsTypeOf('PContracts')} = {`);
  assert.deepEqual(requestGate(mappedGood, withIface), []);
  assert.ok(requestGate(mappedGood.replace('return {};', 'return {} as unknown as never;'), withIface).some(item => item.includes('as unknown as')));
  // A rule outside the unit (the model saw every rule of the module) is dropped, not refused; a listed one needs a reason.
  assert.deepEqual(readNotApplicable([{ ruleId: 'x', reason: 'long enough reason' }, { ruleId: 'y', reason: 'another operation' }], ['x']), { items: [{ ruleId: 'x', reason: 'long enough reason' }], problems: [] });
  assert.deepEqual(readNotApplicable([{ ruleId: 'x', reason: '' }], ['x']).problems, ['notApplicable x needs a reason.']);
});

void test('every prompt declares a model type the Collab LLM proxy knows (no default "cost" alias)', () => {
  const steps = path.join(HERE, 'steps');
  const prompts = readdirSync(steps).map(step => path.join(steps, step, 'prompt.md')).filter(file => existsSync(file));
  assert.equal(prompts.length, 3, 'usecases40, requests50 and tests60 call the model');
  for (const file of prompts) {
    const second = readFileSync(file, 'utf8').split('\n')[1] ?? '';
    assert.match(second, /^<!-- modelType: (code|design|reasoning) -->$/u, `${path.relative(HERE, file)} line 2`);
  }
});

void test('an l1 file is proven by worker diagnostics only: never compile, emit, decorators or JSON doc', async () => {
  const files = installStor();
  const calls: string[] = [];
  const info = { project: PROJECT, level: 1, folder: `${MODULE}/x`, shortName: 'unit', extension: '.ts' };
  const text = 'export const a: number = "x";\n';
  await writeText(info, text);
  const storFile = files[keyOf(info)];
  const model = { model: { getValue: () => text, setValue: () => undefined, uri: { toString: () => 'file://server/_102047_/l1/x/unit.ts' } }, storFile: { ...info } };
  const editorKey = 'k';
  (mls as unknown as Record<string, unknown>).editor = { getKeyModel: () => editorKey, models: { [editorKey]: { ts: model } } };
  (mls as unknown as Record<string, unknown>).l2 = { typescript: {
    compile: async () => { calls.push('compile'); return true; },
    compileAndPostProcess: async () => { calls.push('compileAndPostProcess'); return true; },
    getTypeScriptWorker: async () => { calls.push('getTypeScriptWorker'); return { getEmitOutput: () => calls.push('getEmitOutput') }; },
    getDiagnostics: async (fileName: string) => { calls.push(`getDiagnostics ${fileName}`); return [{ code: 2322, messageText: "Type 'string' is not assignable to type 'number'." }]; },
  } };
  void storFile;
  markWorkerDown('');
  const results = await compileM12Files([{ info, expected: text }]);
  assert.deepEqual(calls, ['getTypeScriptWorker', 'getDiagnostics file://server/_102047_/l1/x/unit.ts']);
  assert.deepEqual(results[0].errors, ["TS2322 - Type 'string' is not assignable to type 'number'."], 'a type error is a compile failure, not unavailable');
});

void test('a usecase takes exactly (input, ctx), and a Contracts annotation on requests is swapped for the function table', () => {
  const three = 'export async function f(\n  input: FInput,\n  ctx: RequestContext,\n  ports: { a: A; b: Map<string, () => void> },\n): Promise<FOutput> {';
  const two = 'export async function f(input: FInput, ctx: RequestContext,): Promise<FOutput> {';
  assert.equal(usecaseParameterCount(three, 'f'), 3);
  assert.equal(usecaseParameterCount(two, 'f'), 2);
  const header = '/// <mls fileReference="x" enhancement="_blank"/>';
  assert.ok(usecaseGate(`${header}\n${three}}`, { header, functionName: 'f', project: 1, moduleName: 'm', ruleIds: [] }).some(item => item.includes('exactly two parameters')));
  const spec = '/_102047_/l2/m/web/contracts/p.defs.js';
  for (const annotation of [': PContracts', ': Record<string, (input: Record<string, unknown>, ctx: RequestContext) => Promise<Record<string, unknown>>>', '']) {
    const typed = [header, `export const requests${annotation} = {`, '};'].join('\n');
    const fixed = normalizeRequestsTyping(typed, 'PContracts', spec);
    assert.ok(fixed.includes(`export const requests: ${requestsTypeOf('PContracts')} = {`), fixed);
    assert.ok(fixed.includes(`import type { PContracts } from '${spec}';`) && fixed.includes("import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';"));
    assert.equal(fixed.split('\n')[0], header, 'the header line stays first');
    assert.equal(normalizeRequestsTyping(fixed, 'PContracts', spec), fixed, 'idempotent');
  }
});

void test('a controller input opens the named interfaces of its contract (details: DetalhesItemCardapio)', { skip: !HAS_BENCH }, () => {
  const text = readFileSync(path.join(ROOT, `mls-${PROJECT}`, 'l2', MODULE, 'web', 'contracts', 'cardapio.defs.ts'), 'utf8');
  const members = membersOfType(text, '{ name: string; details: DetalhesItemCardapio }');
  assert.ok(members, 'the input is read');
  assert.deepEqual([...members!.allowedPaths].sort(), ['details', 'details.details', 'details.details.precoVigente', 'name']);
  assert.ok(members!.requiredFields.includes('details.details.precoVigente'));
  assert.deepEqual(unopenedNamedMembers(text, '{ name: string; details: DetalhesItemCardapio }', members!.allowedPaths), []);
  assert.deepEqual(unopenedNamedMembers(text, '{ name: string; details: DetalhesItemCardapio }', ['name', 'details']), ['details: DetalhesItemCardapio'], 'the old reading is refused by name');
  assert.equal(namedMemberType(' Item[] | null;'), 'Item');
  assert.equal(namedMemberType(' string;'), '');
});

// ---- the bench: comandaRestaurante of mls-102047, end to end without the Studio compiler ----

void test('the contract routes of the bench are read with kind, inputs, actors and rules', { skip: !HAS_BENCH }, () => {
  const text = readFileSync(path.join(ROOT, `mls-${PROJECT}`, 'l2', MODULE, 'web', 'contracts', 'fechamento.defs.ts'), 'utf8');
  const routes = contractRoutes(text, MODULE, 'fechamento');
  assert.deepEqual(routes.map(route => route.route.split('.').pop()), ['carregarFechamento', 'buscarComandasAbertas', 'carregarMaisComandasAbertas', 'obterComandaParaFechamento', 'fecharComandaPaga']);
  const close = routes.find(route => route.route.endsWith('fecharComandaPaga'))!;
  assert.equal(close.kind, 'cmd');
  assert.deepEqual(close.inputFields, ['id', 'version', 'details']);
  assert.deepEqual(close.actors, ['caixa']);
  assert.ok(close.rules.includes('pagamentoObrigatorioNoFechamento'));
});

void test('the bench: recipes for domain and persistence, real prompts and gates for every model unit', { skip: !HAS_BENCH }, async () => {
  const files = installStor();
  seedTree(files, PROJECT, 1, MODULE, name => name.endsWith('.defs.ts')); // the defs only: a generated output on disk would be reused
  seedTree(files, PROJECT, 2, `${MODULE}/web/contracts`);
  seedTree(files, PROJECT, 4, MODULE);
  seedTree(files, PROJECT, 5, '');
  seedTree(files, 102034, 1, 'server');
  seedTree(files, 102034, 1, 'mdm');
  const run = { project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false };
  assert.deepEqual(requestModules(PROJECT, run, storEntries()).modules, [MODULE]);
  const loaded = await loadModuleUnits(PROJECT, MODULE, storEntries());
  assert.deepEqual(loaded.problems, []);
  const selected = selectUnits(PROJECT, MODULE, loaded.units, run);
  assert.equal(selected.length, loaded.units.length);
  assert.deepEqual(selectedLayers(selected), ['domain', 'persistence', 'usecases', 'requests', 'controllers', 'tests']);
  // Rule of 05/10/2026: a type the recipe derives only sometimes always goes to the model.
  for (const unit of selected) assert.equal(unitNeedsLlm(unit), unit.layer === 'usecases' || unit.layer === 'requests', unit.defRef);
  const ctx = createContext(run, loaded.units, 'presentation', BYTES_COMPILER);
  const outcome: Record<string, string> = {};
  const record = async (layer: M12Layer, unitId: string): Promise<void> => {
    const status = await readUnitStatus(PROJECT, MODULE, layer, unitId);
    assert.ok(status, `${layer}/${unitId} has a status file`);
    assert.notEqual(status!.code, 'EXCEPTION', `${layer}/${unitId}: ${status!.diagnostic}`);
    outcome[`${layer}/${unitId}`] = `${status!.status}${status!.code ? ` ${status!.code}` : ''}`;
  };
  for (const layer of ['domain', 'persistence'] as const) {
    for (const unit of orderWithinLayer(layerUnits(selected, layer))) { await materializeUnit(ctx, unit); await record(layer, unit.unitId); }
  }
  assert.equal(outcome['persistence/outbound'], 'gap MECHANISM_UNBOUND');
  // A comanda opens with empty details: the adapter must still return `details: {}` (getComanda read details.x and threw a 500).
  const adapter = await ctx.read(`_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/persistence/comandaRepositoryAdapter.ts`);
  assert.ok(adapter?.includes('A declared object comes back even when none of its fields holds a value'), 'fromRow rebuilds every declared object');
  assert.ok(Object.entries(outcome).every(([key, value]) => key === 'persistence/outbound' || value === 'done'), JSON.stringify(outcome, null, 2));

  // Usecases: the prompt is built for every one; where the recipe has a draft, the draft plays the model answer.
  for (const unit of orderWithinLayer(layerUnits(selected, 'usecases'))) {
    const human = await USECASE_SPEC.context(ctx, unit);
    assert.ok(human.length + 6000 < 160_000, `${unit.unitId} prompt fits`);
    assert.ok(human.includes('## Definition (inventory and hints') && human.includes('## Recipe attempt'), unit.unitId);
    assert.ok(human.includes('/ontology/') && human.includes('(source)'), `${unit.unitId} carries the l4 ontology of its entity as the source`);
    if (unit.unitId === 'createItemComanda') {
      // §2.1 ex. 5: the D1 attached no rule here; the rule texts of the launch reach the model anyway.
      assert.ok(human.includes('- itensSomenteEmComandaAberta: ') && human.includes('- precoUnitarioRegistradoNoLancamento: '), human.slice(0, 200));
      // The price rule names the menu item: its entity and port come with their field names; an entity no rule of it names does not.
      assert.ok(human.includes('## Entity cited by a rule: repositoryPort ItemCardapioRepository (precoUnitarioRegistradoNoLancamento)'), 'the port of the menu item is sent');
      assert.ok(human.includes('## Entity cited by a rule: domainEntity ItemCardapio (precoUnitarioRegistradoNoLancamento)') && human.includes('precoVigente'), 'the menu item entity is sent');
      assert.ok(!human.includes('Entity cited by a rule: domainEntity Mesa') && !human.includes('Entity cited by a rule: repositoryPort MesaRepository'), 'no rule of the launch names the mesa');
    }
    if (unit.unitId === 'listItemComanda') {
      // Every filter of a list is optional in the scaffold: required filters made the request invent values.
      assert.ok(/comandaId\?: string;/u.test(human) && /itemCardapioId\?: string;/u.test(human), 'list filters are optional');
    }
    if (unit.unitId === 'createComanda') {
      // The answer that shipped on 06/10 checked `mesa.details.disponivel` (derived, never stored): every mesa was refused.
      const shipped = "const mesa = await mesaRepository.get(mesaId);\nif (mesa.details.disponivel !== true) throw new AppError('MESA_NOT_AVAILABLE', 'The comanda can only be opened for an available mesa.', 409, { ruleId: 'mesaDisponivelParaAbrirComanda' });";
      const refused = await USECASE_SPEC.gate(ctx, unit, shipped, []);
      assert.ok(refused.some(problem => problem.includes('derived field `details.disponivel`')), refused.join('\n'));
    }
    if (unit.unitId === 'fecharComanda') {
      // "o subtotal da comanda … soma dos valores dos itens": the items reach the prompt through Comanda's relationship `itens`.
      assert.ok(/## Entity cited by a rule: domainEntity ItemComanda \([^)]*subtotalComandaCalculado/u.test(human) && human.includes('precoUnitario'), 'the items of the comanda are sent for the subtotal');
      assert.ok(/## Entity cited by a rule: repositoryPort ItemComandaRepository \(/u.test(human), 'with their port');
    }
    for (const ruleId of rulesToEnforce(unit.definition)) assert.ok(human.includes(`- ${ruleId}: `), `${unit.unitId} carries the l4 text of ${ruleId}`);
    const draft = await recipeDraft(ctx, unit);
    if (!('source' in draft)) { outcome[`usecases/${unit.unitId}`] = `model (${draft.refusal.split(':')[0]})`; continue; }
    if (unit.unitId === 'listComanda') {
      assert.ok(draft.source.includes('const start = (page - 1) * size;'), 'the list recipe pages from 1, as the platform');
      assert.ok(draft.source.includes('Object.keys(value as object).length === 0'), 'an empty object is not a filter');
    }
    // The transition recipe still writes a `ports` parameter: the model must drop it (every usecase is (input, ctx)).
    const all = [...await USECASE_SPEC.gate(ctx, unit, draft.source, []), ...await missingImports(ctx, draft.source)];
    // The transition recipe names itemComandaOperacaoSomenteComandaAberta on the item's own state and never reads the
    // comanda: the model must read it (the parent-rule gate holds it to that).
    const parentRule = all.filter(item => item.includes('and the file never reads it'));
    if (unit.unitId === 'cancelarItemComanda') assert.ok(parentRule.some(item => item.includes('itemComandaOperacaoSomenteComandaAberta')), 'the cancel recipe leaves the comanda unread');
    const problems = all
      .filter(item => !item.includes('takes exactly two parameters') && !item.includes('No `as unknown as`') && !parentRule.includes(item));
    assert.deepEqual(problems, [], `${unit.unitId}: the recipe draft passes the model gate (but the rules the model must apply over the recipe)`);
    const proved = await writeAndProve(ctx, unit, draft.source, await unitInputHash(ctx, unit));
    assert.equal(proved.status, 'done', proved.line);
    await record('usecases', unit.unitId);
  }
  assert.match(outcome['usecases/fecharComanda'], /^model \(RULE_NOT_EMITTED\)/u);
  assert.match(outcome['usecases/createComanda'], /^model \(UNIQUE_RULE_UNNAMED\)/u);

  // Request services: every page gets a prompt with its contract; the recipe draft of a page plays the answer.
  for (const unit of orderWithinLayer(layerUnits(selected, 'requests'))) {
    const human = await REQUEST_SPEC.context(ctx, unit);
    assert.ok(human.includes('(the source of truth)') && human.includes('Finalidade:'), `${unit.unitId} carries the contract JSDoc`);
    const draft = await recipeDraft(ctx, unit);
    if (!('source' in draft)) { outcome[`requests/${unit.unitId}`] = `model (${draft.refusal.split(':')[0]})`; continue; }
    const problems = await REQUEST_SPEC.gate(ctx, unit, draft.source, []);
    outcome[`requests/${unit.unitId}`] = problems.length ? `model (gate: ${problems.length} problem(s))` : 'recipe draft passes';
  }
  console.log(JSON.stringify(outcome, null, 2));
});

void test('the phase agents run in order: recipes write domain and persistence, then every usecase goes to a model worker', { skip: !HAS_BENCH }, async () => {
  const files = installStor();
  // As a Studio whose addOrUpdateFile hands back a copy: the index keeps an object with no content of ours.
  const stor = (mls as unknown as { stor: { addOrUpdateFile: (info: M12FileInfo) => Promise<FakeFile> } }).stor;
  stor.addOrUpdateFile = async (info: M12FileInfo) => {
    const key = keyOf(info);
    if (!files[key]) files[key] = fakeFile(info, '', 'new');
    return fakeFile(info, '', 'new');
  };
  seedTree(files, PROJECT, 1, MODULE, name => name.endsWith('.defs.ts')); // the defs only: a generated output on disk would be reused
  seedTree(files, PROJECT, 2, `${MODULE}/web/contracts`);
  seedTree(files, PROJECT, 4, MODULE);
  seedTree(files, PROJECT, 5, '');
  seedTree(files, 102034, 1, 'server');
  seedTree(files, 102034, 1, 'mdm');
  const request = { scope: MODULE, target: '', force: false };
  const steps = planSteps(PROJECT, request, [{ module: MODULE, layers: ['domain', 'persistence', 'usecases', 'requests', 'controllers', 'tests'], register: true }]);
  assert.deepEqual(steps.map(step => step.agentName).slice(0, 5), ['agentM12Domain', 'agentM12Persistence', 'agentM12Usecases', 'agentM12Requests', 'agentM12Controllers']);
  const context = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
  const parent = { stepId: 1 } as mls.msg.AIAgentStep;
  const run = async (agent: { beforePromptStep?: unknown }, index: number) => {
    const step = { ...steps[index], stepId: 10 + index } as mls.msg.AIAgentStep;
    const hook = agent.beforePromptStep as (a: IAgentMeta, c: mls.msg.ExecutionContext, p: mls.msg.AIAgentStep, s: mls.msg.AIAgentStep, h: number, args?: string) => Promise<Array<Record<string, any>>>;
    return hook(meta, context, parent, step, index, step.prompt);
  };
  const statusOf = (intents: Array<Record<string, any>>) => intents.filter(item => item.type === 'update-status').map(item => item.status);
  const domain = await run(domainAgent(), 0);
  assert.deepEqual(statusOf(domain), ['completed'], JSON.stringify(domain));
  assert.ok(!String(domain[0].traceMsg).includes('failed'), domain[0].traceMsg);
  const persistence = await run(persistenceAgent(), 1);
  assert.deepEqual(statusOf(persistence), ['completed']);
  const entity = await readUnitStatus(PROJECT, MODULE, 'domain', 'comanda');
  assert.equal(entity?.status, 'done', 'a later phase reads the status an earlier phase wrote');
  assert.equal(entity?.code, 'COMPILE_UNAVAILABLE_L1');
  void controllersAgent;
  const usecases = await run(usecasesAgent(), 2);
  const workers = usecases.filter(item => item.type === 'add-step');
  const usecaseDefs = (await loadModuleUnits(PROJECT, MODULE, storEntries())).units.filter(unit => unit.layer === 'usecases').length;
  assert.ok(usecaseDefs > 0);
  assert.equal(workers.length, usecaseDefs, `every usecase is dispatched to the model: ${String(usecases.find(item => item.type === "update-status")?.traceMsg)}`);
  assert.ok(workers.every(item => item.step.agentName === 'agentM12UsecaseUnit'));
  assert.deepEqual(statusOf(usecases), ['in_progress']);
  assert.ok(runArgsJson({ project: PROJECT, module: MODULE, ...request }).includes(MODULE));
});

test('a rule text names the entities of the module by their l4 title', () => {
  const titles = [
    { entityId: 'Comanda', title: 'Comanda' },
    { entityId: 'ItemCardapio', title: 'Item do cardápio' },
    { entityId: 'ItemComanda', title: 'Item da comanda' },
    { entityId: 'Mesa', title: 'Mesa' },
  ];
  assert.deepEqual(citedEntities('O preço unitário do item da comanda deve corresponder ao preço vigente do item do cardápio no momento do lançamento.', titles).sort(), ['ItemCardapio', 'ItemComanda']);
  assert.deepEqual(citedEntities('Uma comanda só pode ser aberta para uma mesa disponível.', titles).sort(), ['Comanda', 'Mesa']);
  assert.deepEqual(citedEntities('Um item só pode ser lançado em uma comanda aberta.', titles), ['Comanda']);
  assert.deepEqual(citedEntities('As mesas livres', titles), ['Mesa'], 'a plural in s still names the entity');
  assert.deepEqual(citedEntities('Comandante', titles), [], 'a title is matched as whole words');
});

test('a rule names an entity through a relationship of the usecase entity (itens → ItemComanda)', () => {
  const comanda = ontologyNames('Comanda', 'export const x = {"title": "Comanda", "relationships": {"mesa": {"to": "Mesa", "title": "Mesa da comanda"}, "itens": {"to": "ItemComanda", "title": "Itens lançados"}}} as const;');
  assert.ok(comanda);
  const entities = [comanda, { entityId: 'ItemComanda', title: 'Item da comanda', relationships: [], derived: [], parents: [] }, { entityId: 'Mesa', title: 'Mesa', relationships: [], derived: [], parents: [] }];
  const text = 'O subtotal da comanda deve ser calculado pela soma dos valores dos itens não cancelados.';
  assert.deepEqual(citedEntities(text, ruleNames('Comanda', entities)).sort(), ['Comanda', 'ItemComanda']);
  assert.deepEqual(citedEntities(text, ruleNames('Mesa', entities)), ['Comanda'], 'a relationship counts only for the entity that has it');
});

test('a repository is typed only by a port of the module', () => {
  const ports = "import type { ComandaRepository } from '/_102047_/l1/comandaRestaurante/layer_2_application/ports/comandaRepository.js';\n";
  assert.deepEqual(repositoryProblems(`${ports}const r = resolveRepository<ComandaRepository>(ctx, 'ComandaRepository');`), []);
  const own = `${ports}interface ItemComandaRepository { list(f: Record<string, unknown>): Promise<unknown[]>; }\nconst r = resolveRepository<ItemComandaRepository>(ctx, 'ItemComandaRepository');`;
  const problems = repositoryProblems(own);
  assert.equal(problems.length, 2, problems.join('\n'));
  assert.ok(problems[0].includes('Do not declare the repository type `ItemComandaRepository`'));
  assert.ok(repositoryProblems("type RecordRepository = { list(): Promise<unknown[]> };").length === 1);
});

test('a write keeps the version it read: the repository adapter increments it', () => {
  assert.equal(versionProblems('const next: Comanda = { ...current, status: \'closed\', version: current.version + 1 };').length, 1);
  assert.equal(versionProblems('next.version += 1;').length, 1);
  assert.equal(versionProblems('const v = saved.version + 1;').length, 1);
  assert.deepEqual(versionProblems('const next: Comanda = { ...current, status: \'closed\', version: current.version };'), []);
  assert.deepEqual(versionProblems('const record = { id, version: 1, details };'), [], 'a create starts at 1');
  assert.deepEqual(versionProblems('if (current.version !== Number(input.version)) throw stale;'), []);
});

test('a usecase never reads a derived field from a record the repository returned (createComanda refused every mesa)', () => {
  const derived = ['details.disponivel', 'details.subtotal', 'details.valorTotal', 'disponivelSolto'];
  assert.equal(derivedReadProblems("const mesa = await mesaRepository.get(mesaId);\nif (mesa.details.disponivel !== true) throw new AppError('MESA_NOT_AVAILABLE', '', 409);", derived).length, 1);
  assert.equal(derivedReadProblems('const mesas = await mesaRepository.list({ id });\nconst mesa = mesas.find((m: Mesa) => m.id === id);\nif (mesa?.details?.disponivel) ok();', derived).length, 1, 'through find and optional chaining');
  assert.equal(derivedReadProblems('const rows = await comandaRepository.list({});\nconst kept = rows.filter((comanda) => Number(comanda.details.subtotal) > 0);', derived).length, 1, 'a callback over the stored rows');
  assert.equal(derivedReadProblems('const [mesa] = await mesaRepository.list({ id });\nreturn mesa.details.disponivel;', derived).length, 1, 'destructured');
  assert.equal(derivedReadProblems('const items = await itemRepository.list({ comandaId });\nfor (const item of items) total += Number(item.details.valorTotal);', derived).length, 1, 'for-of over the stored rows');
  // listItemComanda (06/10) was refused three times for these two lines; neither reads a stored record.
  const listItem = [
    'const details = input.details;',
    'const records = await repository.list(filter);',
    'const calculated = records.map((record): ItemComanda => { const valorTotal = calc(record.details.quantidade); return { ...record, details: { ...record.details, valorTotal } }; });',
    'const requestedValorTotal = details?.valorTotal;',
    'const filtered = calculated.filter((record) => record.details.valorTotal === String(requestedValorTotal));',
  ].join('\n');
  assert.deepEqual(derivedReadProblems(listItem, derived), [], 'a value the usecase calculated, and the caller filter, pass');
  assert.deepEqual(derivedReadProblems('const disponivel = open.length === 0; return { details: { disponivel } };', derived), [], 'calculating and returning it is fine');
  assert.deepEqual(derivedReadProblems('const wanted = input.details?.disponivel;', derived), [], "the caller's filter is not a stored record");
  assert.deepEqual(derivedReadProblems('const x = input.disponivelSolto;', derived), [], 'a bare name is not checked');
});

test('a list applies every filter its input declares (listItemComanda returned the items of every comanda)', () => {
  const head = [
    'export interface ListItemComandaInput extends Record<string, unknown> {',
    '  id?: string;',
    '  comandaId?: string;',
    '  itemCardapioId?: string;',
    '  status?: string;',
    '  details?: {',
    '    quantidade?: number;',
    '    valorTotal?: string;',
    '  };',
    '  page?: number;',
    '  pageSize?: number;',
    '}',
  ].join('\n');
  assert.deepEqual(inputMembers(head), ['id', 'comandaId', 'itemCardapioId', 'status', 'details', 'page', 'pageSize'], 'nested members are not top-level filters');
  // What shipped on 06/10: only id and details were read.
  const shipped = `${head}\nif (input.id !== undefined) filter.id = String(input.id);\nconst requested = input.details?.valorTotal;`;
  const problems = listFilterProblems(shipped);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes('`comandaId`, `itemCardapioId`, `status`'), problems[0]);
  // listItemCardapio reads through an alias of the input; destructuring counts too.
  const alias = `${head}\nconst rawInput: Record<string, unknown> = input;\nconst a = rawInput.id; const b = rawInput.comandaId; const c = rawInput['itemCardapioId']; const d = rawInput.status; const e = rawInput.details;`;
  assert.deepEqual(listFilterProblems(alias), []);
  const destructured = `${head}\nconst { id, comandaId, itemCardapioId, status, details } = input;`;
  assert.deepEqual(listFilterProblems(destructured), []);
});

test('a rule about a parent record obliges reading it (an item was launched in a closed comanda)', async () => {
  const rules = [{ ruleId: 'itensSomenteEmComandaAberta', parents: [{ entityId: 'Comanda', port: 'ComandaRepository' }] }];
  // What shipped on 06/10: the ruleId on a "comanda and item are required" check; the comanda never read.
  const shipped = "if (!comandaId) throw new AppError('INVALID_VALUE', 'The comanda and menu item are required.', 400, { ruleId: 'itensSomenteEmComandaAberta' });";
  const problems = parentRuleProblems(shipped, rules);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes('resolveRepository<ComandaRepository>'), problems[0]);
  const reads = "const comanda = await resolveRepository<ComandaRepository>(ctx, 'ComandaRepository').get(comandaId);\nif (comanda.status !== 'open') throw new AppError('RULE', 'closed', 409, { ruleId: 'itensSomenteEmComandaAberta' });";
  assert.deepEqual(parentRuleProblems(reads, rules), []);
  assert.deepEqual(parentRuleProblems('const x = 1;', rules), [], 'a file that does not name the rule is not concerned');

  // The request handed the rule to createItemComanda in a comment.
  const request = "import { createItemComanda } from '/_102047_/l1/comandaRestaurante/layer_2_application/usecases/createItemComanda.js';\n// createItemComanda enforces itensSomenteEmComandaAberta and precoUnitarioRegistradoNoLancamento.\nawait createItemComanda(input, ctx);";
  const without = await delegatedRuleProblems(request, ['itensSomenteEmComandaAberta'], async () => 'export async function createItemComanda() {}');
  assert.equal(without.length, 1);
  assert.ok(without[0].includes('handed to createItemComanda'), without[0]);
  const withIt = await delegatedRuleProblems(request, ['itensSomenteEmComandaAberta'], async () => "throw new AppError('X', '', 409, { ruleId: 'itensSomenteEmComandaAberta' });");
  assert.deepEqual(withIt, []);
  assert.deepEqual(await delegatedRuleProblems("// valorTotalItemComandaCalculado: quantidade x preço\nconst total = q * p;", ['valorTotalItemComandaCalculado'], async () => null), [], 'a comment on a calculation still names the rule');
});

test('node: is an import, not a local named node (the MDM recipe writes `let node: unknown`)', () => {
  assert.equal(usesNodeBuiltin("import { readFileSync } from 'node:fs';"), true);
  assert.equal(usesNodeBuiltin("const fs = await import('node:fs');"), true);
  assert.equal(usesNodeBuiltin("const fs = require('node:fs');"), true);
  assert.equal(usesNodeBuiltin('let node: unknown = source;\nfor (const part of path) node = (node as Record<string, unknown>)[part];'), false);
  assert.equal(usesNodeBuiltin("import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';"), false);
});

test('an MDM usecase is told the engine is flat today (agendaClinica read details.identification and failed)', () => {
  const ontology = readFileSync(path.join(ROOT, 'mls-102034', 'l4', 'ontology', 'mdm.defs.ts'), 'utf8');
  const facade = readFileSync(path.join(ROOT, 'mls-102034', 'l1', 'mdm', 'layer_3_usecases', 'mdmFacade.ts'), 'utf8');
  const text = mdmContextSection('agendaClinica', ontology, facade);
  assert.ok(text.includes('`details.name`') && text.includes('FLAT today'), 'the flat mapping is stated');
  assert.ok(text.includes('knownDivergences.grouped-document: The branches of this file are the target.'), 'with the platform divergence, verbatim');
  assert.ok(text.includes('NO `version`') && text.includes('"contains" search'), 'the list rows and the name search');
  for (const type of ['export interface MdmEntityReadResult', 'export interface MdmEntityUpdateInput', 'export interface MdmListByTypeInput', 'export type MdmListByTypeItem', 'export interface MdmListByTypeResult']) assert.ok(text.includes(type), type);
  assert.ok(text.includes('`details.agendaClinica`'), 'the module branch is named after the module');
  assert.ok(text.includes('`null` is the same as absent') && text.includes('never throw because a field is `null`'), 'null from the engine is absent');
  const withRules = mdmContextSection('agendaClinica', ontology, facade, ['rule-person-privacy-consent-required-br-eu']);
  assert.ok(withRules.includes('the MDM engine applies them') && withRules.includes('forced to Inactive'), 'a platform rule is the engine\'s, with its text');
  assert.ok(!text.includes('Platform rules this definition lists'), 'no rule section when the definition lists none');
  const unit = (dependencies: string[], sequence: unknown[]) => ({ definition: { dependencies, data: { sequence } } }) as unknown as Parameters<typeof usesMdm>[0];
  assert.equal(usesMdm(unit(['_102034_/l4/ontology/mdm.defs.ts'], [])), true);
  assert.equal(usesMdm(unit([], [{ kind: 'mdm', call: 'get' }])), true);
  assert.equal(usesMdm(unit(['_102047_/l1/comandaRestaurante/layer_3_domain/entities/comanda.defs.ts'], [{ kind: 'port', call: 'get' }])), false);
});

test('a compile error carries its line, column and code (the model never found the missing brace)', () => {
  const text = 'const a = 1;\nreturn { id: value.id, identification: { details: { name: i.name } } ;\nexport {};';
  const start = text.indexOf(' ;');
  const where = diagnosticLocation({ start, code: 1005, messageText: "'}' expected." }, text);
  assert.ok(where.startsWith(' (line 2, column '), where);
  assert.ok(where.includes('⟨here⟩'), where);
  assert.equal(diagnosticLocation({ code: 1005 }, text), '', 'no offset, no location');
});

test('an l4 collection is a list, and an MDM entity follows the optionality of its l4 (contacts is [])', () => {
  // The shape of the agendaClinica Paciente ontology (07/10), reduced to the fields this test reads.
  const ontology = 'export const paciente = ' + JSON.stringify({ entityId: 'Paciente', record: { fields: { id: { type: 'uuid', required: true }, details: { type: 'object', required: true, fields: { identification: { type: 'object', fields: { docId: { type: 'string' } } }, base: { type: 'object', fields: { contacts: { type: 'object', required: true, collection: true, of: 'ContactSummary' } } } } } } } }) + ' as const;';
  const collections = ontologyCollections(ontology);
  assert.ok(collections.has('details.base.contacts'), [...collections].join(','));
  const def = { artifactType: 'domainEntity', artifactId: 'Paciente', moduleName: 'agendaClinica', dependencies: [], data: { entityId: 'Paciente', storageTarget: 'mdm', fields: [{ name: 'id', type: 'uuid' }, { name: 'details.base.contacts', type: 'object' }, { name: 'details.identification.docId', type: 'string' }] } } as unknown as Parameters<typeof emitDomain>[0];
  const emitted = emitDomain(def, '_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.ts', new Set(['details.identification.docId']), new Map(), collections);
  assert.ok('source' in emitted && emitted.source.includes('contacts: Record<string, unknown>[];'), JSON.stringify(emitted));
  assert.ok('source' in emitted && emitted.source.includes('docId?: string;'), 'optional where the l4 does not require it');
});

test('a request never casts the contract input onto a usecase input', () => {
  const head = '/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/profissionais.ts" enhancement="_blank"/>';
  const code = `${head}\nexport const requests = { 'agendaClinica.profissionais.createProfessional': async function (input, ctx) { return { professional: await createProfissional(input as Parameters<typeof createProfissional>[0], ctx) }; } };`;
  const problems = requestGate(code, { header: head, routes: [], project: 102047, moduleName: 'agendaClinica', pageId: 'profissionais', waived: new Set() });
  assert.ok(problems.some(problem => problem.includes('No `as Parameters<typeof <usecase>>[0]`')), problems.join('\n'));
});

test('a request reads its contract input through the contract type (registrarAtendimento read the wrong path)', () => {
  assert.equal(requestsTypeOf('PContracts'), "{ [K in keyof PContracts]: (input: PContracts[K]['input'], ctx: RequestContext) => Promise<PContracts[K]['output']> }");
  // What shipped on 07/10: the note is details.details.attendanceNote in the contract.
  const shipped = "const rawDetails = input.details;\nconst noteValue = (rawDetails as Record<string, unknown>).attendanceNote;";
  assert.ok(untypedInputProblems(shipped).some(problem => problem.includes('Do not cast the input')), 'a cast of a value taken from the input');
  assert.ok(untypedInputProblems('const d = input.details as Record<string, unknown>;').length === 1, 'a cast of the input');
  assert.ok(untypedInputProblems('async function locate(input: Record<string, unknown>, ctx: RequestContext) {}').length === 1, 'a helper typed Record');
  assert.deepEqual(untypedInputProblems("const note = input.details.details.attendanceNote;\nconst out = result as Record<string, unknown>;"), [], 'a typed read, and a cast of something else, pass');
});

test('a transition writes the state it leads to (confirmarConsulta kept scheduled)', () => {
  const ontology = 'export const consulta = ' + JSON.stringify({ entityId: 'Consulta', transitions: [{ transitionId: 'confirmarConsulta', from: ['scheduled'], to: 'confirmed' }, { transitionId: 'registrarFalta', from: ['scheduled', 'confirmed'], to: 'noShow' }] }) + ' as const;';
  const target = transitionTarget(ontology, 'confirmarConsulta');
  assert.deepEqual(target, { transitionId: 'confirmarConsulta', to: 'confirmed' });
  assert.equal(transitionTarget(ontology, 'nao-existe'), undefined);
  // What shipped on 07/10: the read record went to transition() unchanged.
  const shipped = "if (current.status !== 'scheduled') throw x;\nconst transitioned = await consultaRepository.transition(current, 'confirmarConsulta');";
  assert.equal(transitionTargetProblems(shipped, target).length, 1);
  assert.deepEqual(transitionTargetProblems("const next = { ...current, status: 'confirmed' as const };\nawait repo.transition(next, 'confirmarConsulta');", target), []);
  assert.deepEqual(transitionTargetProblems(shipped, undefined), [], 'not a transition');
});

test('a usecase reads only the input it declares (createComanda required an undeclared number)', () => {
  const head = 'export interface CreateComandaInput extends Record<string, unknown> {\n  mesaId: string;\n}';
  const shipped = `${head}\nconst mesaId = String(input.mesaId);\nconst number = Number(input.number);`;
  const problems = undeclaredInputProblems(shipped);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes('`input.number`') && problems[0].includes('highest number plus one'), problems[0]);
  assert.deepEqual(undeclaredInputProblems(`${head}\nconst raw: Record<string, unknown> = input;\nconst m = raw.mesaId;`), [], 'an alias reading a declared member');
  assert.equal(undeclaredInputProblems(`${head}\nconst raw = input;\nconst n = raw['number'];`).length, 1, 'an alias reading an undeclared member');
  assert.deepEqual(undeclaredInputProblems('const n = input.number;'), [], 'no Input interface, nothing to compare');
});
