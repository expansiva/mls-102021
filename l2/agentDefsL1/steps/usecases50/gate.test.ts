/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { readContractAst, symbolFields } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import { decideRepairs, fanoutExecution, fanoutStep, firstWorkerArg, parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { coreUsecaseRequest, fixturePlan, frozenRouteCount } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { D1_WORKER_KINDS } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { parseWorkerReply, STEP_KEYS, usecaseTool } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';
import type { D1UsecaseRequest, D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

void test('the frozen core is 13 usecases for 22 routes, and listConsulta and listProfissional are unique', () => {
  assert.equal(frozenRouteCount(), 22);
  const request = coreUsecaseRequest();
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(build.usecases.length, 13);
  assert.equal(build.emit.length, 13);
  assert.equal(build.usecases.reduce((sum, item) => sum + item.routes.length, 0), 22);
  const listConsulta = build.usecases.filter(item => item.usecaseId === 'listConsulta');
  const listProfissional = build.usecases.filter(item => item.usecaseId === 'listProfissional');
  assert.equal(listConsulta.length, 1);
  assert.equal(listProfissional.length, 1);
  assert.equal(listConsulta[0]?.routes.length, 3);
  assert.equal(listProfissional[0]?.routes.length, 4);
  assert.equal(build.usecases.every(item => item.trustedContext === 'ctx'), true);
  const atendimento = build.emit.find(item => item.definition.artifactId === 'registrarAtendimento');
  const data = atendimento?.definition.data as { functions: Array<{ input: Array<{ name: string }> }>; effects: Array<{ eventId: string }> };
  assert.equal(data.functions[0].input.some(field => field.name === 'attendanceNote'), false);
  assert.deepEqual(data.effects, [{ eventId: 'atendimentoRegistrado' }]);
  assert.equal(build.problems.some(item => item.code === 'NOTE_WITHOUT_INPUT' && item.path === 'registrarAtendimento'), true);
  assert.equal(build.enumerations.every(item => item.consumed === false), true);
  assert.equal(build.enumerations.some(item => item.path === 'status' && item.values.includes('attended')), true);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED'), true);
  assert.equal(build.emit.some(item => (item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('/repositoryAdapter/'))), false);
  const paciente = build.usecases.find(item => item.usecaseId === 'createPaciente');
  assert.deepEqual(paciente?.mdm, { namespace: 'agendaClinica', call: 'create' });
  assert.equal((paciente?.definition?.data as { ports: string[] }).ports.length, 0);
});

void test('a contract type is bound by the route map, not by the first or the same-named symbol', () => {
  const source = `
    export interface ListConsultaOutput { id: string; attendanceNote: string; }
    export interface ReceptionOut { id: string; status: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": { output: "ReceptionOut" } } as const;
  `;
  const ast = readContractAst(source, 'consultas.defs.ts');
  assert.equal(symbolFields(ast, 'ListConsultaOutput')?.some(field => field.name === 'attendanceNote'), true);
  assert.equal(ast.bindings.length, 1);
  assert.equal(ast.bindings[0]?.output, 'ReceptionOut');
  const request = coreUsecaseRequest();
  request.contracts = [{ pageId: 'consultas', path: 'l2/agendaClinica/web/contracts/consultas.defs.ts', source }];
  request.plans = request.usecases.filter(item => item.usecaseId === 'listConsulta').map(item => fixturePlan(request, item));
  request.usecases = request.usecases.filter(item => item.usecaseId === 'listConsulta');
  const build = buildD1Usecases(request);
  const data = build.emit[0]?.definition.data as {
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
    functions: Array<{ output: Array<{ name: string }> }>;
  };
  const consultas = data.routeProjections.find(item => item.route.endsWith('consultas.qryListConsulta'));
  const agenda = data.routeProjections.find(item => item.route.endsWith('agenda.qryListConsulta'));
  assert.deepEqual(consultas?.outputFields, ['id', 'status']);
  assert.equal(agenda?.projection, 'unresolved');
  assert.deepEqual(agenda?.outputFields, []);
  assert.equal(data.functions[0].output.some(field => field.name === 'attendanceNote'), false);
});

void test('two pages with different disclosure keep one operation and per-route outputs', () => {
  const professional = `
    export interface AgendaOut { id: string; status: string; attendanceNote: string; }
    export const routes = { "agendaClinica.agenda.qryListConsulta": { output: "AgendaOut" } } as const;
  `;
  const reception = `
    export interface AgendaOut { id: string; status: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": { output: "AgendaOut" } } as const;
  `;
  const request = coreUsecaseRequest();
  request.contracts = [
    { pageId: 'agenda', path: 'agenda.defs.ts', source: professional },
    { pageId: 'consultas', path: 'consultas.defs.ts', source: reception },
  ];
  request.usecases = request.usecases.filter(item => item.usecaseId === 'listConsulta');
  request.plans = request.usecases.map(item => fixturePlan(request, item));
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  assert.equal(build.emit.length, 1);
  const data = build.emit[0].definition.data as {
    usecaseId: string;
    routeProjections: Array<{ route: string; outputFields: string[] }>;
    functions: Array<{ output: Array<{ name: string }> }>;
  };
  assert.equal(data.usecaseId, 'listConsulta');
  const agenda = data.routeProjections.find(item => item.route.includes('.agenda.'));
  const consultas = data.routeProjections.find(item => item.route.includes('.consultas.'));
  assert.deepEqual(agenda?.outputFields, ['id', 'status', 'attendanceNote']);
  assert.deepEqual(consultas?.outputFields, ['id', 'status']);
  assert.equal(data.functions[0].output.some(field => field.name === 'attendanceNote'), true);
});

void test('an invalid transition, an unresolved rule, a derived input, an adapter and an omitted effect are findings', () => {
  const request = coreUsecaseRequest();
  request.usecases = [request.usecases.find(item => item.usecaseId === 'registrarAtendimento')!];
  request.plans = [{
    usecaseId: 'registrarAtendimento',
    steps: [
      { kind: 'context', source: 'ctx' },
      { kind: 'port', call: 'transition', port: 'ConsultaRepositoryAdapter' },
      { kind: 'rule', ruleId: 'notARealRule' },
      { kind: 'transition', transitionId: 'setStatus', payload: ['id', 'madeUp'] },
    ],
  }];
  const source = `
    export interface In { id: string; attendanceNote: string; }
    export interface Out { id: string; }
    export const routes = { "agendaClinica.agenda.cmdRegistrarAtendimento": { input: "In", output: "Out" } } as const;
  `;
  request.contracts = [{ pageId: 'agenda', path: 'agenda.defs.ts', source }];
  const build = buildD1Usecases(request);
  const codes = build.problems.map(item => item.code);
  assert.equal(codes.includes('INVALID_TRANSITION'), true);
  assert.equal(codes.includes('RULE_UNRESOLVED'), true);
  assert.equal(codes.includes('DERIVED_EDITABLE'), true);
  assert.equal(codes.includes('ADAPTER_IMPORT'), true);
  assert.equal(codes.includes('EFFECT_OMITTED'), true);
  assert.equal(codes.includes('PAYLOAD_UNAUTHORIZED'), true);
  assert.equal(build.emit.length, 0);
});

void test('several writes need one local boundary, and an external boundary is not atomic', () => {
  const base = coreUsecaseRequest();
  base.ports[0].methods = ['create', 'update', 'list', 'transition'];
  base.usecases = [base.usecases.find(item => item.usecaseId === 'createConsulta')!];
  const writes: D1WorkerStep[] = [
    { kind: 'context', source: 'ctx' },
    { kind: 'port', call: 'create', port: 'ConsultaRepository' },
    { kind: 'port', call: 'update', port: 'ConsultaRepository' },
  ];
  base.plans = [{ usecaseId: 'createConsulta', steps: writes }];
  const missing = buildD1Usecases(base);
  assert.equal(missing.problems.some(item => item.code === 'TRANSACTION_BOUNDARY'), true);
  assert.equal(missing.emit.length, 0);

  const local = structuredClone(base) as D1UsecaseRequest;
  local.plans = [{ usecaseId: 'createConsulta', steps: [...writes, { kind: 'transaction', boundary: 'local' }] }];
  const bounded = buildD1Usecases(local);
  assert.equal(bounded.ok, true, bounded.problems.map(item => item.message).join('; '));
  assert.equal(bounded.usecases[0]?.transactionBoundary, 'local');
  assert.equal((bounded.emit[0]?.definition.data as { transactional: boolean }).transactional, true);

  const external = structuredClone(base) as D1UsecaseRequest;
  external.plans = [{ usecaseId: 'createConsulta', steps: [...writes, { kind: 'transaction', boundary: 'external' }] }];
  const refused = buildD1Usecases(external);
  assert.equal(refused.problems.some(item => item.code === 'EXTERNAL_ATOMICITY'), true);
  assert.equal(refused.usecases[0]?.transactionBoundary, null);
});

void test('a failed fan-out keeps its trace and the barrier does not repair an operational failure', () => {
  const decision = decideRepairs({
    expected: ['listConsulta', 'createConsulta'],
    attempts: [
      { usecaseId: 'listConsulta', status: 'operational', trace: 'transport down', unitAttempts: 0, reply: null },
      { usecaseId: 'createConsulta', status: 'repairable', trace: 'rule missing', unitAttempts: 0, reply: null },
    ],
    globalAttempts: 0,
    feedbackFor: id => id,
  });
  assert.equal(decision.pause, true);
  assert.equal(decision.identified.some(item => item.usecaseId === 'listConsulta' && item.trace === 'transport down'), true);
  assert.equal(decision.repairs.some(item => item.usecaseId === 'listConsulta'), false);
  assert.equal(decision.repairs.length, 1);
  assert.equal(decision.repairs[0]?.usecaseId, 'createConsulta');
  assert.equal(decision.repairs[0]?.planId, 'usecases50-repair-1');

  const again = decideRepairs({
    expected: ['createConsulta'],
    attempts: [{ usecaseId: 'createConsulta', status: 'repairable', trace: 'still wrong', unitAttempts: 1, reply: null }],
    globalAttempts: 1,
    feedbackFor: () => '',
  });
  assert.equal(again.repairs.length, 0);
  assert.equal(again.identified[0]?.code, 'REPAIR_EXHAUSTED');
  assert.equal(again.identified[0]?.trace, 'still wrong');

  const missing = decideRepairs({
    expected: ['listPaciente'],
    attempts: [],
    globalAttempts: 0,
    feedbackFor: () => '',
  });
  assert.equal(missing.identified[0]?.trace, 'missing trace');
  assert.equal(missing.pause, true);
  assert.equal(missing.repairs.length, 0);

  const capped = decideRepairs({
    expected: ['listPaciente'],
    attempts: [{ usecaseId: 'listPaciente', status: 'repairable', trace: 'late', unitAttempts: 0, reply: null }],
    globalAttempts: 8,
    feedbackFor: () => '',
  });
  assert.equal(capped.repairs.length, 0);
  assert.equal(capped.identified[0]?.code, 'REPAIR_EXHAUSTED');
});

void test('worker args stay compact and a reply cannot invent a field or write the usecase id', () => {
  const arg = firstWorkerArg(102047, 'agendaClinica', 'listConsulta');
  assert.equal(arg.includes('\n'), false);
  assert.deepEqual(Object.keys(JSON.parse(arg)).sort(), ['attempt', 'globalAttempts', 'moduleName', 'planId', 'project', 'unitAttempts', 'usecaseId']);
  const parsed = parseWorkerArg(arg);
  assert.equal(parsed?.planId, 'usecases50-worker-listConsulta');
  const mode = fanoutExecution([arg, firstWorkerArg(102047, 'agendaClinica', 'createConsulta')]);
  assert.equal(mode.maxParallel, 5);
  assert.equal(mode.args.length, 2);
  const parent = fanoutStep(102047, 'agendaClinica', mode.args);
  assert.equal(parent.status, 'in_progress');
  assert.equal(parent.interaction?.cost, 0);
  assert.equal(parent.interaction?.payload, null);
  assert.deepEqual(parent.interaction?.input, [{ type: 'system', content: '<!-- modelType: reasoning -->' }]);
  assert.deepEqual(parent.interaction?.trace, ['queued 2 usecases50 workers with maxParallel=5']);

  const invented = parseWorkerReply({ usecaseId: 'other', steps: [] });
  assert.equal(invented.steps, null);
  assert.equal(invented.problems[0]?.code, 'INVENTED_FIELD');
  const foreign = parseWorkerReply({ steps: [{ kind: 'rule', ruleId: 'keep', port: 'nope' }] });
  assert.equal(foreign.steps, null);
  assert.equal(foreign.problems[0]?.code, 'INVENTED_FIELD');
  assert.match(foreign.problems[0]?.message || '', /port/);
  const steps = parseWorkerReply({ steps: [{ kind: 'context', source: 'ctx' }, { kind: 'import', path: 'adapter' }] });
  assert.equal(steps.steps, null);
  assert.equal(steps.problems.some(item => item.code === 'INVENTED_OPERATION'), true);
});

void test('the tool schema offers each kind only the keys of that kind', () => {
  const parameters = usecaseTool().function.parameters;
  assert.ok(parameters);
  const steps = (parameters.properties as { steps?: unknown } | undefined)?.steps;
  assert.ok(steps && typeof steps === 'object');
  const items = (steps as { items?: unknown }).items;
  assert.ok(items && typeof items === 'object' && !Array.isArray(items));
  const node = items as Record<string, unknown>;
  assert.equal(Object.hasOwn(node, 'properties'), false);
  assert.equal(Object.hasOwn(node, 'oneOf'), false);
  const anyOf = node.anyOf;
  assert.ok(Array.isArray(anyOf));
  assert.equal(anyOf.length, D1_WORKER_KINDS.length);
  D1_WORKER_KINDS.forEach((kind, index) => {
    const branch = anyOf[index];
    assert.ok(branch && typeof branch === 'object' && !Array.isArray(branch));
    const body = branch as Record<string, unknown>;
    assert.equal(body.additionalProperties, false, kind);
    const props = body.properties;
    assert.ok(props && typeof props === 'object' && !Array.isArray(props));
    const kindSchema = (props as Record<string, unknown>).kind;
    assert.ok(kindSchema && typeof kindSchema === 'object');
    assert.equal((kindSchema as { const?: unknown }).const, kind);
    const expected = [...STEP_KEYS[kind]].sort();
    assert.deepEqual(Object.keys(props as object).sort(), expected, kind);
    assert.ok(Array.isArray(body.required));
    assert.deepEqual([...body.required].map(String).sort(), expected, kind);
  });
});

void test('parseStep still rejects a key from another kind', () => {
  for (const kind of D1_WORKER_KINDS) {
    const own = STEP_KEYS[kind] as readonly string[];
    const foreign = D1_WORKER_KINDS
      .flatMap(other => STEP_KEYS[other] as readonly string[])
      .find(key => key !== 'kind' && !own.includes(key));
    assert.ok(foreign, kind);
    const reply = parseWorkerReply({ steps: [{ kind, [foreign]: 'x' }] });
    assert.equal(reply.steps, null, kind);
    assert.equal(reply.problems[0]?.code, 'INVENTED_FIELD', kind);
    assert.match(reply.problems[0]?.message || '', new RegExp(`Step 0 names ${foreign}\\.`));
  }
});

void test('an unclosed exported interface is CONTRACT_UNPARSED', () => {
  const request = coreUsecaseRequest();
  const usecase = request.usecases[0];
  request.usecases = [usecase];
  request.plans = [fixturePlan(request, usecase)];
  const path = 'l2/agendaClinica/web/contracts/agenda.defs.ts';
  request.contracts = [{ pageId: 'agenda', path, source: 'export interface Broken { id: string' }];
  const build = buildD1Usecases(request);
  const problem = build.problems.find(item => item.code === 'CONTRACT_UNPARSED');
  assert.equal(problem?.path, path);
  assert.match(problem?.message || '', /Broken/);
  assert.equal(build.emit.length, 0);
});
