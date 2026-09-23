/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/schemaSelection.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { D1_MDM_CALLS, D1_WORKER_KINDS } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import type { D1UsecaseRequest, D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { coreUsecaseRequest, fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import {
  catalogForOperation,
  closedFromRequest,
  parseWorkerReply,
  STEP_KEYS,
  usecaseTool,
  workerStepShape,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

const FACADE = D1_MDM_CALLS.join(', ');

void test('an empty catalog omits the branch and the prompt does not name it', () => {
  const closed = {
    portCalls: [],
    portIds: [],
    ruleIds: [],
    namespaces: [],
    entityIds: [],
    mdmCalls: [],
    capabilities: [],
    mdmPairs: [],
    transitionIds: [],
    payloadPaths: [],
    eventIds: [],
  };
  const tool = usecaseTool(closed);
  const shape = workerStepShape(closed);
  assert.deepEqual(kindsOf(tool), ['transaction', 'context']);
  assert.deepEqual(kindsIn(shape), kindsOf(tool));
  assert.equal(shape.includes('- transition:'), false);
  assert.equal(shape.includes('- effect:'), false);
  assert.equal(shape.includes('- port:'), false);
  assert.equal(shape.includes('- mdm:'), false);
  assert.equal(shape.includes(FACADE), false);
  assert.equal(fits(tool, { kind: 'transition', transitionId: 'confirmarConsulta', payload: [] }), false);
  assert.equal(fits(tool, { kind: 'effect', eventId: 'consultaConfirmada' }), false);
  assert.equal(fits(tool, { kind: 'port', call: 'list', port: 'ConsultaRepository' }), false);
  assert.equal(fits(tool, { kind: 'mdm', namespace: 'agendaClinica', call: 'update', entity: 'Profissional', capability: 'edit.platformFields' }), false);
  assert.equal(fits(tool, { kind: 'context', source: 'ctx' }), true);
  assertRequiredClosed(tool);
});

void test('a single allowed value stays required, and a nested payload is the only extra name', () => {
  const unitary = usecaseTool({
    portCalls: ['transition'],
    portIds: ['ConsultaRepository'],
    ruleIds: ['consultationTransitionFlow'],
    namespaces: [],
    entityIds: [],
    mdmPairs: [],
    transitionIds: ['confirmarConsulta'],
    payloadPaths: ['id'],
    eventIds: ['consultaConfirmada'],
  });
  const shape = workerStepShape({
    portCalls: ['transition'],
    portIds: ['ConsultaRepository'],
    ruleIds: ['consultationTransitionFlow'],
    namespaces: [],
    entityIds: [],
    mdmPairs: [],
    transitionIds: ['confirmarConsulta'],
    payloadPaths: ['id'],
    eventIds: ['consultaConfirmada'],
  });
  assert.deepEqual(enumOf(unitary, 'port', 'call'), ['transition']);
  assert.deepEqual(enumOf(unitary, 'transition', 'transitionId'), ['confirmarConsulta']);
  assert.deepEqual(enumOf(unitary, 'transition', 'payload'), ['id']);
  assert.deepEqual(enumOf(unitary, 'effect', 'eventId'), ['consultaConfirmada']);
  assert.equal(kindsOf(unitary).includes('mdm'), false);
  assert.equal(shape.includes(FACADE), false);
  assert.equal(shape.includes('payload: id'), true);
  assert.equal(shape.includes('- mdm:'), false);
  const one: Record<string, unknown> = { kind: 'transition', transitionId: 'confirmarConsulta', payload: ['id'] };
  assert.equal(fits(unitary, one), true);
  assert.equal(parseWorkerReply({ steps: [one] }).problems.length, 0);
  assert.equal(fits(unitary, { kind: 'transition', transitionId: 'registrarAtendimento', payload: ['id'] }), false);
  assert.equal(fits(unitary, { kind: 'transition', transitionId: 'confirmarConsulta', payload: ['notAField'] }), false);
  assert.equal(fits(unitary, { kind: 'port', call: 'create', port: 'ConsultaRepository' }), false);
  const transition = branchOf(unitary, 'transition');
  assert.deepEqual(transition.required, ['kind', 'transitionId', 'payload']);
  assert.equal(Object.hasOwn(transition, 'optional'), false);

  const nested = usecaseTool({
    portCalls: [],
    portIds: [],
    ruleIds: [],
    mdmPairs: [],
    namespaces: [],
    entityIds: [],
    eventIds: [],
    transitionIds: ['registrarAtendimento'],
    payloadPaths: ['id', 'details', 'details.attendanceNote'],
  });
  assert.deepEqual(enumOf(nested, 'transition', 'payload'), ['id', 'details', 'details.attendanceNote']);
  const note = { kind: 'transition', transitionId: 'registrarAtendimento', payload: ['details.attendanceNote'] };
  assert.equal(fits(nested, note), true);
  assert.equal(parseWorkerReply({ steps: [note] }).problems.length, 0);
  assert.equal(fits(nested, { kind: 'transition', transitionId: 'registrarAtendimento', payload: ['details.attendanceNote', 'notAField'] }), false);
  assert.equal(workerStepShape({
    portCalls: [],
    portIds: [],
    ruleIds: [],
    mdmPairs: [],
    namespaces: [],
    entityIds: [],
    eventIds: [],
    transitionIds: ['registrarAtendimento'],
    payloadPaths: ['id', 'details', 'details.attendanceNote'],
  }).includes('details.attendanceNote'), true);

  const none = usecaseTool({
    transitionIds: ['registrarFalta'],
    payloadPaths: [],
    portCalls: [],
    portIds: [],
    ruleIds: [],
    eventIds: [],
    mdmPairs: [],
    namespaces: [],
    entityIds: [],
  });
  const payload = propertyOf(branchOf(none, 'transition'), 'payload');
  assert.deepEqual(payload.const, []);
  assert.equal(fits(none, { kind: 'transition', transitionId: 'registrarFalta', payload: [] }), true);
  assert.equal(fits(none, { kind: 'transition', transitionId: 'registrarFalta', payload: ['id'] }), false);
});

void test('mdm branches are the binding pairs, not the facade catalog', () => {
  const closed = {
    portCalls: [] as string[],
    portIds: [] as string[],
    ruleIds: [] as string[],
    namespaces: ['agendaClinica'],
    entityIds: ['Profissional'],
    mdmPairs: [
      { call: 'get', capability: 'read.byId' },
      { call: 'findByDocument', capability: 'locate.byDocument' },
      { call: 'listByType', capability: 'locate.byName' },
      { call: 'listByType', capability: 'locate.byTag' },
    ],
    transitionIds: [] as string[],
    payloadPaths: [] as string[],
    eventIds: [] as string[],
  };
  const tool = usecaseTool(closed);
  const shape = workerStepShape(closed);
  assert.equal(kindsOf(tool).includes('transition'), false);
  assert.equal(kindsOf(tool).includes('port'), false);
  assert.equal(kindsOf(tool).includes('effect'), false);
  assert.equal(shape.includes(FACADE), false);
  assert.equal(shape.includes('call get, capability read.byId'), true);
  assert.equal(shape.includes('call update'), false);
  assert.equal(shape.includes('- transition:'), false);
  const read = { kind: 'mdm', namespace: 'agendaClinica', call: 'get', entity: 'Profissional', capability: 'read.byId' };
  const crossed = { kind: 'mdm', namespace: 'agendaClinica', call: 'get', entity: 'Profissional', capability: 'locate.byName' };
  const update = { kind: 'mdm', namespace: 'agendaClinica', call: 'update', entity: 'Profissional', capability: 'edit.platformFields' };
  const otherNamespace = { kind: 'mdm', namespace: 'otherModule', call: 'get', entity: 'Profissional', capability: 'read.byId' };
  const otherEntity = { kind: 'mdm', namespace: 'agendaClinica', call: 'get', entity: 'Paciente', capability: 'read.byId' };
  assert.equal(fits(tool, read), true);
  assert.equal(parseWorkerReply({ steps: [read] }).problems.length, 0);
  assert.equal(fits(tool, crossed), false);
  assert.equal(fits(tool, update), false);
  assert.equal(fits(tool, otherNamespace), false);
  assert.equal(fits(tool, otherEntity), false);
  assert.equal(parseWorkerReply({ steps: [update] }).problems.length, 0);
  assert.equal(parseWorkerReply({ steps: [{ ...read, call: 'attach' }] }).problems[0]?.code, 'INVENTED_OPERATION');
  assertRequiredClosed(tool);

  const several = usecaseTool({
    portCalls: ['create', 'list'],
    portIds: ['ConsultaRepository'],
    ruleIds: ['one', 'two'],
    transitionIds: [],
    eventIds: [],
    mdmPairs: [],
    namespaces: [],
    entityIds: [],
  });
  assert.deepEqual(enumOf(several, 'port', 'call'), ['create', 'list']);
  assert.deepEqual(enumOf(several, 'rule', 'ruleId'), ['one', 'two']);
  assert.equal(fits(several, { kind: 'port', call: 'list', port: 'ConsultaRepository' }), true);
  assert.equal(fits(several, { kind: 'port', call: 'transition', port: 'ConsultaRepository' }), false);
  assert.equal(fits(several, { kind: 'port', call: 'list', port: 'OtherRepository' }), false);
});

void test('the operation catalog keeps one port method and drops a repository on an MDM role', () => {
  const list = catalogForOperation({
    operation: 'list',
    entityId: 'Consulta',
    storageTarget: 'moduleDatabase',
    namespace: '',
    portId: 'ConsultaRepository',
    portMethods: ['create', 'list', 'transition'],
    ruleIds: [],
    eventIds: [],
    transitionId: '',
    payloadPaths: ['id'],
    mdmPairs: [],
  });
  assert.deepEqual(list.portCalls, ['list']);
  assert.deepEqual(list.portIds, ['ConsultaRepository']);
  assert.deepEqual(list.transitionIds, []);
  assert.equal(kindsOf(usecaseTool(list)).includes('transition'), false);
  assert.equal(fits(usecaseTool(list), { kind: 'port', call: 'create', port: 'ConsultaRepository' }), false);

  const role = catalogForOperation({
    operation: 'update',
    entityId: 'Profissional',
    storageTarget: 'mdm',
    namespace: 'agendaClinica',
    portId: 'ProfissionalRepository',
    portMethods: ['update'],
    ruleIds: [],
    eventIds: [],
    transitionId: '',
    payloadPaths: [],
    mdmPairs: [{ call: 'update', capability: 'edit.platformFields' }],
  });
  assert.deepEqual(role.portCalls, []);
  assert.deepEqual(role.portIds, []);
  assert.deepEqual(role.mdmPairs, [{ call: 'update', capability: 'edit.platformFields' }]);
  const tool = usecaseTool(role);
  assert.equal(kindsOf(tool).includes('port'), false);
  assert.equal(kindsOf(tool).includes('transition'), false);
  assert.equal(fits(tool, { kind: 'mdm', namespace: 'agendaClinica', call: 'update', entity: 'Profissional', capability: 'edit.platformFields' }), true);
  assert.equal(fits(tool, { kind: 'mdm', namespace: 'agendaClinica', call: 'attachRole', entity: 'Profissional', capability: 'edit.platformFields' }), false);
  assert.equal(workerStepShape(role).includes(FACADE), false);
});

void test('a fixture plan fits the schema, and an incompatible call or id is refused by the schema and the gate', () => {
  const request = coreUsecaseRequest();
  for (const usecase of request.usecases) {
    const closed = closedFromRequest(request, usecase);
    const tool = usecaseTool(closed);
    const shape = workerStepShape(closed);
    assert.deepEqual(kindsIn(shape), kindsOf(tool), usecase.usecaseId);
    assert.equal(shape.includes(FACADE), false, usecase.usecaseId);
    const steps = fixturePlan(request, usecase).steps;
    for (const step of steps) {
      assert.equal(fits(tool, step as unknown as Record<string, unknown>), true, `${usecase.usecaseId} ${JSON.stringify(step)}`);
    }
    assert.equal(parseWorkerReply({ steps }).problems.length, 0, usecase.usecaseId);
    if (usecase.operation !== 'transition') {
      assert.equal(kindsOf(tool).includes('transition'), false, usecase.usecaseId);
      assert.equal(shape.includes('- transition:'), false, usecase.usecaseId);
    }
    if (usecase.entity !== 'Consulta') {
      assert.equal(kindsOf(tool).includes('port'), false, usecase.usecaseId);
    }
  }

  const update = one(request, 'updateProfissional');
  const updateTool = usecaseTool(closedFromRequest(update, update.usecases[0]));
  const valid = fixturePlan(update, update.usecases[0]).steps;
  const accepted = buildD1Usecases({ ...update, plans: [{ usecaseId: 'updateProfissional', steps: valid }], llmCalls: 1 });
  assert.equal(accepted.ok, true, accepted.problems.map(item => item.message).join('; '));
  const invented = { kind: 'transition' as const, transitionId: 'agendaClinica.dados_profissional.cmdUpdateProfissional', payload: [] as string[] };
  assert.equal(fits(updateTool, invented), false);
  const refusedTransition = buildD1Usecases({ ...update, plans: [{ usecaseId: 'updateProfissional', steps: [...valid, invented] }], llmCalls: 1 });
  assert.equal(refusedTransition.problems.some(item => item.code === 'INVALID_TRANSITION'), true);

  const list = one(request, 'listProfissional');
  const listTool = usecaseTool(closedFromRequest(list, list.usecases[0]));
  const crossed: D1WorkerStep = { kind: 'mdm', namespace: 'agendaClinica', call: 'update', entity: 'Profissional', capability: 'edit.platformFields' };
  assert.equal(fits(listTool, crossed), false);
  const refusedCall = buildD1Usecases({
    ...list,
    plans: [{ usecaseId: 'listProfissional', steps: [{ kind: 'context', source: 'ctx' }, crossed] }],
    llmCalls: 1,
  });
  assert.equal(refusedCall.problems.some(item => item.code === 'MDM_CALL_INCOMPATIBLE'), true);
  assert.equal(workerStepShape(closedFromRequest(list, list.usecases[0])).includes('call update'), false);

  const open = workerStepShape();
  for (const kind of D1_WORKER_KINDS) assert.equal(open.includes(`- ${kind}:`), true, kind);
  assert.equal(open.includes(FACADE), true);
  assert.deepEqual(enumOf(usecaseTool(), 'context', 'source'), ['ctx']);
  assert.equal(fits(usecaseTool(), { kind: 'context', source: 'input' }), false);
});

void test('authority is ctx on every operation, and the prompt names that source', () => {
  const request = coreUsecaseRequest();
  for (const usecase of request.usecases) {
    const closed = closedFromRequest(request, usecase);
    const tool = usecaseTool(closed);
    assert.deepEqual(closed.sources, ['ctx'], usecase.usecaseId);
    assert.deepEqual(enumOf(tool, 'context', 'source'), ['ctx'], usecase.usecaseId);
    assert.equal(fits(tool, { kind: 'context', source: 'ctx' }), true, usecase.usecaseId);
    assert.equal(fits(tool, { kind: 'context', source: 'input' }), false, usecase.usecaseId);
    assert.equal(workerStepShape(closed).includes('source: ctx'), true, usecase.usecaseId);
    assert.equal(workerStepShape(closed).includes('source: ctx, input'), false, usecase.usecaseId);
  }
});

void test('a boundary the schema offers is a boundary the gate accepts', () => {
  const request = coreUsecaseRequest();
  const known = ['local', 'external'];
  for (const usecase of request.usecases) {
    const closed = closedFromRequest(request, usecase);
    const tool = usecaseTool(closed);
    const offered = offeredBoundaries(tool);
    assert.deepEqual(offered, [...(closed.boundaries || [])], usecase.usecaseId);
    const probed = [...new Set([...known, ...offered])];
    for (const boundary of probed) {
      const inSchema = offered.includes(boundary);
      const admitted = !boundaryRefused(request, usecase.usecaseId, boundary);
      assert.equal(inSchema, admitted, `${usecase.usecaseId} ${boundary}`);
    }
    if (offered.length) {
      assert.equal(workerStepShape(closed).includes(`boundary: ${offered.join(', ')}`), true, usecase.usecaseId);
      assert.equal(workerStepShape(closed).includes('external'), false, usecase.usecaseId);
    } else {
      assert.equal(workerStepShape(closed).includes('- transaction:'), false, usecase.usecaseId);
    }
    assert.equal(fits(tool, { kind: 'transaction', boundary: 'external' }), false, usecase.usecaseId);
  }
  assert.deepEqual(enumOf(usecaseTool(), 'transaction', 'boundary'), ['local']);
  assert.equal(fits(usecaseTool(), { kind: 'transaction', boundary: 'local' }), true);
  assert.equal(fits(usecaseTool(), { kind: 'transaction', boundary: 'external' }), false);
});

function offeredBoundaries(tool: ReturnType<typeof usecaseTool>): string[] {
  if (!kindsOf(tool).includes('transaction')) return [];
  return enumOf(tool, 'transaction', 'boundary');
}

/** True when the gate refuses this boundary on the fixture plan. Schema and gate must agree. */
function boundaryRefused(request: D1UsecaseRequest, usecaseId: string, boundary: string): boolean {
  const scoped = one(structuredClone(request), usecaseId);
  const usecase = scoped.usecases[0];
  assert.ok(usecase);
  const steps: D1WorkerStep[] = [
    ...fixturePlan(scoped, usecase).steps,
    { kind: 'transaction', boundary },
  ];
  scoped.plans = [{ usecaseId, steps }];
  const build = buildD1Usecases(scoped);
  return build.problems.some(item =>
    item.path === usecaseId
    && (item.code === 'EXTERNAL_ATOMICITY' || item.code === 'MDM_NOT_ATOMIC' || item.code === 'TRANSACTION_BOUNDARY'));
}

function one(request: D1UsecaseRequest, usecaseId: string): D1UsecaseRequest {
  return {
    ...request,
    usecases: request.usecases.filter(item => item.usecaseId === usecaseId),
    routes: request.routes.filter(item => item.usecaseRef === usecaseId),
    plans: request.plans.filter(item => item.usecaseId === usecaseId),
  };
}

function kindsOf(tool: ReturnType<typeof usecaseTool>): string[] {
  const kinds: string[] = [];
  for (const branch of anyOf(tool)) {
    const kind = kindOf(branch);
    if (kind && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds;
}

function kindsIn(shape: string): string[] {
  return shape.split('\n').flatMap(line => {
    const match = line.match(/^- (\w+): /);
    return match ? [match[1]] : [];
  });
}

function enumOf(tool: ReturnType<typeof usecaseTool>, kind: string, key: string): string[] {
  const schema = propertyOf(branchOf(tool, kind), key);
  if (Array.isArray(schema.enum)) return schema.enum.map(String);
  const items = schema.items as { enum?: unknown[] } | undefined;
  if (items && Array.isArray(items.enum)) return items.enum.map(String);
  return [];
}

function branchOf(tool: ReturnType<typeof usecaseTool>, kind: string): Record<string, unknown> {
  const found = anyOf(tool).find(branch => kindOf(branch) === kind);
  assert.ok(found, kind);
  return found;
}

function propertyOf(branch: Record<string, unknown>, key: string): { enum?: unknown[]; const?: unknown; items?: unknown; type?: unknown } {
  const props = branch.properties;
  assert.ok(props && typeof props === 'object' && !Array.isArray(props));
  const value = (props as Record<string, unknown>)[key];
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), key);
  return value as { enum?: unknown[]; const?: unknown; items?: unknown; type?: unknown };
}

function anyOf(tool: ReturnType<typeof usecaseTool>): Array<Record<string, unknown>> {
  const parameters = tool.function.parameters;
  assert.ok(parameters);
  assert.equal(Object.hasOwn(parameters, 'oneOf'), false);
  const steps = (parameters.properties as { steps?: { items?: { anyOf?: unknown; oneOf?: unknown } } }).steps;
  assert.equal(Object.hasOwn(steps?.items || {}, 'oneOf'), false);
  const found = steps?.items?.anyOf;
  assert.ok(Array.isArray(found));
  return found.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function kindOf(branch: Record<string, unknown>): string {
  const props = branch.properties as { kind?: { const?: unknown } } | undefined;
  return typeof props?.kind?.const === 'string' ? props.kind.const : '';
}

function fits(tool: ReturnType<typeof usecaseTool>, step: object): boolean {
  const record = step as Record<string, unknown>;
  return anyOf(tool).some(branch => {
    const props = branch.properties;
    const required = branch.required;
    if (!props || typeof props !== 'object' || Array.isArray(props) || !Array.isArray(required)) return false;
    const properties = props as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.some(key => !Object.hasOwn(properties, key))) return false;
    if (required.some(key => typeof key !== 'string' || !Object.hasOwn(record, key))) return false;
    return required.every(key => typeof key === 'string' && valueFits(properties[key], record[key]));
  });
}

function valueFits(schema: unknown, value: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
  const node = schema as { const?: unknown; enum?: unknown[]; type?: unknown; items?: unknown };
  if (Object.hasOwn(node, 'const')) return JSON.stringify(value) === JSON.stringify(node.const);
  if (Array.isArray(node.enum)) return node.enum.some(item => JSON.stringify(item) === JSON.stringify(value));
  if (node.type === 'array') {
    if (!Array.isArray(value)) return false;
    return node.items ? value.every(item => valueFits(node.items, item)) : true;
  }
  if (node.type === 'string') return typeof value === 'string' && value.length > 0;
  return false;
}

function assertRequiredClosed(tool: ReturnType<typeof usecaseTool>): void {
  for (const branch of anyOf(tool)) {
    assert.equal(branch.additionalProperties, false);
    const props = branch.properties as Record<string, unknown>;
    const required = branch.required as string[];
    const kind = kindOf(branch);
    assert.deepEqual([...required].sort(), Object.keys(props).sort(), kind);
    assert.deepEqual([...required].sort(), [...STEP_KEYS[kind as (typeof D1_WORKER_KINDS)[number]]].sort(), kind);
    for (const schema of Object.values(props)) {
      const node = schema as { type?: unknown };
      if (Array.isArray(node.type)) assert.equal(node.type.includes('null'), false, kind);
    }
  }
}
