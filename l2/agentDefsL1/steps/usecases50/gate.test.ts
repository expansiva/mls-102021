/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { readContractAst, symbolFields } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import { decideRepairs, fanoutExecution, fanoutStep, firstWorkerArg, parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { coreUsecaseRequest, fixturePlan, frozenRouteCount } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { D1_MDM_CALLS, D1_WORKER_KINDS } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { closedFromRequest, parseWorkerReply, STEP_KEYS, usecaseTool } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';
import type { D1UsecaseContext, D1UsecaseRequest, D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

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
  assert.deepEqual(data.effects, [{
    eventId: 'atendimentoRegistrado',
    path: 'l4/agendaClinica/integration.defs.ts',
    symbol: 'atendimentoRegistrado',
  }]);
  assert.equal(build.problems.some(item => item.code === 'NOTE_WITHOUT_INPUT' && item.path === 'registrarAtendimento'), true);
  assert.equal(build.enumerations.every(item => item.consumed === false), true);
  assert.equal(build.enumerations.some(item => item.path === 'status' && item.values.includes('attended')), true);
  assert.equal(build.normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED'), true);
  assert.equal(build.emit.some(item => (item.pipeline[0]?.dependsOn || []).some(dep => dep.includes('/repositoryAdapter/'))), false);
  const paciente = build.usecases.find(item => item.usecaseId === 'createPaciente');
  assert.equal(paciente?.mdm?.namespace, 'agendaClinica');
  assert.equal(paciente?.mdm?.role, 'agendaClinica.Paciente');
  assert.equal(paciente?.mdm?.atomic, false);
  assert.deepEqual(paciente?.mdm?.calls.map(call => call.method), ['findByDocument', 'create', 'attachRole']);
  assert.equal(paciente?.mdm?.calls.some(call => call.method === 'attachRole' && call.arguments.some(arg => arg.name === 'role' && arg.value === 'agendaClinica.Paciente')), true);
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
  assert.equal(build.problems.some(item => item.code === 'PROJECTION_UNRESOLVED' && item.path === agenda?.route), true);
  assert.match(
    build.problems.find(item => item.code === 'PROJECTION_UNRESOLVED' && item.path === agenda?.route)?.message || '',
    /agendaClinica\.agenda\.qryListConsulta/,
  );
  assert.equal(build.problems.some(item => item.code === 'PROJECTION_UNRESOLVED' && item.path === consultas?.route), false);
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

void test('the mdm branch call enum is exactly D1_MDM_CALLS', () => {
  const open = branchOf(usecaseTool(), 'mdm');
  const call = propertyOf(open, 'call');
  assert.deepEqual(call.enum, [...D1_MDM_CALLS]);
  assert.equal(call.type, 'string');
  const portCall = propertyOf(branchOf(usecaseTool(), 'port'), 'call');
  assert.equal(Object.hasOwn(portCall, 'enum'), false);

  const closed = usecaseTool({
    portCalls: ['create', 'list'],
    portIds: ['ConsultaRepository'],
    ruleIds: ['consultationTransitionFlow'],
    namespaces: ['agendaClinica'],
    entityIds: ['Paciente'],
    transitionIds: ['confirmarConsulta'],
    eventIds: ['consultaConfirmada'],
  });
  assert.deepEqual(propertyOf(branchOf(closed, 'mdm'), 'call').enum, [...D1_MDM_CALLS]);
  assert.notDeepEqual(propertyOf(branchOf(closed, 'port'), 'call').enum, [...D1_MDM_CALLS]);
  assert.deepEqual(propertyOf(branchOf(closed, 'port'), 'call').enum, ['create', 'list']);
  assert.deepEqual(propertyOf(branchOf(closed, 'port'), 'port').enum, ['ConsultaRepository']);
  assert.deepEqual(propertyOf(branchOf(closed, 'mdm'), 'namespace').enum, ['agendaClinica']);
  assert.deepEqual(propertyOf(branchOf(closed, 'mdm'), 'entity').enum, ['Paciente']);
  assert.deepEqual(propertyOf(branchOf(closed, 'rule'), 'ruleId').enum, ['consultationTransitionFlow']);
  assert.deepEqual(propertyOf(branchOf(closed, 'transition'), 'transitionId').enum, ['confirmarConsulta']);
  assert.deepEqual(propertyOf(branchOf(closed, 'effect'), 'eventId').enum, ['consultaConfirmada']);

  for (const catalogCall of D1_MDM_CALLS) {
    const reply = parseWorkerReply({ steps: [{ kind: 'mdm', namespace: 'agendaClinica', call: catalogCall, entity: 'Paciente', capability: 'read.byId' }] });
    assert.equal(reply.problems.length, 0, catalogCall);
    assert.equal(reply.steps?.[0]?.kind === 'mdm' && reply.steps[0].call, catalogCall);
  }
  const outsider = `${D1_MDM_CALLS.join('-')}-extra`;
  assert.equal((D1_MDM_CALLS as readonly string[]).includes(outsider), false);
  const refused = parseWorkerReply({ steps: [{ kind: 'mdm', namespace: 'agendaClinica', call: outsider, entity: 'Paciente', capability: 'read.byId' }] });
  assert.equal(refused.steps, null);
  assert.equal(refused.problems[0]?.code, 'INVENTED_OPERATION');
  assert.match(refused.problems[0]?.message || '', new RegExp(outsider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

function branchOf(tool: ReturnType<typeof usecaseTool>, kind: string): Record<string, unknown> {
  const parameters = tool.function.parameters;
  assert.ok(parameters);
  const steps = (parameters.properties as { steps?: unknown } | undefined)?.steps;
  assert.ok(steps && typeof steps === 'object');
  const anyOf = (steps as { items?: { anyOf?: unknown } }).items?.anyOf;
  assert.ok(Array.isArray(anyOf));
  const found = anyOf.find(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const props = (item as { properties?: { kind?: { const?: unknown } } }).properties;
    return props?.kind?.const === kind;
  });
  assert.ok(found && typeof found === 'object' && !Array.isArray(found), kind);
  return found as Record<string, unknown>;
}

function propertyOf(branch: Record<string, unknown>, key: string): { type?: unknown; enum?: unknown } {
  const props = branch.properties;
  assert.ok(props && typeof props === 'object' && !Array.isArray(props));
  const value = (props as Record<string, unknown>)[key];
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), key);
  return value as { type?: unknown; enum?: unknown };
}

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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_CONTRACTS = path.join(HERE, '../input20/fixtures/contracts');
const MISSING_ROUTE = 'agendaClinica.pacientes.cmdMissingShape';

void test('the six L2 contracts declare route signatures, and a route without a form is unresolved with a problem', () => {
  const contracts = realContractSources();
  assert.equal(contracts.length, 6);
  let declared = 0;
  for (const contract of contracts) {
    const matcher = /export const (\w+Route) = ["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    let found = 0;
    while ((match = matcher.exec(contract.source))) {
      found += 1;
      const route = match[2];
      const request = requestForRealRoute(contract, route);
      const build = buildD1Usecases(request);
      const mdmUpdate = /cmdUpdate(?:Profissional|Recepcionista)$/.test(route);
      if (mdmUpdate) {
        assert.equal(build.ok, false, route);
        assert.equal(build.emit.length, 0, route);
        assert.equal(build.problems.some(item => item.code === 'MDM_ARGUMENT_UNBOUND' && item.message.includes('expectedVersion')), true, route);
        declared += 1;
        continue;
      }
      assert.equal(
        build.ok,
        true,
        `${route}: ${build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ')}`,
      );
      const data = build.emit[0]?.definition.data as {
        functions: Array<{ input: Array<{ name: string }>; contractRefs: Array<{ route: string; symbol: string }> }>;
        routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
      };
      const row = data.routeProjections.find(item => item.route === route);
      assert.equal(row?.projection, 'declared', route);
      assert.ok((row?.outputFields.length || 0) > 0, route);
      const stem = match[1].slice(0, -'Route'.length);
      const output = `${stem.charAt(0).toUpperCase()}${stem.slice(1)}Output`;
      assert.equal(data.functions[0].contractRefs.some(item => item.route === route && item.symbol === output), true, route);
      declared += 1;
    }
    assert.ok(found > 0, contract.pageId);
  }
  assert.equal(declared, 26);

  const pacientes = contracts.find(item => item.pageId === 'pacientes');
  assert.ok(pacientes);
  const create = buildD1Usecases(requestForRealRoute(pacientes, 'agendaClinica.pacientes.cmdCreateConsulta'));
  const createData = create.emit[0]?.definition.data as {
    functions: Array<{ input: Array<{ name: string }>; contractRefs: Array<{ route: string; symbol: string }> }>;
    routeProjections: Array<{ route: string; outputFields: string[] }>;
  };
  assert.deepEqual(createData.routeProjections[0]?.outputFields, ['id', 'version', 'patientId', 'professionalId', 'scheduledAt', 'status']);
  assert.deepEqual(createData.functions[0].input.map(field => field.name), ['patientId', 'professionalId', 'scheduledAt', 'status']);
  assert.equal(createData.functions[0].contractRefs[0]?.symbol, 'CreateConsultaOutput');

  const list = buildD1Usecases(requestForRealRoute(pacientes, 'agendaClinica.pacientes.qryListConsulta'));
  const listData = list.emit[0]?.definition.data as { routeProjections: Array<{ outputFields: string[] }> };
  assert.deepEqual(listData.routeProjections[0]?.outputFields, ['id', 'version', 'patientId', 'professionalId', 'scheduledAt', 'status']);

  const missing = requestForRealRoute(pacientes, 'agendaClinica.pacientes.cmdCreateConsulta');
  missing.routes[0].route = MISSING_ROUTE;
  missing.usecases[0].routes = [MISSING_ROUTE];
  missing.plans = missing.usecases.map(item => fixturePlan(missing, item));
  const unbound = buildD1Usecases(missing);
  const unboundData = unbound.emit[0]?.definition.data as {
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
  };
  assert.equal(unboundData.routeProjections[0]?.projection, 'unresolved');
  assert.deepEqual(unboundData.routeProjections[0]?.outputFields, []);
  const problem = unbound.problems.find(item => item.code === 'PROJECTION_UNRESOLVED' && item.path === MISSING_ROUTE);
  assert.equal(problem?.severity, 'review');
  assert.match(problem?.message || '', /cmdMissingShape/);
});

void test('the six contracts keep one projection per route when disclosure differs', () => {
  const contracts = realContractSources();
  assert.equal(contracts.length, 6);

  const list = buildRealUsecase(contracts, 'listConsulta');
  assert.equal(list.ok, true, list.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(list.emit.length, 1);
  const listData = list.emit[0]?.definition.data as {
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
    functions: Array<{ output: Array<{ name: string; type?: string }> }>;
  };
  assert.equal(listData.routeProjections.length, 4);
  assert.equal(list.problems.some(item => item.code === 'TYPE_CONFLICT'), false);
  for (const row of listData.routeProjections) {
    assert.equal(row.projection, 'declared', row.route);
    assert.deepEqual(row.outputFields, declaredOutputNames(contracts, row.route), row.route);
  }
  const professional = listData.routeProjections.find(item => item.route.endsWith('consultas_profissional.qryListConsulta'));
  const reception = listData.routeProjections.find(item => item.route.endsWith('consultas_recepcionista.qryListConsulta'));
  assert.equal(professional?.outputFields.includes('details'), true);
  assert.equal(reception?.outputFields.includes('details'), false);
  const listed = listData.functions[0].output.find(field => field.name === 'details');
  assert.equal(listed?.type, declaredFieldType(contracts, professional?.route || '', 'output', 'details'));

  const professionals = buildRealUsecase(contracts, 'listProfissional');
  assert.equal(professionals.ok, true, professionals.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(professionals.emit.length, 1);
  const professionalData = professionals.emit[0]?.definition.data as {
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
    functions: Array<{ output: Array<{ name: string; type?: string }> }>;
  };
  assert.equal(professionalData.routeProjections.length, 5);
  assert.equal(professionals.problems.some(item => item.code === 'TYPE_CONFLICT'), false);
  for (const row of professionalData.routeProjections) {
    assert.equal(row.projection, 'declared', row.route);
    assert.deepEqual(row.outputFields, declaredOutputNames(contracts, row.route), row.route);
  }
  const wide = declaredFieldType(contracts, 'agendaClinica.dados_profissional.qryListProfissional', 'output', 'details');
  const narrow = declaredFieldType(contracts, 'agendaClinica.pacientes.qryListProfissional', 'output', 'details');
  assert.notEqual(wide, narrow);
  const sharedDetails = professionalData.functions[0].output.find(field => field.name === 'details');
  assert.ok(sharedDetails);
  assert.equal(Object.hasOwn(sharedDetails, 'type'), false);

  const created = buildRealUsecase(contracts, 'createProfissional');
  assert.equal(created.ok, true, created.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(created.emit.length, 1);
  const createdData = created.emit[0]?.definition.data as {
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
    functions: Array<{ input: Array<{ name: string; type?: string }> }>;
  };
  assert.equal(createdData.routeProjections.length, 2);
  for (const row of createdData.routeProjections) {
    assert.deepEqual(row.outputFields, declaredOutputNames(contracts, row.route), row.route);
  }
  const wideInput = declaredFieldType(contracts, 'agendaClinica.dados_profissional.cmdCreateProfissional', 'input', 'details');
  const narrowInput = declaredFieldType(contracts, 'agendaClinica.dados_recepcionista.cmdCreateProfissional', 'input', 'details');
  assert.notEqual(wideInput, narrowInput);
  const inputDetails = createdData.functions[0].input.find(field => field.name === 'details');
  assert.ok(inputDetails);
  assert.equal(Object.hasOwn(inputDetails, 'type'), false);
  assert.equal(created.problems.some(item => item.code === 'TYPE_CONFLICT'), false);
});

void test('two types for one field inside one route stay a conflict', () => {
  const output = `
    export interface ListConsultaOutput { id: string; status: string; status: number; }
    export const listConsultaRoute = "agendaClinica.consultas.qryListConsulta" as const;
  `;
  const listed = buildD1Usecases(singleRouteRequest('listConsulta', 'consultas', 'agendaClinica.consultas.qryListConsulta', 'qry', output));
  const outputProblem = listed.problems.find(item => item.code === 'TYPE_CONFLICT');
  assert.equal(outputProblem?.message, 'Field status has two contract types. No cast was applied.');
  assert.equal(listed.emit.length, 0);

  const input = `
    export interface CreateConsultaInput { patientId: string; patientId: number; }
    export interface CreateConsultaOutput { id: string; }
    export const createConsultaRoute = "agendaClinica.consultas.cmdCreateConsulta" as const;
  `;
  const created = buildD1Usecases(singleRouteRequest('createConsulta', 'consultas', 'agendaClinica.consultas.cmdCreateConsulta', 'cmd', input));
  const inputProblem = created.problems.find(item => item.code === 'TYPE_CONFLICT');
  assert.equal(inputProblem?.message, 'Input patientId has two contract types. No cast was applied.');
  assert.equal(created.emit.length, 0);
});

void test('a derived identity may filter a list or select an update or transition, and stays on the input', () => {
  const contracts = realContractSources();
  for (const usecaseId of ['listConsulta', 'listPaciente', 'listProfissional', 'listRecepcionista']) {
    const build = buildRealUsecase(contracts, usecaseId);
    assert.equal(build.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, usecaseId);
    assert.equal(build.ok, true, `${usecaseId}: ${build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ')}`);
    const data = build.emit[0]?.definition.data as { functions: Array<{ input: Array<{ name: string; type?: string }> }> };
    const id = data.functions[0].input.find(field => field.name === 'id');
    assert.ok(id, usecaseId);
    assert.equal(id.type, 'string', usecaseId);
    assert.equal(build.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === `${usecaseId}.id`), true, usecaseId);
  }

  for (const usecaseId of ['confirmarConsulta', 'registrarAtendimento', 'registrarFalta']) {
    const build = buildRealUsecase(contracts, usecaseId);
    assert.equal(build.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, usecaseId);
    assert.equal(build.ok, true, `${usecaseId}: ${build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ')}`);
    const data = build.emit[0]?.definition.data as { functions: Array<{ input: Array<{ name: string }> }> };
    assert.equal(data.functions[0].input.some(field => field.name === 'id'), true, usecaseId);
    assert.equal(build.normalizations.some(item => item.code === 'DERIVED_SELECTOR' && item.path === `${usecaseId}.id`), true, usecaseId);
  }

  const noted = requestOf(contracts, 'registrarAtendimento');
  const attendance = noted.entities.find(item => item.entityId === 'Consulta')?.transitions.find(item => item.transitionId === 'registrarAtendimento');
  assert.ok(attendance);
  attendance.payload = ['details.attendanceNote'];
  noted.contexts = [inputContext('registrarAtendimento', noted.routes[0].route, [
    { path: 'id', type: 'string', optional: false },
    { path: 'details', type: 'object', optional: false },
    { path: 'details.attendanceNote', type: 'string', optional: true },
  ])];
  const notePlan = noted.plans[0].steps.map(step => (
    step.kind === 'transition' ? { ...step, payload: ['details.attendanceNote'] } : step
  ));
  noted.plans = [{ usecaseId: 'registrarAtendimento', steps: notePlan }];
  const withNote = buildD1Usecases(noted);
  assert.equal(withNote.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, withNote.problems.map(item => item.message).join('; '));
  assert.equal(withNote.problems.some(item => item.code === 'PAYLOAD_UNAUTHORIZED'), false);
  const noteInput = (withNote.emit[0]?.definition.data as { functions: Array<{ input: Array<{ name: string }> }> }).functions[0].input;
  assert.equal(noteInput.some(field => field.name === 'id'), true);
  assert.equal(noteInput.some(field => field.name === 'details'), true);

  for (const usecaseId of ['updateProfissional', 'updateRecepcionista']) {
    const build = buildRealUsecase(contracts, usecaseId);
    assert.equal(build.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, usecaseId);
    assert.equal(build.problems.some(item => item.code === 'MDM_ARGUMENT_UNBOUND' && item.message.includes('expectedVersion')), true, usecaseId);
    assert.equal(build.emit.length, 0, usecaseId);
    assert.equal(build.normalizations.some(item => item.code === 'DERIVED_SELECTOR' && item.path === `${usecaseId}.id`), true, usecaseId);
  }
});

void test('r10 replies no longer carry DERIVED_EDITABLE, and other pending refusals may remain', () => {
  const contracts = realContractSources();
  const listed = buildD1Usecases({
    ...requestOf(contracts, 'listConsulta'),
    plans: [{ usecaseId: 'listConsulta', steps: R10.listConsulta }],
  });
  assert.equal(listed.problems.some(item => item.code === 'DERIVED_EDITABLE'), false);
  assert.equal(listed.ok, true, listed.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(
    (listed.emit[0]?.definition.data as { functions: Array<{ input: Array<{ name: string }> }> }).functions[0].input.some(field => field.name === 'id'),
    true,
  );

  const updated = buildD1Usecases({
    ...requestOf(contracts, 'updateProfissional'),
    plans: [{ usecaseId: 'updateProfissional', steps: R10.updateProfissional }],
  });
  assert.equal(updated.problems.some(item => item.code === 'DERIVED_EDITABLE'), false);
  assert.equal(updated.problems.some(item => item.code === 'INVALID_TRANSITION'), true);
  assert.equal(updated.emit.length, 0);
});

void test('assigning a derived field stays an error, including a nested homonym and a version that is not concurrency', () => {
  const created = buildD1Usecases(singleRouteRequest(
    'createConsulta',
    'consultas',
    'agendaClinica.consultas.cmdCreateConsulta',
    'cmd',
    `
      export interface CreateConsultaInput { id: string; patientId: string; }
      export interface CreateConsultaOutput { id: string; }
      export const createConsultaRoute = "agendaClinica.consultas.cmdCreateConsulta" as const;
    `,
  ));
  assert.equal(created.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field id is assigned by createConsulta.'), true);
  assert.equal(created.emit.length, 0);

  const patched = requestOf(realContractSources(), 'updateProfissional');
  patched.plans = [{
    usecaseId: 'updateProfissional',
    steps: [
      { kind: 'context', source: 'ctx' },
      { kind: 'mdm', namespace: 'agendaClinica', call: 'attach', entity: 'Profissional', capability: 'edit.platformFields' },
      { kind: 'transition', transitionId: 'updateProfissional', payload: ['id'] },
    ],
  }];
  const replaced = buildD1Usecases(patched);
  assert.equal(replaced.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field id is assigned by updateProfissional.'), true);

  const payload = requestOf(realContractSources(), 'confirmarConsulta');
  payload.plans = [{
    usecaseId: 'confirmarConsulta',
    steps: [
      { kind: 'context', source: 'ctx' },
      { kind: 'rule', ruleId: 'consultationTransitionFlow' },
      { kind: 'transition', transitionId: 'confirmarConsulta', payload: ['id'] },
      { kind: 'port', call: 'transition', port: 'ConsultaRepository' },
      { kind: 'effect', eventId: 'consultaConfirmada' },
    ],
  }];
  const written = buildD1Usecases(payload);
  assert.equal(written.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field id is assigned by confirmarConsulta.'), true);
  assert.equal(written.normalizations.some(item => item.code === 'DERIVED_SELECTOR' && item.path === 'confirmarConsulta.id'), true);

  const nested = singleRouteRequest(
    'listConsulta',
    'consultas',
    'agendaClinica.consultas.qryListConsulta',
    'qry',
    `
      export interface ListConsultaInput { id: string; details: { id: string } }
      export interface ListConsultaOutput { id: string; }
      export const listConsultaRoute = "agendaClinica.consultas.qryListConsulta" as const;
    `,
  );
  const consulta = nested.entities.find(item => item.entityId === 'Consulta');
  assert.ok(consulta);
  consulta.fields.push({ name: 'details.id', type: 'uuid', derived: true });
  nested.contexts = [inputContext('listConsulta', 'agendaClinica.consultas.qryListConsulta', [
    { path: 'id', type: 'string', optional: false },
    { path: 'details.id', type: 'string', optional: false },
  ])];
  const homonym = buildD1Usecases(nested);
  assert.equal(homonym.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field details.id is assigned by listConsulta.'), true);
  assert.equal(homonym.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === 'listConsulta.id'), true);
  assert.equal(homonym.problems.some(item => item.message.includes('Derived field id is assigned')), false);

  const versioned = requestOf(realContractSources(), 'listConsulta');
  const listed = versioned.entities.find(item => item.entityId === 'Consulta');
  assert.ok(listed);
  listed.fields.push({ name: 'version', type: 'integer', derived: true });
  versioned.contexts = [inputContext('listConsulta', versioned.routes[0].route, [
    { path: 'id', type: 'string', optional: false },
    { path: 'version', type: 'number', optional: false },
  ])];
  const concurrency = buildD1Usecases(versioned);
  assert.equal(concurrency.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field version is assigned by listConsulta.'), true);
  assert.equal(concurrency.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === 'listConsulta.id'), true);
  assert.equal(concurrency.normalizations.some(item => item.code === 'DERIVED_CONCURRENCY'), false);

  const updateVersion = requestOf(realContractSources(), 'updateProfissional');
  const professional = updateVersion.entities.find(item => item.entityId === 'Profissional');
  assert.ok(professional);
  const versionField = professional.fields.find(field => field.name === 'version');
  if (versionField) versionField.derived = true;
  else professional.fields.push({ name: 'version', type: 'integer', derived: true });
  updateVersion.contexts = [inputContext('updateProfissional', updateVersion.routes[0].route, [
    { path: 'id', type: 'string', optional: false },
    { path: 'version', type: 'number', optional: false },
  ])];
  const token = buildD1Usecases(updateVersion);
  assert.equal(token.problems.some(item => item.code === 'DERIVED_EDITABLE' && /version/.test(item.message)), false);
  assert.equal(token.normalizations.some(item => item.code === 'DERIVED_CONCURRENCY' && item.path === 'updateProfissional.version'), true);
  assert.equal(token.normalizations.some(item => item.code === 'DERIVED_SELECTOR' && item.path === 'updateProfissional.id'), true);

  const suffix = requestOf(realContractSources(), 'listConsulta');
  const entity = suffix.entities.find(item => item.entityId === 'Consulta');
  assert.ok(entity);
  const patientId = entity.fields.find(field => field.name === 'patientId');
  if (patientId) patientId.derived = true;
  else entity.fields.push({ name: 'patientId', type: 'uuid', derived: true });
  const byName = buildD1Usecases(suffix);
  assert.equal(byName.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field patientId is assigned by listConsulta.'), true);
  assert.equal(byName.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === 'listConsulta.id'), true);

  const unknown = singleRouteRequest(
    'searchConsulta',
    'consultas',
    'agendaClinica.consultas.qryListConsulta',
    'qry',
    `
      export interface ListConsultaInput { id: string; }
      export interface ListConsultaOutput { id: string; }
      export const listConsultaRoute = "agendaClinica.consultas.qryListConsulta" as const;
    `,
  );
  unknown.usecases[0].usecaseId = 'searchConsulta';
  unknown.usecases[0].operation = 'search';
  unknown.usecases[0].routes = ['agendaClinica.consultas.qryListConsulta'];
  unknown.routes[0].usecaseRef = 'searchConsulta';
  unknown.plans = [{ usecaseId: 'searchConsulta', steps: [{ kind: 'context', source: 'ctx' }, { kind: 'port', call: 'list', port: 'ConsultaRepository' }] }];
  const ambiguous = buildD1Usecases(unknown);
  assert.equal(ambiguous.problems.some(item => item.code === 'DERIVED_AMBIGUOUS' && item.path === 'searchConsulta'), true);
  assert.match(ambiguous.problems.find(item => item.code === 'DERIVED_AMBIGUOUS')?.message || '', /operation search does not classify it/);
});

void test('a nested derived list field is a filter, a transition id is a selector, and a derived write stays refused', () => {
  const contracts = realContractSources();
  const paciente = contracts.find(item => item.path.endsWith('/pacientes.defs.ts'));
  const profissional = contracts.find(item => item.path.endsWith('/profissionais.defs.ts'));
  const recepcionista = contracts.find(item => item.path.endsWith('/dados_recepcionista.defs.ts'));
  assert.ok(paciente && profissional && recepcionista);
  assert.match(paciente.source, /export interface ListPacienteInput[\s\S]*?"status": "Active"/);
  assert.match(profissional.source, /export interface ListProfissionalInput[\s\S]*?"status": "Active"/);
  assert.match(recepcionista.source, /export interface ListRecepcionistaInput[\s\S]*?"status": "Active"/);

  for (const usecaseId of ['listPaciente', 'listProfissional', 'listRecepcionista']) {
    const request = requestOf(contracts, usecaseId);
    const entity = request.entities.find(item => item.entityId === entityOf(usecaseId));
    assert.ok(entity);
    for (const name of ['details.identification.status', 'details.identification.subtype']) {
      entity.fields.push({ name, type: 'enum', derived: true });
    }
    const route = request.routes[0];
    assert.ok(route);
    request.contexts = [inputContext(usecaseId, route.route, [
      { path: 'id', type: 'string', optional: false },
      { path: 'details', type: 'object', optional: false },
      { path: 'details.identification.status', type: 'string', optional: false },
      { path: 'details.identification.subtype', type: 'string', optional: false },
    ])];
    const build = buildD1Usecases(request);
    assert.equal(build.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, `${usecaseId}: ${build.problems.map(item => item.message).join('; ')}`);
    assert.equal(build.ok, true, `${usecaseId}: ${build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; ')}`);
    assert.equal(build.emit.length, 1, usecaseId);
    assert.equal(build.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === `${usecaseId}.details.identification.status`), true, usecaseId);
    assert.equal(build.normalizations.some(item => item.code === 'DERIVED_FILTER' && item.path === `${usecaseId}.details.identification.subtype`), true, usecaseId);
    const data = build.emit[0]?.definition.data as { uses?: Array<{ path: string; role: string; source: string }> };
    assert.equal(data.uses?.some(use => use.path === 'details.identification.status' && use.role === 'filter' && use.source === 'input'), true, usecaseId);
    const tool = usecaseTool(closedFromRequest(request, request.usecases[0], request.contexts[0]));
    assert.deepEqual(stepProperty(tool, 'context', 'source').enum, ['ctx'], usecaseId);
  }

  const transition = requestOf(contracts, 'confirmarConsulta');
  const transitionRoute = transition.routes[0];
  assert.ok(transitionRoute);
  transition.contexts = [inputContext('confirmarConsulta', transitionRoute.route, [
    { path: 'id', type: 'string', optional: false },
  ])];
  const selected = buildD1Usecases(transition);
  assert.equal(selected.problems.some(item => item.code === 'DERIVED_EDITABLE'), false, selected.problems.map(item => item.message).join('; '));
  assert.equal(selected.ok, true, selected.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  assert.equal(selected.emit.length, 1);
  assert.equal(selected.normalizations.some(item => item.code === 'DERIVED_SELECTOR' && item.path === 'confirmarConsulta.id'), true);
  const transitionTool = usecaseTool(closedFromRequest(transition, transition.usecases[0], transition.contexts[0]));
  assert.deepEqual(stepProperty(transitionTool, 'context', 'source').enum, ['ctx']);
  assert.deepEqual(stepProperty(transitionTool, 'transition', 'payload').const, []);

  const written = requestOf(contracts, 'confirmarConsulta');
  const plan = written.plans[0];
  assert.ok(plan);
  written.plans = [{
    usecaseId: 'confirmarConsulta',
    steps: plan.steps.map(step => step.kind === 'transition' ? { ...step, payload: ['id'] } : step),
  }];
  const assigned = buildD1Usecases(written);
  assert.equal(assigned.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field id is assigned by confirmarConsulta.'), true);
  assert.equal(assigned.emit.length, 0);

  const created = buildD1Usecases(singleRouteRequest(
    'createConsulta',
    'consultas',
    'agendaClinica.consultas.cmdCreateConsulta',
    'cmd',
    `
      export interface CreateConsultaInput { id: string; patientId: string; }
      export interface CreateConsultaOutput { id: string; }
      export const createConsultaRoute = "agendaClinica.consultas.cmdCreateConsulta" as const;
    `,
  ));
  assert.equal(created.problems.some(item => item.code === 'DERIVED_EDITABLE' && item.message === 'Derived field id is assigned by createConsulta.'), true);
  assert.equal(created.emit.length, 0);

  const authority = requestOf(contracts, 'createProfissional');
  const authorityPlan = authority.plans[0];
  assert.ok(authorityPlan);
  authority.plans = [{
    usecaseId: 'createProfissional',
    steps: [...authorityPlan.steps, { kind: 'context', source: 'input' }],
  }];
  const fromInput = buildD1Usecases(authority);
  assert.equal(fromInput.problems.some(item => item.code === 'ACTOR_FROM_INPUT'), true);
  assert.equal(fromInput.emit.length, 0);
});

function stepProperty(tool: ReturnType<typeof usecaseTool>, kind: string, key: string): { enum?: unknown[]; const?: unknown } {
  const parameters = tool.function.parameters;
  assert.ok(parameters);
  const steps = (parameters.properties as { steps?: { items?: { anyOf?: unknown[] } } }).steps;
  const found = steps?.items?.anyOf?.find(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const props = (item as { properties?: { kind?: { const?: unknown } } }).properties;
    return props?.kind?.const === kind;
  });
  assert.ok(found && typeof found === 'object' && !Array.isArray(found), kind);
  const props = (found as { properties?: Record<string, unknown> }).properties;
  const value = props?.[key];
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), key);
  return value as { enum?: unknown[]; const?: unknown };
}

function realContractSources(): D1UsecaseRequest['contracts'] {
  const names = readdirSync(REAL_CONTRACTS).filter(name => name.endsWith('.defs.txt')).sort();
  return names.map(name => {
    const pageId = name.replace(/\.defs\.txt$/, '');
    return {
      pageId,
      path: `l2/agendaClinica/web/contracts/${pageId}.defs.ts`,
      source: readFileSync(path.join(REAL_CONTRACTS, name), 'utf8'),
    };
  });
}

function requestForRealRoute(contract: D1UsecaseRequest['contracts'][number], route: string): D1UsecaseRequest {
  const tail = route.split('.').pop() || '';
  const kind = tail.startsWith('cmd') ? 'cmd' : 'qry';
  const raw = tail.slice(3);
  const usecaseId = `${raw.charAt(0).toLowerCase()}${raw.slice(1)}`;
  const request = coreUsecaseRequest();
  request.contracts = [contract];
  request.routes = [{ route, page: contract.pageId, kind, usecaseRef: usecaseId }];
  request.usecases = [{
    usecaseId,
    entity: entityOf(usecaseId),
    operation: operationOf(usecaseId),
    routes: [route],
    defPath: `l1/agendaClinica/layer_2_application/usecases/${usecaseId}.defs.ts`,
  }];
  request.plans = request.usecases.map(item => fixturePlan(request, item));
  return request;
}

function operationOf(usecaseId: string): string {
  if (usecaseId.startsWith('list')) return 'list';
  if (usecaseId.startsWith('create')) return 'create';
  if (usecaseId.startsWith('update')) return 'update';
  return 'transition';
}

function entityOf(usecaseId: string): string {
  if (usecaseId.toLowerCase().includes('paciente')) return 'Paciente';
  if (usecaseId.toLowerCase().includes('profissional')) return 'Profissional';
  if (usecaseId.toLowerCase().includes('recepcionista')) return 'Recepcionista';
  return 'Consulta';
}

function buildRealUsecase(contracts: D1UsecaseRequest['contracts'], usecaseId: string) {
  return buildD1Usecases(requestOf(contracts, usecaseId));
}

function requestOf(
  contracts: D1UsecaseRequest['contracts'],
  usecaseId: string,
  routes?: D1UsecaseRequest['routes'],
): D1UsecaseRequest {
  const selected = routes || routesOf(contracts, usecaseId);
  const request = coreUsecaseRequest();
  request.contracts = contracts;
  request.routes = selected;
  request.usecases = [{
    usecaseId,
    entity: entityOf(usecaseId),
    operation: operationOf(usecaseId),
    routes: selected.map(item => item.route),
    defPath: `l1/agendaClinica/layer_2_application/usecases/${usecaseId}.defs.ts`,
  }];
  request.plans = request.usecases.map(item => fixturePlan(request, item));
  return request;
}

function routesOf(contracts: D1UsecaseRequest['contracts'], usecaseId: string): D1UsecaseRequest['routes'] {
  const routes: D1UsecaseRequest['routes'] = [];
  for (const contract of contracts) {
    const matcher = /export const (\w+Route) = ["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(contract.source))) {
      const route = match[2];
      const tail = route.split('.').pop() || '';
      const raw = tail.slice(3);
      const id = `${raw.charAt(0).toLowerCase()}${raw.slice(1)}`;
      if (id !== usecaseId) continue;
      routes.push({ route, page: contract.pageId, kind: tail.startsWith('cmd') ? 'cmd' : 'qry', usecaseRef: usecaseId });
    }
  }
  return routes;
}

function inputContext(usecaseId: string, route: string, inputFields: D1UsecaseContext['routes'][number]['inputFields']): D1UsecaseContext {
  return {
    usecaseId,
    lifecycle: false,
    transition: null,
    capabilities: [],
    effectiveFields: [],
    routes: [{
      route,
      page: route.split('.')[1] || '',
      contractPath: `${route.split('.')[1] || 'page'}.defs.ts`,
      inputSymbol: 'Input',
      outputSymbol: 'Output',
      inputFields,
      outputFields: [],
      unbound: '',
      access: [],
    }],
    rules: [],
    rulePlan: [],
    pendingRules: [],
    portId: '',
    portMethods: [],
    effects: [],
    journeys: [],
    findings: [],
    sources: [],
  };
}

const R10: Record<string, D1WorkerStep[]> = {
  listConsulta: [
    { kind: 'context', source: 'ctx' },
    { kind: 'port', call: 'list', port: 'ConsultaRepository' },
  ],
  updateProfissional: [
    { kind: 'context', source: 'ctx' },
    { kind: 'mdm', namespace: 'agendaClinica', call: 'attach', entity: 'Profissional', capability: 'edit.platformFields' },
    { kind: 'transition', transitionId: 'agendaClinica.dados_profissional.cmdUpdateProfissional', payload: [] },
    { kind: 'transition', transitionId: 'agendaClinica.dados_recepcionista.cmdUpdateProfissional', payload: [] },
  ],
};

function singleRouteRequest(usecaseId: string, pageId: string, route: string, kind: string, source: string): D1UsecaseRequest {
  const request = coreUsecaseRequest();
  request.contracts = [{ pageId, path: `${pageId}.defs.ts`, source }];
  request.routes = [{ route, page: pageId, kind, usecaseRef: usecaseId }];
  request.usecases = [{
    usecaseId,
    entity: entityOf(usecaseId),
    operation: operationOf(usecaseId),
    routes: [route],
    defPath: `l1/agendaClinica/layer_2_application/usecases/${usecaseId}.defs.ts`,
  }];
  request.plans = request.usecases.map(item => fixturePlan(request, item));
  return request;
}

function contractFields(contracts: D1UsecaseRequest['contracts'], route: string, direction: 'input' | 'output') {
  const pageId = route.split('.')[1] || '';
  const contract = contracts.find(item => item.pageId === pageId);
  assert.ok(contract, route);
  const ast = readContractAst(contract.source, contract.path);
  const binding = ast.bindings.find(item => item.route === route);
  assert.ok(binding, route);
  const symbolName = direction === 'input' ? binding.input : binding.output;
  const found = ast.symbols.filter(item => item.name === symbolName);
  assert.equal(found.length, 1, symbolName);
  let fields = found[0].fields;
  if (found[0].shape === 'array' && fields.length === 0 && found[0].element) {
    const inner = ast.symbols.filter(item => item.name === found[0].element);
    assert.equal(inner.length, 1, found[0].element);
    fields = inner[0].fields;
  }
  return fields;
}

function declaredOutputNames(contracts: D1UsecaseRequest['contracts'], route: string): string[] {
  return contractFields(contracts, route, 'output').map(field => field.name);
}

function declaredFieldType(
  contracts: D1UsecaseRequest['contracts'],
  route: string,
  direction: 'input' | 'output',
  name: string,
): string {
  const field = contractFields(contracts, route, direction).find(item => item.name === name);
  assert.ok(field, `${route} ${name}`);
  return field.type;
}
