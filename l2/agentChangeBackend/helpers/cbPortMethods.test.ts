/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPortMethods.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPortPlanItems,
  deleteTargetEntityIdsFromOperations,
  ensureRequiredPortMethods,
  ensureRequiredPortMethodsInSource,
  isDeleteOperation,
  methodNamesFromPortDefsSource,
  requiredMethodsForEntity,
  requiredMethodsFromPortData,
  stripEventPortDelete,
  unionMethodNames,
} from '/_102021_/l2/agentChangeBackend/helpers/cbPortMethods.js';
import {
  collectAdapterMissingPortMethods, extractInterfaceMethods, extractRepositoryInterfaceName,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

test('delete* operation targeting an aggregate puts requiredMethods: [delete] on the port item', () => {
  const ops = [
    { id: 'createTicket', entity: 'Ticket', opKind: 'create' },
    { id: 'deleteTicket', entity: 'Ticket', opKind: 'delete' },
    { id: 'deleteTicketComment', entity: 'TicketComment' },
    { id: 'listTicket', entity: 'Ticket', opKind: 'list' },
  ];
  const targets = deleteTargetEntityIdsFromOperations(ops);
  assert.deepEqual([...targets].sort(), ['Ticket', 'TicketComment']);
  const items = buildPortPlanItems(
    [
      { rootEntity: 'Ticket', embeddedMembers: ['TicketComment'] },
      { rootEntity: 'TicketComment', embeddedMembers: [] },
    ],
    targets,
  );
  assert.deepEqual(items.find(i => i.entityId === 'Ticket')?.requiredMethods, ['delete']);
  assert.deepEqual(items.find(i => i.entityId === 'TicketComment')?.requiredMethods, ['delete']);
});

test('aggregate without a delete* operation does not get delete in requiredMethods', () => {
  const targets = deleteTargetEntityIdsFromOperations([
    { id: 'createTicket', entity: 'Ticket', opKind: 'create' },
    { id: 'listTicket', entity: 'Ticket', opKind: 'list' },
    { id: 'inactivatePet', entity: 'Pet', opKind: 'update' },
  ]);
  assert.equal(targets.size, 0);
  assert.deepEqual(requiredMethodsForEntity('Ticket', targets), []);
  assert.deepEqual(requiredMethodsForEntity('Pet', targets), []);
  assert.equal(isDeleteOperation({ id: 'inactivatePet' }), false);
});

test('LLM port without delete is completed and records systemDecision; with delete is left alone', () => {
  const missing = {
    entityId: 'Ticket',
    interfaceName: 'ITicketRepository',
    methods: [
      { name: 'getById', params: ['id: string'], returns: 'Promise<Ticket | null>' },
      { name: 'list', params: ['filter: TicketFilter'], returns: 'Promise<Ticket[]>' },
      { name: 'save', params: ['aggregate: Ticket'], returns: 'Promise<void>' },
    ],
  };
  const completed = ensureRequiredPortMethods(missing, ['delete']);
  assert.deepEqual(completed, ['delete']);
  const names = (missing.methods as Array<{ name: string }>).map(m => m.name);
  assert.ok(names.includes('delete'), names.join(','));
  const decisions = missing.systemDecisions as Array<{ decidedBy: string; chosen: string }>;
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decidedBy, 'system');
  assert.match(decisions[0].chosen, /delete/i);

  const already = {
    entityId: 'Ticket',
    methods: [{ name: 'getById' }, { name: 'delete', params: ['id: string'], returns: 'Promise<void>' }],
  };
  assert.deepEqual(ensureRequiredPortMethods(already, ['delete']), []);
  assert.equal((already as { systemDecisions?: unknown }).systemDecisions, undefined);
});

test('ensureRequiredPortMethods does not invent delete when it was not required', () => {
  const item = { entityId: 'Ticket', methods: [{ name: 'getById' }, { name: 'save' }] };
  assert.deepEqual(ensureRequiredPortMethods(item, []), []);
  assert.deepEqual((item.methods as Array<{ name: string }>).map(m => m.name), ['getById', 'save']);
  assert.equal((item as { systemDecisions?: unknown }).systemDecisions, undefined);
});

test('event ports never keep delete (T1 must not contaminate append-only)', () => {
  const item = {
    entityId: 'TicketOpened',
    appendOnlyEvent: true,
    methods: [
      { name: 'append', returns: 'Promise<TicketOpened>' },
      { name: 'delete', params: ['id: string'], returns: 'Promise<void>' },
    ],
  };
  assert.deepEqual(stripEventPortDelete(item), ['delete']);
  assert.deepEqual((item.methods as Array<{ name: string }>).map(m => m.name), ['append']);
  const clean = { entityId: 'TicketOpened', methods: [{ name: 'append' }] };
  assert.deepEqual(stripEventPortDelete(clean), []);
});

test('method names from a saved port defs include delete when the post-check wrote it', () => {
  const source = `export const ticketRepositoryPort = ${JSON.stringify({
    artifactType: 'repositoryPort',
    data: {
      entityId: 'Ticket',
      interfaceName: 'ITicketRepository',
      requiredMethods: ['delete'],
      methods: [
        { name: 'getById', returns: 'Promise<Ticket | null>' },
        { name: 'delete', params: ['id: string'], returns: 'Promise<void>' },
      ],
    },
  }, null, 2)} as const;`;
  assert.deepEqual(methodNamesFromPortDefsSource(source).sort(), ['delete', 'getById']);
  assert.deepEqual(unionMethodNames(['delete'], ['getById', 'list', 'save']), ['delete', 'getById', 'list', 'save']);
});

const PORT_TS_WITHOUT_DELETE = [
  "export type TicketId = string;",
  "",
  "export interface TicketListFilter { status?: string; }",
  "",
  "export interface ITicketRepository {",
  "  getById(id: TicketId): Promise<Ticket | null>;",
  "  list(filter: TicketListFilter): Promise<Ticket[]>;",
  "  save(aggregate: Ticket): Promise<Ticket>;",
  "}",
].join('\n');

test('materialized port .ts missing delete is completed from requiredMethods and records systemDecision', () => {
  const result = ensureRequiredPortMethodsInSource(PORT_TS_WITHOUT_DELETE, {
    entityId: 'Ticket',
    requiredMethods: ['delete'],
  });
  assert.deepEqual(result.completed, ['delete']);
  assert.equal(result.findings.length, 0);
  assert.match(result.source, /delete\(id: TicketId\): Promise<void>;/);
  assert.ok(extractInterfaceMethods(result.source, 'ITicketRepository').has('delete'));
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].decidedBy, 'system');
  assert.equal(result.decisions[0].stage, 'cb-materialize');
  assert.equal(result.decisions[0].chosen, 'addDeleteToPortTs');
  assert.match(result.decisions[0].chosen, /delete/i);
});

test('materialized port .ts that already declares delete is left alone', () => {
  const withDelete = PORT_TS_WITHOUT_DELETE.replace(
    'save(aggregate: Ticket): Promise<Ticket>;',
    'save(aggregate: Ticket): Promise<Ticket>;\n  delete(id: TicketId): Promise<void>;',
  );
  const result = ensureRequiredPortMethodsInSource(withDelete, {
    entityId: 'Ticket',
    requiredMethods: ['delete'],
  });
  assert.deepEqual(result.completed, []);
  assert.equal(result.findings.length, 0);
  assert.equal(result.decisions.length, 0);
  assert.equal(result.source, withDelete);
});

test('materialized port .ts without requiredMethods does not invent delete', () => {
  assert.deepEqual(requiredMethodsFromPortData({ entityId: 'Ticket', methods: [] }), []);
  const result = ensureRequiredPortMethodsInSource(PORT_TS_WITHOUT_DELETE, { entityId: 'Ticket' });
  assert.deepEqual(result.completed, []);
  assert.equal(result.findings.length, 0);
  assert.equal(result.source, PORT_TS_WITHOUT_DELETE);
  assert.equal(extractInterfaceMethods(result.source, 'ITicketRepository').has('delete'), false);
});

test('event port (append-only) never gains delete even if requiredMethods lists it', () => {
  const eventTs = [
    'export interface ITicketOpenedRepository {',
    '  append(record: TicketOpened): Promise<TicketOpened>;',
    '  listByOwnerId(ownerId: string): Promise<TicketOpened[]>;',
    '}',
  ].join('\n');
  const result = ensureRequiredPortMethodsInSource(eventTs, {
    entityId: 'TicketOpened',
    appendOnlyEvent: true,
    requiredMethods: ['delete'],
  });
  assert.deepEqual(result.completed, []);
  assert.equal(result.findings.length, 0);
  assert.equal(result.source, eventTs);
  assert.equal(extractInterfaceMethods(result.source, 'ITicketOpenedRepository').has('delete'), false);
});

test('required method that is not mechanically derivable is a finding, never silence', () => {
  const noId = [
    'export interface ITicketRepository {',
    '  getById(id: string): Promise<Ticket | null>;',
    '  save(aggregate: Ticket): Promise<Ticket>;',
    '}',
  ].join('\n');
  const missingId = ensureRequiredPortMethodsInSource(noId, { entityId: 'Ticket', requiredMethods: ['delete'] });
  assert.deepEqual(missingId.completed, []);
  assert.equal(missingId.source, noId);
  assert.equal(missingId.findings.length, 1);
  assert.match(missingId.findings[0], /cannot complete mechanically/);

  const unknown = ensureRequiredPortMethodsInSource(PORT_TS_WITHOUT_DELETE, {
    entityId: 'Ticket',
    requiredMethods: ['archive'],
  });
  assert.deepEqual(unknown.completed, []);
  assert.equal(unknown.source, PORT_TS_WITHOUT_DELETE);
  assert.equal(unknown.findings.length, 1);
  assert.match(unknown.findings[0], /archive/);
  assert.match(unknown.findings[0], /cannot complete mechanically/);
});

test('adapter guard is against the materialized port .ts, not the defs plan', () => {
  const portTs = PORT_TS_WITHOUT_DELETE;
  assert.equal(extractRepositoryInterfaceName(portTs), 'ITicketRepository');
  const tsMethods = extractInterfaceMethods(portTs, 'ITicketRepository');
  assert.equal(tsMethods.has('delete'), false, 'the .ts omitted delete even though the plan asked for it');
  const adapter = [
    'export function createTicketRepositoryAdapter(ctx: RequestContext): ITicketRepository {',
    '  return {',
    '    async getById(id) { return null; },',
    '    async list(filter) { return []; },',
    '    async save(aggregate) { return aggregate; },',
    '  };',
    '}',
  ].join('\n');
  assert.deepEqual(
    collectAdapterMissingPortMethods(adapter, tsMethods, 'ticketRepositoryAdapter.ts', 'ITicketRepository'),
    [],
    'guard on the .ts must not invent delete from the plan',
  );
  const completed = ensureRequiredPortMethodsInSource(portTs, { entityId: 'Ticket', requiredMethods: ['delete'] });
  const after = extractInterfaceMethods(completed.source, 'ITicketRepository');
  const issues = collectAdapterMissingPortMethods(adapter, after, 'ticketRepositoryAdapter.ts', 'ITicketRepository');
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing ITicketRepository\.delete/);
});
