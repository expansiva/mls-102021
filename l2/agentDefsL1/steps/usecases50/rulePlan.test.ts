/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import type { D1UsecaseContext, D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { readUsecaseFidelity, type FidelityFile } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import {
  enforcedRuleIds,
  planRuleApplicability,
  rulePlanForUsecase,
  type RulePlanInput,
  type RulePlanTransition,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLINIC = path.resolve(HERE, '../../../../../mls-102047/l4/agendaClinica');
const OWNER_ROUTE = 'sample.owner.qryListSlot';
const CLERK_ROUTE = 'sample.clerk.qryListSlot';
const CLOSE_ROUTE = 'sample.owner.cmdCloseSlot';
const CREATE_ROUTE = 'sample.clerk.cmdCreateSlot';

/**
 * These names are not the agenda ids. The shape is: one rule on every
 * transition, one rule on a single transition, one rule on no transition,
 * plus a unique key. Renaming the ids must not change the skeleton.
 */
function shape(ids: { flow: string; own: string; key: string }): RulePlanInput {
  const transitions: RulePlanTransition[] = [
    { transitionId: 'moveSlot', by: ['clerk'], ruleRefs: [ids.flow], payload: [] },
    { transitionId: 'closeSlot', by: ['owner'], ruleRefs: [ids.flow, ids.own], payload: [] },
  ];
  return {
    moduleName: 'sample',
    entityId: 'Slot',
    usecaseId: 'listSlot',
    operation: 'list',
    rules: [ids.flow, ids.own, ids.key].map(ruleId => ({
      ruleId,
      owner: 'module' as const,
      source: 'l4/sample/rules.defs.ts',
      text: `Sentence for ${ruleId}.`,
    })),
    transitions,
    uniqueKeys: [['slot']],
    capabilities: ['uniqueKey'],
    routes: [
      { route: OWNER_ROUTE, contractPath: 'l2/sample/web/contracts/owner.defs.ts', grants: [{ grantId: 'gOwner', actorRef: 'owner', scope: 'own' }] },
      { route: CLERK_ROUTE, contractPath: 'l2/sample/web/contracts/clerk.defs.ts', grants: [{ grantId: 'gClerk', actorRef: 'clerk', scope: 'organization' }] },
    ],
    mdmMethods: [],
  };
}

function skeleton(rows: ReturnType<typeof planRuleApplicability>, ids: { flow: string; own: string; key: string }): string[] {
  const rename = (ruleId: string) => ruleId === ids.flow ? 'flow' : ruleId === ids.own ? 'own' : ruleId === ids.key ? 'key' : ruleId;
  return rows.map(row => {
    const origin = row.origin.replaceAll(ids.flow, 'flow').replaceAll(ids.own, 'own').replaceAll(ids.key, 'key');
    return `${rename(row.ruleId)}|${row.enforcement}|${row.gap}|${row.consumer}|${origin}`;
  });
}

void test('renamed ids keep the same applicability, and the old CRUD copy does not', () => {
  const first = { flow: 'flowRule', own: 'ownRule', key: 'keyRule' };
  const second = { flow: 'moved', own: 'scoped', key: 'single' };
  const listed = planRuleApplicability(shape(first));
  const renamed = planRuleApplicability({ ...shape(second), rules: shape(second).rules });
  assert.deepEqual(skeleton(renamed, second), skeleton(listed, first));
  assert.deepEqual(enforcedRuleIds(listed), []);
  assert.equal(listed.some(row => row.ruleId === first.key), false);
  assert.equal(listed.some(row => row.consumer.startsWith('route:')), false);
  const listedFlow = listed.find(row => row.ruleId === first.flow);
  const listedOwn = listed.find(row => row.ruleId === first.own);
  assert.ok(listedFlow && listedOwn);
  assert.equal(listedFlow.gap, 'APPLICABILITY_UNDECLARED');
  assert.equal(listedFlow.consumer, 'operation:list');
  assert.equal(listedFlow.enforcement, 'pending');
  assert.deepEqual(shapeOf(listedOwn), shapeOf(listedFlow));

  const created = planRuleApplicability({ ...shape(first), usecaseId: 'createSlot', operation: 'create' });
  assert.deepEqual(enforcedRuleIds(created), []);
  const storage = created.filter(row => row.ruleId === '' && row.origin.endsWith('#uniqueKeys'));
  assert.equal(storage.length, 1);
  assert.equal(storage[0]?.enforcement, 'local');
  assert.equal(storage[0]?.consumer, 'operation:create');
  const unbound = created.find(row => row.ruleId === first.key);
  assert.equal(unbound?.enforcement, 'pending');
  assert.equal(unbound?.gap, 'RULE_UNBOUND');
  assert.equal(created.some(row => row.ruleId === first.key && row.enforcement === 'local'), false);

  const closed = planRuleApplicability({
    ...shape(first),
    usecaseId: 'closeSlot',
    operation: 'transition',
    routes: [{ route: CLOSE_ROUTE, contractPath: 'l2/sample/web/contracts/owner.defs.ts', grants: [] }],
  });
  assert.deepEqual(enforcedRuleIds(closed).sort(), [first.flow, first.own].sort());
  assert.equal(closed.some(row => row.ruleId === first.key), false);
});

function shapeOf(row: { enforcement: string; gap: string; consumer: string; origin: string }): { enforcement: string; gap: string; consumer: string; origin: string } {
  return { enforcement: row.enforcement, gap: row.gap, consumer: row.consumer, origin: row.origin };
}

void test('an extra unbound rule does not change another row, and a catalog sentence is not a method', () => {
  const base = shape({ flow: 'flowRule', own: 'ownRule', key: 'minAge' });
  const write = { usecaseId: 'createSlot', operation: 'create' };
  const alone = planRuleApplicability({ ...base, ...write });
  const withPeer = planRuleApplicability({
    ...base,
    ...write,
    rules: [
      ...base.rules,
      { ruleId: 'uniq', owner: 'module' as const, source: 'l4/sample/rules.defs.ts', text: 'Another constraint.' },
    ],
  });
  const withStranger = planRuleApplicability({
    ...base,
    ...write,
    rules: [
      ...base.rules,
      { ruleId: 'uniq', owner: 'module' as const, source: 'l4/sample/rules.defs.ts', text: 'Another constraint.' },
      { ruleId: 'alien', owner: 'module' as const, source: 'l4/sample/rules.defs.ts', text: 'Unrelated.' },
    ],
  });
  const line = (rows: ReturnType<typeof planRuleApplicability>, ruleId: string) => rows.find(row => row.ruleId === ruleId);
  const storageOf = (rows: ReturnType<typeof planRuleApplicability>) => rows.find(row => row.ruleId === '');
  assert.equal(line(alone, 'minAge')?.enforcement, 'pending');
  assert.equal(line(alone, 'minAge')?.gap, 'RULE_UNBOUND');
  assert.notEqual(line(alone, 'minAge')?.enforcement, 'local');
  assert.deepEqual(line(alone, 'minAge'), line(withPeer, 'minAge'));
  assert.deepEqual(line(withPeer, 'minAge'), line(withStranger, 'minAge'));
  assert.deepEqual(storageOf(alone), storageOf(withPeer));
  assert.deepEqual(storageOf(withPeer), storageOf(withStranger));
  assert.equal(line(withPeer, 'uniq')?.enforcement, 'pending');
  assert.equal(line(withPeer, 'uniq')?.gap, 'RULE_UNBOUND');
  assert.equal(alone.some(row => row.enforcement === 'local' && row.ruleId !== ''), false);
  assert.equal(withPeer.some(row => row.enforcement === 'local' && row.ruleId !== ''), false);
  assert.deepEqual(enforcedRuleIds(withPeer), []);

  const platformInput: RulePlanInput = {
    ...base,
    usecaseId: 'updateRole',
    operation: 'update',
    rules: [{
      ruleId: 'ruleForeign',
      owner: 'platform',
      source: '/_102034_/l4/ontology/mdm.defs.ts',
      text: 'Refuses a foreign key · engine · platform: ready',
    }],
    uniqueKeys: [],
    capabilities: [],
    mdmMethods: ['update'],
  };
  const platform = planRuleApplicability(platformInput);
  assert.equal(platform[0]?.enforcement, 'pending');
  assert.equal(platform[0]?.gap, 'DELEGATION_UNPROVEN');
  assert.deepEqual(enforcedRuleIds(platform), []);

  const delegated = planRuleApplicability({
    ...platformInput,
    rules: [{
      ruleId: 'ruleLookup',
      owner: 'platform',
      source: '/_102034_/l4/ontology/mdm.defs.ts',
      text: 'The facade method findByDocument fulfills this check.',
    }],
    mdmMethods: ['findByDocument', 'update'],
  });
  assert.equal(delegated[0]?.enforcement, 'pending');
  assert.equal(delegated[0]?.gap, 'DELEGATION_UNPROVEN');
  assert.equal(delegated.some(row => row.consumer.startsWith('method:')), false);
  assert.deepEqual(enforcedRuleIds(delegated), []);
});

void test('the gate keeps the prescribed set when the worker omits or adds a known rule', () => {
  const request = sampleRequest();
  const close = buildD1Usecases({
    ...request,
    usecases: request.usecases.filter(item => item.usecaseId === 'closeSlot'),
    plans: [{
      usecaseId: 'closeSlot',
      steps: [
        { kind: 'context', source: 'ctx' },
        { kind: 'port', call: 'transition', port: 'SlotRepository' },
        { kind: 'rule', ruleId: 'flowRule' },
        { kind: 'transition', transitionId: 'closeSlot', payload: [] },
      ],
    }],
  });
  assert.equal(close.ok, true, close.problems.map(item => `${item.code}: ${item.message}`).join('\n'));
  assert.equal(close.normalizations.some(item => item.code === 'RULE_RESTORED' && item.detail === 'ownRule'), true);
  const closeData = close.emit[0]?.definition.data as { rulesApplied: string[]; rulePlan: Array<{ ruleId: string; enforcement: string }> };
  assert.equal(closeData.rulesApplied.includes('ownRule'), true);
  assert.equal(closeData.rulesApplied.includes('flowRule'), true);
  assert.equal(closeData.rulePlan.some(row => row.ruleId === 'keyRule'), false);

  const listed = buildD1Usecases({
    ...request,
    usecases: request.usecases.filter(item => item.usecaseId === 'listSlot'),
    plans: [{
      usecaseId: 'listSlot',
      steps: [
        { kind: 'context', source: 'ctx' },
        { kind: 'port', call: 'list', port: 'SlotRepository' },
        { kind: 'rule', ruleId: 'keyRule' },
      ],
    }],
  });
  assert.equal(listed.ok, false);
  assert.equal(listed.problems.some(item => item.code === 'RULE_NOT_APPLICABLE' && item.message.includes('keyRule')), true);
  assert.equal(listed.emit.length, 0);

  const created = buildD1Usecases({
    ...request,
    usecases: request.usecases.filter(item => item.usecaseId === 'createSlot'),
    plans: [{
      usecaseId: 'createSlot',
      steps: [
        { kind: 'context', source: 'ctx' },
        { kind: 'port', call: 'create', port: 'SlotRepository' },
      ],
    }],
  });
  assert.equal(created.ok, true, created.problems.map(item => item.message).join('\n'));
  const createData = created.emit[0]?.definition.data as {
    rulesApplied: string[];
    rulePlan: Array<{ ruleId: string; enforcement: string; gap: string }>;
  };
  assert.deepEqual(createData.rulesApplied, []);
  assert.equal(createData.rulePlan.some(row => row.ruleId === '' && row.enforcement === 'local'), true);
  assert.equal(createData.rulePlan.some(row => row.ruleId === 'keyRule' && row.enforcement === 'pending' && row.gap === 'RULE_UNBOUND'), true);

  const clerk = contract('clerk', { [CLERK_ROUTE]: true, [CREATE_ROUTE]: false });
  const files = [...sampleFiles(), { path: clerk.path, text: clerk.source }];
  const source = renderOf(created);
  const fidelity = readUsecaseFidelity(source, files);
  assert.equal(fidelity.problems.length, 0, fidelity.problems.map(item => item.message).join('\n'));
  const parsed = parseRendered(source);
  assert.ok(parsed);
  const definition = parsed.definition as { data: Record<string, unknown> };
  definition.data.rulesApplied = ['keyRule', 'ownRule'];
  const tampered = renderDefinition(parsed.definition, parsed.pipeline);
  assert.equal('source' in tampered, true);
  if (!('source' in tampered)) return;
  const coverage = readUsecaseFidelity(tampered.source, files);
  assert.equal(coverage.problems.some(item => item.code === 'RULE_COVERAGE'), true);
  delete definition.data.rulePlan;
  const stripped = renderDefinition(parsed.definition, parsed.pipeline);
  assert.equal('source' in stripped, true);
  if (!('source' in stripped)) return;
  const missing = readUsecaseFidelity(stripped.source, files);
  assert.equal(missing.problems.some(item => item.code === 'RULE_COVERAGE'), true);
});

void test('agendaClinica sources keep the professional read and the schedule constraint apart', () => {
  const files = clinicFiles();
  const professional = 'agendaClinica.consultas_profissional.qryListConsulta';
  const reception = 'agendaClinica.consultas_recepcionista.qryListConsulta';
  const listed = clinicPlan(files, 'listConsulta', 'list', [
    { route: professional, contractPath: 'l2/agendaClinica/web/contracts/consultas_profissional.defs.ts' },
    { route: reception, contractPath: 'l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts' },
  ]);
  assert.deepEqual(enforcedRuleIds(listed), []);
  assert.equal(listed.some(row => row.ruleId === 'uniqueProfessionalSchedule'), false);
  assert.equal(listed.some(row => row.consumer.startsWith('route:')), false);
  const note = listed.find(row => row.ruleId === 'attendanceNoteRequired');
  const own = listed.find(row => row.ruleId === 'professionalOwnAppointment');
  assert.ok(note && own);
  assert.equal(note.gap, 'APPLICABILITY_UNDECLARED');
  assert.equal(note.enforcement, 'pending');
  assert.equal(note.consumer, 'operation:list');
  assert.deepEqual(shapeOf(note), shapeOf(own));
  assert.equal(listed.filter(row => row.ruleId === 'professionalOwnAppointment').length, 1);
  assert.equal(listed.filter(row => row.ruleId === 'attendanceNoteRequired').length, 1);
  assert.equal(listed.some(row => row.consumer === `route:${professional}` || row.consumer === `route:${reception}`), false);

  const created = clinicPlan(files, 'createConsulta', 'create', [
    { route: 'agendaClinica.consultas.cmdCreateConsulta', contractPath: 'l2/agendaClinica/web/contracts/consultas.defs.ts' },
  ]);
  assert.deepEqual(enforcedRuleIds(created), []);
  assert.equal(created.some(row => row.ruleId === '' && row.origin.endsWith('#uniqueKeys') && row.enforcement === 'local' && row.consumer === 'operation:create'), true);
  assert.equal(created.some(row => row.ruleId === 'uniqueProfessionalSchedule' && row.enforcement === 'pending' && row.gap === 'RULE_UNBOUND'), true);
  assert.equal(created.some(row => row.ruleId === 'professionalOwnAppointment'), false);

  const closed = clinicPlan(files, 'registrarAtendimento', 'transition', [
    { route: 'agendaClinica.agenda.cmdRegistrarAtendimento', contractPath: 'l2/agendaClinica/web/contracts/agenda.defs.ts' },
  ]);
  assert.deepEqual(
    enforcedRuleIds(closed).sort(),
    ['attendanceNoteRequired', 'consultationTransitionFlow', 'professionalOwnAppointment'].sort(),
  );
  assert.equal(closed.some(row => row.ruleId === 'uniqueProfessionalSchedule'), false);
});

function clinicPlan(
  files: FidelityFile[],
  usecaseId: string,
  operation: string,
  routes: Array<{ route: string; contractPath: string }>,
) {
  return rulePlanForUsecase({
    moduleName: 'agendaClinica',
    entityId: 'Consulta',
    usecaseId,
    operation,
    files,
    entity: { rules: [], transitions: [], namespace: '', storageTarget: 'moduleDatabase' },
    routes: routes.map(route => ({ ...route, grants: [] })),
  });
}

function clinicFiles(): FidelityFile[] {
  const read = (rel: string, logical: string) => ({ path: logical, text: readFileSync(path.join(CLINIC, rel), 'utf8') });
  return [
    read('ontology/Consulta.defs.ts', 'l4/agendaClinica/ontology/Consulta.defs.ts'),
    read('rules.defs.ts', 'l4/agendaClinica/rules.defs.ts'),
    read('access.defs.ts', 'l4/agendaClinica/access.defs.ts'),
    read('pool/l1/web/needs.json', 'l4/agendaClinica/pool/l1/web/needs.json'),
  ];
}

function renderOf(build: ReturnType<typeof buildD1Usecases>): string {
  const part = build.emit[0];
  if (!part) throw new Error('no emit');
  const rendered = renderDefinition(part.definition, part.pipeline);
  if ('issues' in rendered) throw new Error(rendered.issues.join('\n'));
  return rendered.source;
}

function sampleFiles(): FidelityFile[] {
  const ontology = {
    entityId: 'Slot',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    capabilities: { uniqueKey: 'One slot.' },
    rules: ['flowRule', 'ownRule', 'keyRule'],
    uniqueKeys: [['slot']],
    record: { fields: { id: { type: 'uuid', derived: true }, slot: { type: 'string' } } },
    transitions: [
      { transitionId: 'moveSlot', from: ['open'], to: 'moved', by: ['clerk'], ruleRefs: ['flowRule'], payload: [] },
      { transitionId: 'closeSlot', from: ['open'], to: 'closed', by: ['owner'], ruleRefs: ['flowRule', 'ownRule'], payload: [] },
    ],
  };
  const rules = { rules: { flowRule: 'Moves.', ownRule: 'Owns.', keyRule: 'One slot.' } };
  const access = {
    grants: [
      { grantId: 'gOwner', actorRef: 'owner', entityRefs: ['Slot'], dataScope: { mode: 'own' } },
      { grantId: 'gClerk', actorRef: 'clerk', entityRefs: ['Slot'], dataScope: { mode: 'organization' } },
    ],
  };
  const needs = {
    pages: [
      { pageId: 'owner', actors: ['owner'] },
      { pageId: 'clerk', actors: ['clerk'] },
    ],
  };
  const defs = (name: string, body: unknown) => `export const ${name} = ${JSON.stringify(body)} as const;\n`;
  return [
    { path: 'l4/sample/ontology/Slot.defs.ts', text: defs('slot', ontology) },
    { path: 'l4/sample/rules.defs.ts', text: defs('rules', rules) },
    { path: 'l4/sample/access.defs.ts', text: defs('access', access) },
    { path: 'l4/sample/pool/l1/web/needs.json', text: `${JSON.stringify(needs)}\n` },
  ];
}

function sampleRequest(): D1UsecaseRequest {
  const listContext: D1UsecaseContext = {
    usecaseId: 'listSlot',
    lifecycle: false,
    transition: null,
    capabilities: [],
    effectiveFields: [],
    routes: [
      routeContext(OWNER_ROUTE, 'owner', 'gOwner', 'owner', 'own'),
      routeContext(CLERK_ROUTE, 'clerk', 'gClerk', 'clerk', 'organization'),
    ],
    rules: [],
    rulePlan: [],
    pendingRules: [],
    portId: 'SlotRepository',
    portMethods: [],
    effects: [],
    journeys: [],
    findings: [],
    sources: [],
  };
  const usecases = [
    selection('listSlot', 'list', [OWNER_ROUTE, CLERK_ROUTE]),
    selection('createSlot', 'create', [CREATE_ROUTE]),
    selection('closeSlot', 'transition', [CLOSE_ROUTE]),
  ];
  return {
    project: 102021,
    moduleName: 'sample',
    usecases,
    routes: [
      { route: OWNER_ROUTE, page: 'owner', kind: 'qry', usecaseRef: 'listSlot' },
      { route: CLERK_ROUTE, page: 'clerk', kind: 'qry', usecaseRef: 'listSlot' },
      { route: CREATE_ROUTE, page: 'clerk', kind: 'cmd', usecaseRef: 'createSlot' },
      { route: CLOSE_ROUTE, page: 'owner', kind: 'cmd', usecaseRef: 'closeSlot' },
    ],
    ports: [{
      portId: 'SlotRepository',
      entityId: 'Slot',
      defPath: 'l1/sample/layer_2_application/ports/slotRepository.defs.ts',
      methods: ['create', 'list', 'transition'],
    }],
    entities: [{
      entityId: 'Slot',
      storageTarget: 'moduleDatabase',
      defPath: 'l1/sample/layer_3_domain/entities/slot.defs.ts',
      namespace: '',
      fields: [
        { name: 'id', type: 'uuid', derived: true },
        { name: 'slot', type: 'string', derived: false },
      ],
      transitions: [
        { transitionId: 'moveSlot', from: ['open'], to: 'moved', by: ['clerk'], ruleRefs: ['flowRule'], payload: [] },
        { transitionId: 'closeSlot', from: ['open'], to: 'closed', by: ['owner'], ruleRefs: ['flowRule', 'ownRule'], payload: [] },
      ],
      rules: ['flowRule', 'ownRule', 'keyRule'].map(ruleId => ({
        ruleId,
        owner: 'module' as const,
        source: 'l4/sample/rules.defs.ts',
      })),
      uniqueKeys: [['slot']],
      capabilities: ['uniqueKey'],
      enumerations: [],
    }],
    moduleRules: ['flowRule', 'ownRule', 'keyRule'],
    outbound: [],
    contracts: [
      contract('owner', { [OWNER_ROUTE]: true, [CLOSE_ROUTE]: true }),
      contract('clerk', { [CLERK_ROUTE]: true, [CREATE_ROUTE]: false }),
    ],
    contexts: [listContext],
    plans: [],
    llmCalls: 0,
  };
}

function selection(usecaseId: string, operation: string, routes: string[]): D1UsecaseRequest['usecases'][number] {
  return {
    usecaseId,
    entity: 'Slot',
    operation,
    routes,
    defPath: `l1/sample/layer_2_application/usecases/${usecaseId}.defs.ts`,
  };
}

function routeContext(
  route: string,
  page: string,
  grantId: string,
  actorRef: string,
  scope: string,
): D1UsecaseContext['routes'][number] {
  return {
    route,
    page,
    contractPath: `l2/sample/web/contracts/${page}.defs.ts`,
    inputSymbol: 'In',
    outputSymbol: 'Out',
    inputFields: [],
    outputFields: [{ path: 'id', type: 'string', optional: false }],
    unbound: '',
    access: [{
      grantId,
      actorRef,
      scope,
      anchorEntity: '',
      scopeDetail: '',
      disclosure: 'fullRecord',
      disclosureDetail: '',
      allowedFields: [],
    }],
  };
}

function contract(page: string, routes: Record<string, boolean>): D1UsecaseRequest['contracts'][number] {
  const body = Object.fromEntries(Object.entries(routes).map(([route, withInput]) => [
    route,
    withInput ? { input: 'In', output: 'Out' } : { output: 'Out' },
  ]));
  return {
    pageId: page,
    path: `l2/sample/web/contracts/${page}.defs.ts`,
    source: `
      export interface In { id: string }
      export interface Out { id: string }
      export const routes = ${JSON.stringify(body)} as const;
    `,
  };
}
