/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/behavior.test.ts" enhancement="_blank"/>

/**
 * m1_06/m1_10/m1_11/m1_17 on v2 defs (m1_41 b1-P2b): storage constraint, checkpoint, transitions,
 * MDM create/update, own scope on the list and the local update. The module is built here from a
 * `Names`; every id is arbitrary and a renamed copy must derive the same. Routes are
 * `<mod>.<page>.<requestId>`: nothing in a name says command or query. The usecases cite no contract;
 * routes and grants come from the module's request services and controllers.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/context/context.js';
import { planMaterialization } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { shouldCallModel } from '/_102021_/l2/agentMaterializeL1/run/model.js';
import type { SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { M1_CATALOG_SCHEMA } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { verifyBatch } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { behaviorNeedsLlm, caseBlock, emitBehavior, withoutCreateChecks, withoutLifecycleChecks, withoutPayloadChecks, withoutScopeChecks, withoutStorageChecks, withoutVersionChecks } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, recordFieldFromGrant, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { clearRepositories, registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';
import { runBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
sweepRepoRootScratch();
const CATALOG_REF = 'catalog.json';
const MDM_ONTOLOGY = '_102034_/l4/ontology/mdm.defs.ts';

interface Names {
  project: string; mod: string; Entity: string; entity: string; owner: string; org: string; Anchor: string;
  ownerField: string; clientField: string; slot: string; status: string; check: string; note: string;
  initial: string; confirmed: string; done: string; missed: string;
  pageOrg: string; pageOwn: string; Mdm: string; mdm: string;
  storageRule: string; flowRule: string; payloadRule: string; anchorRule: string; coverageRule: string;
  reqCreate: string; reqAmend: string; reqRows: string; reqConfirm: string; reqServe: string; reqEnroll: string; reqRevise: string; reqMembers: string;
}
const BASE: Names = {
  project: '_102094_', mod: 'slotDesk', Entity: 'Booking', entity: 'booking', owner: 'agent', org: 'dispatcher', Anchor: 'Agent',
  ownerField: 'agentId', clientField: 'clientId', slot: 'slotAt', status: 'phase', check: 'callCheck', note: 'visitNote',
  initial: 'booked', confirmed: 'confirmed', done: 'served', missed: 'missed',
  pageOrg: 'desk', pageOwn: 'round', Mdm: 'Member', mdm: 'member',
  storageRule: 'bookingSlotUnique', flowRule: 'bookingFlow', payloadRule: 'visitNoteRequired', anchorRule: 'agentServesOwnBooking', coverageRule: 'agentSeesOwnRows',
  reqCreate: 'bookIt', reqAmend: 'amendIt', reqRows: 'bookingRows', reqConfirm: 'confirmIt', reqServe: 'serveIt', reqEnroll: 'enrollIt', reqRevise: 'reviseIt', reqMembers: 'memberRows',
};
const RENAMED: Names = {
  project: '_102093_', mod: 'tripLog', Entity: 'Ride', entity: 'ride', owner: 'rider', org: 'warden', Anchor: 'Rider',
  ownerField: 'riderRef', clientField: 'fareRef', slot: 'leaveAt', status: 'stage', check: 'gateCheck', note: 'riderMemo',
  initial: 'alpha', confirmed: 'beta', done: 'omega', missed: 'gamma',
  pageOrg: 'yard', pageOwn: 'helm', Mdm: 'Patron', mdm: 'patron',
  storageRule: 'r1', flowRule: 'rideOrder', payloadRule: 'riderMemoFilled', anchorRule: 'riderOwnsRide', coverageRule: 'riderOwnRows',
  reqCreate: 'tieUp', reqAmend: 'reviseRide', reqRows: 'rideRows', reqConfirm: 'holdIt', reqServe: 'closeIt', reqEnroll: 'signUp', reqRevise: 'fixPatron', reqMembers: 'patronRows',
};

type Row = Record<string, unknown>;

interface Module {
  n: Names;
  refs: {
    entity: string; port: string; ontology: string; scope: string; authority: string; contractOwn: string;
    mdmEntity: string; mdmOntology: string;
    uc: (id: string) => string; request: (page: string) => string; ctrl: (page: string) => string;
  };
  ids: { create: string; update: string; list: string; confirm: string; serve: string; createMdm: string; updateMdm: string; listMdm: string };
  routes: { create: string; amend: string; orgRows: string; ownRows: string; confirm: string; serve: string; enroll: string; revise: string; members: string };
  defs: Map<string, M1Definition>;
  texts: Map<string, string>;
  /** The module defs the agent loads: routes and grants of a v2 usecase are read here. */
  list: M1Definition[];
}

interface BuildOptions {
  /** The own-scope grant is pending ACCESS_ANCHOR (no record path), as the bench is today. */
  ownPending?: boolean;
  /** Changes a def before the module is assembled. */
  patch?: (definition: M1Definition) => M1Definition;
  /** The l4 entity marks `version` as the write precondition. */
  versionPrecondition?: boolean;
}

function build(n: Names, options: BuildOptions = {}): Module {
  const { ownPending = true, patch = (definition: M1Definition) => definition, versionPrecondition = false } = options;
  const E = n.Entity;
  const L1 = `${n.project}/l1/${n.mod}`;
  const refs = {
    entity: `${L1}/layer_3_domain/entities/${n.entity}.defs.ts`,
    port: `${L1}/layer_2_application/ports/${n.entity}Repository.defs.ts`,
    ontology: `${n.project}/l4/${n.mod}/ontology/${E}.defs.ts`,
    scope: `${L1}/layer_2_application/scope/accessScope.defs.ts`,
    authority: `${L1}/layer_1_external/auth/authorityMap.defs.ts`,
    contractOwn: `${n.project}/l2/${n.mod}/web/contracts/${n.pageOwn}.defs.ts`,
    mdmEntity: `${L1}/layer_3_domain/entities/${n.mdm}.defs.ts`,
    mdmOntology: `${n.project}/l4/${n.mod}/ontology/${n.Mdm}.defs.ts`,
    uc: (id: string) => `${L1}/layer_2_application/usecases/${id}.defs.ts`,
    request: (page: string) => `${L1}/layer_2_application/requests/${page}.defs.ts`,
    ctrl: (page: string) => `${L1}/layer_1_external/adapters/http/controllers/${page}.defs.ts`,
  };
  const ids = {
    create: `create${E}`, update: `update${E}`, list: `list${E}`, confirm: `confirm${E}`, serve: `serve${E}`,
    createMdm: `create${n.Mdm}`, updateMdm: `update${n.Mdm}`, listMdm: `list${n.Mdm}`,
  };
  const route = (page: string, request: string) => `${n.mod}.${page}.${request}`;
  const routes = {
    create: route(n.pageOrg, n.reqCreate), amend: route(n.pageOrg, n.reqAmend), orgRows: route(n.pageOrg, n.reqRows),
    ownRows: route(n.pageOwn, n.reqRows), confirm: route(n.pageOrg, n.reqConfirm), serve: route(n.pageOwn, n.reqServe),
    enroll: route(n.pageOrg, n.reqEnroll), revise: route(n.pageOrg, n.reqRevise), members: route(n.pageOrg, n.reqMembers),
  };
  const def = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition =>
    patch({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: n.mod, status: 'pending', dependencies: [...dependencies].sort(), data } as M1Definition);

  // No transition reaches the initial state; it is not declared first.
  const lifecycle = {
    states: [n.done, n.missed, n.confirmed, n.initial].map(state => ({ state, reachedBy: 'actor' })),
    transitions: [
      { transitionId: 'markConfirmed', from: [n.initial], to: n.confirmed, by: [n.org], ruleRefs: [n.flowRule] },
      { transitionId: 'markServed', from: [n.initial], to: n.done, by: [n.owner], ruleRefs: [n.flowRule, n.payloadRule] },
      { transitionId: 'markMissed', from: [n.initial], to: n.missed, by: [n.org], ruleRefs: [] },
    ],
  };
  const fields = [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'version', type: 'integer', derived: true },
    { name: n.clientField, type: 'record', ref: 'Client' },
    { name: n.ownerField, type: 'record', ref: n.Anchor },
    { name: n.slot, type: 'timestamp' },
    { name: n.status, type: 'enum' },
    { name: 'details', type: 'object' },
    { name: `details.${n.check}`, type: 'object' },
    { name: `details.${n.check}.doneAt`, type: 'timestamp' },
    { name: `details.${n.note}`, type: 'text' },
  ];
  const entity = def('domainEntity', E, [], { entityId: E, storageTarget: 'moduleDatabase', fields, lifecycle, invariants: [n.flowRule], imports: [] });
  const port = def('repositoryPort', `${E}Repository`, [refs.entity], {
    entityId: E,
    interfaceName: `${E}Repository`,
    methods: [
      { name: 'create', params: [E], returns: E },
      { name: 'list', params: [`${E}Filter`], returns: `${E}[]` },
      { name: 'update', params: [E], returns: E },
      { name: 'transition', params: [E, 'transitionId'], returns: E },
    ],
  });
  const row = (name: string, type: string) => ({ name, type, fieldRef: `${E}.${name}` });
  const ROW = fields.map(field => row(field.name, field.type));
  const pick = (...names: string[]) => ROW.filter(item => names.includes(item.name));
  const rule = (ruleId: string, origin: string, consumer: string, enforcement: string, gap = '') => ({ ruleId, origin, consumer, enforcement, gap });
  const ontologyPath = `l4/${n.mod}/ontology/${E}.defs.ts`;
  const storage = (operation: string) => [
    rule('', `${ontologyPath}#uniqueKeys`, `operation:${operation}`, 'local'),
    rule(n.storageRule, `l4/${n.mod}/rules.defs.ts#${n.storageRule}`, `operation:${operation}`, 'pending', 'RULE_UNBOUND'),
  ];
  // A v2 list signature pages: `page`/`pageSize` in, `items`/`hasMore` out (as the D1 writes it).
  const PAGE_IN = [{ name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }];
  const PAGE_OUT = [{ name: 'items', type: E }, { name: 'hasMore', type: 'boolean' }];
  const usecase = (id: string, operation: string, input: Row[], extra: Record<string, unknown> = {}, deps: string[] = []): M1Definition => def('usecase', id, [refs.port, refs.entity, refs.ontology, ...deps], {
    usecaseId: id,
    entityId: E,
    operation,
    ports: [`${E}Repository`],
    functions: [{ functionName: id, input: operation === 'list' ? [...input, ...PAGE_IN] : input, output: operation === 'list' ? PAGE_OUT : ROW }],
    portCalls: [operation],
    effects: [],
    uses: [{ path: 'id', role: operation === 'list' ? 'filter' : 'selector', source: 'input' }],
    rulesApplied: [],
    rules: [],
    rulePlan: [],
    sequence: [{ kind: 'port', call: operation, port: `${E}Repository` }],
    transactional: false,
    transaction: { boundary: 'none' },
    ...extra,
  });
  const transitionRule = (transitionId: string, ruleId: string, id: string) => rule(ruleId, `${ontologyPath}#transitions.${transitionId}.ruleRefs`, `usecase:${id}`, 'local');
  const create = usecase(ids.create, 'create', pick(n.clientField, n.ownerField, n.slot, 'details', `details.${n.check}`, `details.${n.check}.doneAt`), { rulePlan: storage('create') });
  const update = usecase(ids.update, 'update', pick('id', 'details', `details.${n.check}`, `details.${n.check}.doneAt`), { rulePlan: storage('update') });
  const list = usecase(ids.list, 'list', pick('id', n.clientField, n.ownerField, n.status), {
    rulePlan: [rule(n.coverageRule, `l4/${n.mod}/rules.defs.ts#${n.coverageRule}`, 'operation:list', 'pending', 'APPLICABILITY_UNDECLARED')],
  });
  const confirm = usecase(ids.confirm, 'transition', pick('id'), {
    portCalls: ['transition'],
    lifecycle: { transitionId: 'markConfirmed', payload: [] },
    rulePlan: [transitionRule('markConfirmed', n.flowRule, ids.confirm)],
  });
  const integration = `${n.project}/l4/${n.mod}/integration.defs.ts`;
  const serve = usecase(ids.serve, 'transition', pick('id', 'details', `details.${n.note}`), {
    portCalls: ['transition'],
    lifecycle: { transitionId: 'markServed', payload: [`details.${n.note}`] },
    effects: [{ eventId: `${n.entity}Served`, path: `l4/${n.mod}/integration.defs.ts`, symbol: `${n.entity}Served` }],
    rulePlan: [
      transitionRule('markServed', n.flowRule, ids.serve),
      transitionRule('markServed', n.payloadRule, ids.serve),
      rule(n.anchorRule, `l4/${n.mod}/rules.defs.ts#${n.anchorRule}`, `usecase:${ids.serve}`, 'local'),
    ],
  }, [integration]);

  // MDM entity: the runtime owns the record; the usecases call the facade, not a port.
  const M = n.Mdm;
  const mdmFields = ['id', 'version', 'details', 'details.identification', 'details.identification.name', 'details.identification.docType',
    'details.identification.docId', 'details.identification.countryCode', 'details.base', 'details.base.aliases', 'details.person', 'details.person.occupation'];
  const mdmEntity = def('domainEntity', M, [], {
    entityId: M,
    storageTarget: 'mdm',
    fields: mdmFields.map(name => ({ name, type: name === 'id' ? 'uuid' : name === 'version' ? 'integer' : name.split('.').length < 3 ? 'object' : 'string', ...(name === 'id' || name === 'version' ? { derived: true } : {}) })),
    lifecycle: { states: [], transitions: [] },
    invariants: [],
    imports: [],
  });
  const mdmRow = (name: string, type: string) => ({ name, type, fieldRef: `${M}.${name}` });
  const contract = (path: string) => ({ kind: 'contract', path });
  const patchArg = (name: string, path: string) => ({ name, role: 'patch', origin: contract(path), path });
  const role = `${n.mod}.${M}`;
  const mdmUsecase = (id: string, operation: string, input: Row[], calls: unknown[], uses: unknown[] = []): M1Definition => def('usecase', id, [MDM_ONTOLOGY, refs.mdmEntity, refs.mdmOntology], {
    usecaseId: id,
    entityId: M,
    operation,
    ports: [],
    functions: [{ functionName: id, input, output: [mdmRow('id', 'uuid'), mdmRow('version', 'integer'), mdmRow('details', 'object')] }],
    portCalls: [],
    effects: [],
    uses,
    rulesApplied: [],
    rules: [],
    rulePlan: [],
    sequence: [{ kind: 'context', source: 'ctx' }],
    transactional: false,
    transaction: { boundary: 'none' },
    mdm: { namespace: n.mod, role, atomic: operation === 'update', calls },
  });
  const docWhen = [{ kind: 'contract', path: 'details.identification.docType', present: true }, { kind: 'contract', path: 'details.identification.docId', present: true }];
  const docArgs = [
    { name: 'docType', role: 'selector', origin: contract('details.identification.docType'), path: 'details.identification.docType' },
    { name: 'docId', role: 'selector', origin: contract('details.identification.docId'), path: 'details.identification.docId' },
  ];
  const createMdm = mdmUsecase(ids.createMdm, 'create', [mdmRow('details', 'object')], [
    { id: 'findDocument', method: 'findByDocument', target: 'entity', when: docWhen, arguments: docArgs },
    {
      id: 'createPerson', method: 'create', target: 'entity', when: [{ kind: 'prior', path: 'mdmId', call: 'findDocument', present: false }],
      arguments: [
        patchArg('aliases', 'details.base.aliases'), patchArg('countryCode', 'details.identification.countryCode'), patchArg('docId', 'details.identification.docId'),
        patchArg('docType', 'details.identification.docType'), patchArg('name', 'details.identification.name'),
      ],
    },
    {
      id: 'attachRole', method: 'attachRole', target: 'entity', when: [],
      arguments: [
        { name: 'mdmId', role: 'selector', origin: { kind: 'prior', path: 'mdmId', calls: ['findDocument', 'createPerson'] } },
        { name: 'role', role: 'parameter', origin: { kind: 'literal', evidence: 'role' }, value: role },
      ],
    },
  ]);
  const updateMdm = mdmUsecase(ids.updateMdm, 'update', [mdmRow('id', 'uuid'), mdmRow('version', 'integer'), mdmRow('details', 'object')], [{
    id: 'update', method: 'update', target: 'entity', when: [],
    arguments: [
      { name: 'mdmId', role: 'selector', origin: contract('id'), path: 'id' },
      { name: 'expectedVersion', role: 'parameter', origin: { kind: 'contract', path: 'version', evidence: 'writePrecondition' }, path: 'version' },
      patchArg('countryCode', 'details.identification.countryCode'), patchArg('docId', 'details.identification.docId'),
      patchArg('docType', 'details.identification.docType'), patchArg('name', 'details.identification.name'), patchArg('occupation', 'details.person.occupation'),
    ],
  }], [{ path: 'id', role: 'selector', source: 'input' }, { path: 'version', role: 'concurrency', source: 'input' }]);
  const listMdm = mdmUsecase(ids.listMdm, 'list', [mdmRow('id', 'uuid'), mdmRow('details', 'object')], [
    { id: 'get', method: 'get', target: 'entity', when: [], arguments: [{ name: 'mdmId', role: 'selector', origin: contract('id'), path: 'id' }] },
    { id: 'findByDocument', method: 'findByDocument', target: 'entity', when: docWhen, arguments: docArgs },
    {
      id: 'listByName', method: 'listByType', target: 'collection', when: [{ kind: 'contract', path: 'details.identification.name', present: true }],
      arguments: [
        { name: 'type', role: 'parameter', origin: { kind: 'literal', evidence: 'role' }, value: role },
        { name: 'name', role: 'selector', origin: contract('details.identification.name'), path: 'details.identification.name' },
      ],
    },
  ], [{ path: 'id', role: 'filter', source: 'input' }]);

  const keep = ['id', 'version', n.clientField, n.ownerField, n.slot, n.status].map(field => `${E}.${field}`);
  const ownPath = ownPending
    ? [{ entityId: E, steps: [], pending: 'ACCESS_ANCHOR' }]
    : [
      { entityId: E, steps: [{ relationshipId: `${n.entity}${n.Anchor}`, from: E, to: n.Anchor, field: `${E}.${n.ownerField}` }], pending: '' },
      { entityId: n.Anchor, steps: [], pending: '' },
    ];
  const scope = def('accessScope', 'accessScope', [], {
    scopeId: 'accessScope',
    grants: [
      {
        grantId: `${n.org}Desk`, actorRef: n.org, entityRefs: [E, M], disclosure: 'fieldsOnly',
        allowedFields: [...keep, `${E}.details.${n.check}`, `${M}.id`, `${M}.version`, `${M}.details`], scopeMode: 'organization', session: 'verified',
        path: [{ entityId: E, steps: [], pending: '' }], pending: '',
      },
      {
        grantId: `${n.owner}Round`, actorRef: n.owner, anchorEntity: n.Anchor, entityRefs: [E, n.Anchor], disclosure: 'fieldsOnly',
        allowedFields: [...keep, `${E}.details.${n.note}`], scopeMode: 'own', session: 'verified',
        path: ownPath, pending: ownPending ? 'ACCESS_ANCHOR' : '',
      },
    ],
  });
  const authority = def('authorityMap', 'authorityMap', [refs.scope], {
    mapId: 'authorityMap',
    entries: [{ grantId: `${n.org}Desk`, actorRef: n.org }, { grantId: `${n.owner}Round`, actorRef: n.owner }],
  });
  const shared = ['id', 'version', n.clientField, n.ownerField, n.slot, n.status];
  const request = (path: string, kind: 'cmd' | 'qry', uses: string[], key: string, entityId: string, outFields: string[]) => ({
    route: path, kind, uses, transaction: kind === 'cmd' ? 'single' : 'none', outputs: [{ key, entity: entityId, fields: outFields }], params: [],
  });
  const orgFields = [...shared, `details.${n.check}.doneAt`];
  const ownFields = [...shared, `details.${n.note}`];
  const mdmOut = ['id', 'version', 'details'];
  const orgRequests = def('requestService', n.pageOrg, [ids.create, ids.update, ids.list, ids.confirm, ids.createMdm, ids.updateMdm, ids.listMdm].map(refs.uc), {
    pageId: n.pageOrg,
    requests: [
      request(routes.create, 'cmd', [ids.create], n.entity, E, orgFields),
      request(routes.amend, 'cmd', [ids.update], n.entity, E, orgFields),
      request(routes.orgRows, 'qry', [ids.list], `${n.entity}s`, E, orgFields),
      request(routes.confirm, 'cmd', [ids.confirm], n.entity, E, orgFields),
      request(routes.enroll, 'cmd', [ids.createMdm], n.mdm, M, mdmOut),
      request(routes.revise, 'cmd', [ids.updateMdm], n.mdm, M, mdmOut),
      request(routes.members, 'qry', [ids.listMdm], `${n.mdm}s`, M, mdmOut),
    ],
  });
  const ownRequests = def('requestService', n.pageOwn, [ids.list, ids.serve].map(refs.uc), {
    pageId: n.pageOwn,
    requests: [
      request(routes.ownRows, 'qry', [ids.list], `${n.entity}s`, E, ownFields),
      request(routes.serve, 'cmd', [ids.serve], n.entity, E, ownFields),
    ],
  });
  const pascal = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const handler = (path: string, kind: string, page: string, grantId: string) => ({
    route: path, kind, grantIds: [grantId], serviceFunction: path,
    contractPath: `l2/${n.mod}/web/contracts/${page}.defs.ts`, contractInterface: `${pascal(page)}Contracts`,
  });
  const orgCtrl = def('httpController', n.pageOrg, [refs.authority, refs.scope, refs.request(n.pageOrg)], {
    pageId: n.pageOrg,
    handlers: [
      handler(routes.create, 'command', n.pageOrg, `${n.org}Desk`),
      handler(routes.amend, 'command', n.pageOrg, `${n.org}Desk`),
      handler(routes.orgRows, 'query', n.pageOrg, `${n.org}Desk`),
      handler(routes.confirm, 'command', n.pageOrg, `${n.org}Desk`),
      handler(routes.enroll, 'command', n.pageOrg, `${n.org}Desk`),
      handler(routes.revise, 'command', n.pageOrg, `${n.org}Desk`),
      handler(routes.members, 'query', n.pageOrg, `${n.org}Desk`),
    ],
  });
  const ownCtrl = def('httpController', n.pageOwn, [refs.authority, refs.scope, refs.request(n.pageOwn)], {
    pageId: n.pageOwn,
    handlers: [handler(routes.serve, 'command', n.pageOwn, `${n.owner}Round`), handler(routes.ownRows, 'query', n.pageOwn, `${n.owner}Round`)],
  });
  const registration = def('repositoryRegistration', 'registerRepositories', [], {
    registrationId: 'registerRepositories',
    adapters: [{ portId: `${E}Repository`, adapterArtifactId: `${E}Repository` }],
  });

  const defs = new Map<string, M1Definition>([
    [refs.entity, entity], [refs.port, port], [refs.mdmEntity, mdmEntity], [refs.scope, scope], [refs.authority, authority],
    ...[create, update, list, confirm, serve, createMdm, updateMdm, listMdm].map(item => [refs.uc(item.artifactId), item] as [string, M1Definition]),
    [refs.request(n.pageOrg), orgRequests], [refs.request(n.pageOwn), ownRequests],
    [refs.ctrl(n.pageOrg), orgCtrl], [refs.ctrl(n.pageOwn), ownCtrl],
  ]);
  // L2 contract v2 of the own page: the route input is written inline.
  const states = lifecycle.states.map(item => `'${item.state}'`).join(' | ');
  const rowType = `{ id: string; version: number; ${n.clientField}?: string; ${n.ownerField}?: string; ${n.slot}?: string; ${n.status}: ${states}; details?: { ${n.note}?: string; }; }`;
  const listInput = `{ id?: string; ${n.clientField}?: string; ${n.ownerField}?: string; ${n.status}?: ${states}; }`;
  const contractRoute = (path: string, kind: 'cmd' | 'qry', input: string, output: string) => `  '${path}': {\n    kind: '${kind}';\n    input: ${input};\n    output: ${output};\n  };`;
  const ownContract = [
    `export interface ${pascal(n.pageOwn)}Contracts {`,
    contractRoute(routes.serve, 'cmd', `{ id: string; details: { ${n.note}: string; }; }`, `{ ${n.entity}: ${rowType} }`),
    contractRoute(routes.ownRows, 'qry', listInput, `{ ${n.entity}s: ${rowType}[] }`),
    '}',
  ].join('\n');
  const ontology = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: n.mod, entityId: E, kind: 'entity',
    record: {
      fields: {
        id: { type: 'uuid', required: true, derived: true },
        ...(versionPrecondition ? { version: { type: 'integer', required: true, derived: true, writePrecondition: true } } : {}),
        [n.status]: { type: 'enum', required: true },
      },
    },
    lifecycleStates: lifecycle.states,
    transitions: lifecycle.transitions,
    uniqueKeys: [[n.ownerField, n.slot]],
  };
  const mdmOntology = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: n.mod, entityId: M, kind: 'entity',
    mdm: { subtype: 'Person' },
    record: { fields: { id: { type: 'uuid', required: true, derived: true }, version: { type: 'integer', required: true, derived: true, writePrecondition: true } } },
  };
  const texts = new Map<string, string>([
    [refs.contractOwn, ownContract],
    [refs.ontology, `export const ${n.mod}Entity${E} = ${JSON.stringify(ontology, null, 2)} as const;\n`],
    [refs.mdmOntology, `export const ${n.mod}Entity${M} = ${JSON.stringify(mdmOntology, null, 2)} as const;\n`],
    [integration, `export const ${n.entity}Served = { eventId: '${n.entity}Served' } as const;\n`],
  ]);
  for (const [ref, definition] of defs) texts.set(ref, `export const definition = ${JSON.stringify(definition)} as const;\n`);
  return { n, refs, ids, routes, defs, texts, list: [...defs.values(), registration] };
}

/** The module texts, the catalog, and the platform files of 102034. Nothing else is on disk for the agent. */
function reader(m: Module, overrides: Map<string, string> = new Map(), catalog: string | null = null): (ref: string) => Promise<string | null> {
  return async ref => {
    if (ref === CATALOG_REF) return catalog;
    const found = overrides.get(ref) ?? m.texts.get(ref);
    if (found !== undefined) return found;
    const match = /^_102034_\/(.+)$/.exec(ref);
    if (!match) return null;
    try {
      return readFileSync(join(ROOT, 'mls-102034', match[1]), 'utf8');
    } catch {
      return null;
    }
  };
}

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

function defOf(m: Module, artifactId: string): { defPath: string; definition: M1Definition } {
  const found = [...m.defs].find(([, definition]) => definition.artifactId === artifactId);
  if (!found) throw new Error(artifactId);
  return { defPath: found[0], definition: found[1] };
}

async function emit(m: Module, artifactId: string): Promise<string> {
  return emitAt(m, defOf(m, artifactId).defPath);
}

async function emitAt(m: Module, defPath: string): Promise<string> {
  const definition = m.defs.get(defPath);
  if (!definition) throw new Error(defPath);
  const output = outputPathFromDefPath(defPath);
  if (definition.artifactType === 'httpController') return ok(await emitController(definition, output, reader(m))).source;
  return ok(await emitBehavior(`implement.${definition.artifactType}`, definition, output, reader(m), m.list)).source;
}

function callFor(m: Module, artifactId: string, modelText: string | null = null, catalog: string = catalogOf(m)): HandlerCall {
  const found = defOf(m, artifactId);
  const handler = handlerFor(found.definition.artifactType, 'implement');
  if (!handler) throw new Error(found.definition.artifactType);
  const unit: SimulatedUnit = {
    defPath: found.defPath,
    artifactType: found.definition.artifactType,
    artifactId: found.definition.artifactId,
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
    definition: found.definition,
    read: reader(m, new Map(), catalog),
    catalogRef: CATALOG_REF,
    repair: false,
    signal: new AbortController().signal,
    eventId: found.defPath,
    profile: decideProfile('development', true),
    modelText,
    moduleDefinitions: m.list,
  };
}

function sourceOf(outcome: { files: Record<string, string> }): string {
  return Object.values(outcome.files)[0] ?? '';
}

/** Emitted files written at their output paths in a scratch folder; module imports point at the copies. */
interface Scratch {
  write: (ref: string, source: string, suffix?: string) => string;
  dispose: () => void;
}
function scratch(m: Module, prefix: string): Scratch {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const P = m.n.project;
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${P}/`, ''));
  return {
    write: (ref, source, suffix = '') => {
      const target = fileOf(outputPathFromDefPath(ref)).replace(/\.ts$/, `${suffix}.ts`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source.replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`));
      return pathToFileURL(target).href;
    },
    dispose: () => rmSync(dir, { recursive: true, force: true }),
  };
}

type Usecase = (input: Row, ctx: unknown, ports?: Row) => Promise<Row>;
interface Memory { resetMemory: (seed?: Row[]) => void; repository: unknown }
async function memoryOf(m: Module, url: string): Promise<Memory> {
  const loaded = await import(url) as Record<string, unknown>;
  return { resetMemory: loaded.resetMemory as Memory['resetMemory'], repository: loaded[`pending${m.n.Entity}Repository`] };
}
async function usecaseAt(url: string, name: string): Promise<Usecase> {
  return (await import(url) as Record<string, Usecase>)[name];
}

function compile(m: Module, rows: Array<[string, string]>): string {
  sweepRepoRootScratch();
  const dir = join(ROOT, '.generated', `.m1-06-out-${process.pid}`);
  const config = join(ROOT, `.tsconfig.m1-06-${process.pid}.json`);
  try {
    const files: string[] = [];
    for (const [ref, source] of rows) {
      const full = join(dir, outputPathFromDefPath(ref).replace(`${m.n.project}/`, ''));
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      files.push(`./${relative(ROOT, full)}`);
    }
    const paths = { [`/${m.n.project}/*`]: [`./${relative(ROOT, dir)}/*`], '/_102034_/*': ['./mls-102034/*'] };
    writeFileSync(config, `${JSON.stringify({ extends: './tsconfig.base.json', compilerOptions: { noEmit: true, paths }, files }, null, 2)}\n`);
    const tsc = join(ROOT, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: ROOT, encoding: 'utf8' });
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('.m1-06-out')).join('\n').trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(config, { force: true });
    sweepRepoRootScratch();
  }
}

function sweepRepoRootScratch(): void {
  for (const name of readdirSync(ROOT)) {
    if (name.startsWith('.m1-')) rmSync(join(ROOT, name), { recursive: true, force: true });
  }
}

/** Scenario catalog written by hand for the checkpoint: compile and business cases on the module's own routes. */
function catalogOf(m: Module): string {
  const expect = (ok: boolean, status: number, errorCode: string | null, ruleId: string | null) => ({ ok, status, errorCode, ruleId, forbiddenFields: [], isolatedActorField: null });
  const kase = (caseId: string, routine: string, expected: ReturnType<typeof expect>) => ({
    caseId, gate: routine ? 'business' : 'compile', mandatory: true, source: caseId, expectation: caseId, preconditions: [], synthetic: [], actorId: '', routine,
    mutating: false, expect: expected, expectedFailure: routine ? { caseId, stage: 'structure', errorCode: 'USECASE_NOT_IMPLEMENTED', status: 501 } : null,
  });
  const scenario = (artifactId: string, cases: unknown[]) => {
    const production = outputPathFromDefPath(m.refs.uc(artifactId));
    return {
      scenarioId: artifactId, source: artifactId, artifactType: 'usecase', artifactId, handlerId: 'structure.usecase',
      productionFile: production, testFile: production.replace(/\.ts$/, '.test.ts'), cases,
    };
  };
  const compiles = (id: string) => kase(`${id}.compile`, '', expect(true, 0, null, null));
  const { ids, routes, n } = m;
  return JSON.stringify({
    schemaVersion: M1_CATALOG_SCHEMA, moduleName: n.mod, store: 'memory',
    scenarios: [
      scenario(ids.create, [
        compiles(ids.create),
        kase(`${ids.create}.creates`, routes.create, expect(true, 200, null, null)),
        kase(`${ids.create}.duplicateSlot`, routes.create, expect(false, 409, 'CONFLICT', n.storageRule)),
      ]),
      scenario(ids.list, [
        compiles(ids.list),
        kase(`${ids.list}.lists`, routes.ownRows, expect(true, 200, null, null)),
        kase(`${ids.list}.ownRows`, routes.ownRows, expect(true, 200, null, n.coverageRule)),
        kase(`${ids.list}.orgProjection`, routes.orgRows, expect(true, 200, null, null)),
      ]),
      scenario(ids.serve, [
        compiles(ids.serve),
        kase(`${ids.serve}.staleVersion`, routes.serve, expect(false, 409, 'CONFLICT', 'expectedVersion')),
        kase(`${ids.serve}.noteRequired`, routes.serve, expect(false, 400, 'VALIDATION_ERROR', n.payloadRule)),
        kase(`${ids.serve}.invalidTransition`, routes.serve, expect(false, 400, 'VALIDATION_ERROR', n.flowRule)),
      ]),
    ],
  });
}

const rejectsWith = (code: string, ruleId?: string) => (error: { code?: string; details?: { ruleId?: string } }) =>
  error.code === code && (ruleId === undefined || error.details?.ruleId === ruleId);

void test('lote 1 usecases derive the storage constraint and leave pending rules out', async () => {
  const m = build(BASE);
  const { ids, n } = m;
  const usecase = handlerFor('usecase', 'implement');
  assert.equal(usecase?.needsLlm, false);
  assert.equal(shouldCallModel('implement', usecase), false);
  assert.equal(handlerFor('table', 'implement'), null);
  for (const id of [ids.create, ids.list, ids.serve, ids.confirm, ids.update, ids.createMdm, ids.listMdm, ids.updateMdm]) {
    assert.equal(behaviorNeedsLlm(defOf(m, id).definition), false, id);
  }
  const archived = defOf(m, ids.listMdm).definition;
  const odd: M1Definition = { ...archived, data: { ...archived.data, operation: 'archive', ports: ['Missing'], mdm: {} } };
  assert.equal(behaviorNeedsLlm(odd), true);

  const create = await runBehavior(callFor(m, ids.create));
  const list = await runBehavior(callFor(m, ids.list));
  const port = await runBehavior(callFor(m, `${n.Entity}Repository`));
  assert.equal(create.failure, null, create.failure?.detail);
  assert.equal(list.failure, null, list.failure?.detail);
  assert.equal(port.failure, null, port.failure?.detail);
  const createSource = sourceOf(create);
  const listSource = sourceOf(list);
  const portSource = sourceOf(port);
  assert.match(createSource, new RegExp(`export async function ${ids.create}\\(`));
  assert.match(createSource, /enforce:storage/);
  assert.match(createSource, new RegExp(`ruleId: "${n.storageRule}"`));
  assert.match(createSource, new RegExp(`ports\\.${n.entity}Repository\\.create\\(record\\)`));
  assert.equal(createSource.includes('USECASE_NOT_IMPLEMENTED'), false);
  assert.equal(listSource.includes(n.coverageRule), false);
  assert.match(listSource, /return \{ items, hasMore:/);
  assert.match(portSource, /createMemoryTableRepository/);
  assert.match(portSource, /export function resetMemory/);
  assert.equal(portSource.includes("from 'pg'"), false);
  assert.equal(port.runsStub, false);
  assert.equal(create.runsStub, false);

  const outsideCall = callFor(m, ids.listMdm);
  outsideCall.definition = odd;
  const outside = await runBehavior(outsideCall);
  assert.equal(outside.failure?.code, 'NEEDS_LLM');
  assert.deepEqual(outside.files, {});
  const fakedCall = callFor(m, ids.listMdm, 'export const modelBody = 1;\n');
  fakedCall.definition = odd;
  const faked = await runBehavior(fakedCall);
  assert.equal(faked.failure, null, faked.failure?.detail);
  assert.match(sourceOf(faked), /modelBody/);

  const problems = compile(m, [
    [m.refs.entity, sourceOf(await runBehavior(callFor(m, n.Entity)))],
    [m.refs.port, portSource],
    [m.refs.uc(ids.create), createSource],
    [m.refs.uc(ids.list), listSource],
  ]);
  assert.equal(problems, '', problems);
});

void test('implement checkpoint keeps the business assertion and blocks the open gaps', async () => {
  const m = build(BASE);
  const { ids } = m;
  const catalog = catalogOf(m);
  const handler = handlerFor('usecase', 'implement');
  assert.ok(handler);
  const checkpoint = async (artifactId: string) => {
    const outcome = await runBehavior(callFor(m, artifactId));
    assert.equal(outcome.failure, null, outcome.failure?.detail);
    return verifyBatch({
      handler,
      io: { async read(ref) { return ref === CATALOG_REF ? catalog : null; } },
      catalogRef: CATALOG_REF,
      artifactId,
      observations: outcome.observations,
      runId: 'm1-06',
      commit: 'proof',
      startedAt: '2026-09-25T12:00:00.000Z',
      finishedAt: '2026-09-25T12:00:01.000Z',
      monitorError: null,
    });
  };
  const created = await checkpoint(ids.create);
  assert.equal(created.accepted, true, created.nextAction);
  assert.equal(created.counts.passed, 3);
  assert.equal(created.counts.expectedRed, 0);
  assert.equal(created.ready, true);

  const listed = await checkpoint(ids.list);
  const byId = new Map(listed.evidence.map(item => [item.caseId, item.verdict]));
  assert.equal(byId.get(`${ids.list}.compile`), 'passed');
  assert.equal(byId.get(`${ids.list}.lists`), 'blocked');
  assert.equal(byId.get(`${ids.list}.ownRows`), 'blocked');
  assert.equal(byId.get(`${ids.list}.orgProjection`), 'passed');
  assert.equal(listed.accepted, false);
  assert.equal(listed.ready, false);
  assert.match(listed.evidence.find(item => item.caseId === `${ids.list}.lists`)?.detail ?? '', /x1_04/);
  assert.match(listed.evidence.find(item => item.caseId === `${ids.list}.ownRows`)?.detail ?? '', /toPlanner/);

  const served = await checkpoint(ids.serve);
  const verdicts = new Map(served.evidence.map(item => [item.caseId, item.verdict]));
  assert.equal(verdicts.get(`${ids.serve}.compile`), 'passed');
  assert.equal(verdicts.get(`${ids.serve}.noteRequired`), 'passed');
  assert.equal(verdicts.get(`${ids.serve}.invalidTransition`), 'passed');
  assert.equal(verdicts.get(`${ids.serve}.staleVersion`), 'blocked');
  assert.equal(served.counts.failed, 0);
});

void test('behavior sources do not name the clinic fixture', () => {
  const banned = /agendaClinica|Consulta|professional|scheduledAt|uniqueProfessionalSchedule/;
  for (const name of ['emitBehavior.ts', 'runners.ts']) {
    const source = readFileSync(join(HERE, name), 'utf8');
    assert.equal(banned.test(source), false, name);
  }
});

void test('renamed fixture ids still enforce the storage constraint', async () => {
  const m = build(RENAMED);
  const { ids, n, refs, routes } = m;
  const createSource = await emit(m, ids.create);
  const portSource = await emit(m, `${n.Entity}Repository`);
  assert.match(createSource, new RegExp(n.ownerField));
  assert.match(createSource, new RegExp(`ruleId: "${n.storageRule}"`));
  assert.match(createSource, new RegExp(`${n.entity}Repository`));
  for (const token of [BASE.mod, BASE.Entity, BASE.ownerField, BASE.slot, BASE.storageRule]) assert.equal(createSource.includes(token), false, token);
  const list = defOf(m, ids.list);
  // The own page's list request is declared `kind: 'qry'`; its grant is pending ACCESS_ANCHOR.
  const blockedList = await caseBlock(list.definition, list.defPath, { routine: routes.ownRows, expect: { ruleId: null } }, reader(m), m.list);
  const blockedOwn = await caseBlock(list.definition, list.defPath, { routine: routes.ownRows, expect: { ruleId: n.coverageRule } }, reader(m), m.list);
  assert.equal(blockedList?.gap, 'ACCESS_ANCHOR');
  assert.equal(blockedOwn?.gap, 'APPLICABILITY_UNDECLARED');

  const files = scratch(m, 'm1-06-rename-');
  try {
    const memory = await memoryOf(m, files.write(refs.port, portSource));
    const created = await usecaseAt(files.write(refs.uc(ids.create), createSource), ids.create);
    const input = { [n.clientField]: 'c1', [n.ownerField]: 'agent-1', [n.slot]: '2026-09-25T13:00:00.000Z', details: {} };
    const ports = { [`${n.entity}Repository`]: memory.repository };
    memory.resetMemory([]);
    const saved = await created(input, createRequestContext(), ports);
    assert.equal(saved[n.ownerField], 'agent-1');
    assert.equal(saved[n.status], n.initial);
    memory.resetMemory([saved]);
    await assert.rejects(() => created(input, createRequestContext(), ports), rejectsWith('CONFLICT', n.storageRule));
    const disabled = withoutStorageChecks(createSource);
    assert.equal(disabled.removed, 1);
    const opened = await usecaseAt(files.write(refs.uc(ids.create), disabled.source, 'Open'), ids.create);
    memory.resetMemory([saved]);
    const second = await opened(input, createRequestContext(), ports);
    assert.equal(second[n.ownerField], 'agent-1');
  } finally {
    files.dispose();
  }

  const units = [...m.defs].map(([defPath, definition]) => ({ defPath, definition }));
  const planned = await planMaterialization({
    stage: 'implement',
    units,
    readable: [...units.flatMap(item => [item.defPath, ...item.definition.dependencies]), ...m.texts.keys(), ...Object.values(PLATFORM_FILES)],
    extraArtifacts: [
      ...units.map(item => ({ artifactType: item.definition.artifactType, artifactId: item.definition.artifactId, defPath: item.defPath })),
      // Entities the module references and does not own.
      ...['Client', n.Anchor].map(id => ({ artifactType: 'domainEntity', artifactId: id, defPath: `${n.project}/l1/${n.mod}/layer_3_domain/entities/${id.charAt(0).toLowerCase()}${id.slice(1)}.defs.ts` })),
    ],
  });
  for (const id of [ids.create, ids.serve]) {
    const unit = planned.units.find(item => item.artifactId === id);
    assert.equal(unit?.action, 'generate', `${id} ${unit?.reason}`);
    assert.equal(unit?.needsLlm, false, `${id} ${unit?.reason}`);
  }
});

void test('a transition enforces lifecycle and a required payload, and leaves the anchor rule out', async () => {
  const m = build(BASE);
  const { ids, n, refs, routes } = m;
  const serveSource = await emit(m, ids.serve);
  const confirmSource = await emit(m, ids.confirm);
  const portSource = await emit(m, `${n.Entity}Repository`);
  assert.match(serveSource, /enforce:lifecycle/);
  assert.match(serveSource, /enforce:payload/);
  assert.match(serveSource, new RegExp(`ruleId: "${n.payloadRule}"`));
  assert.match(serveSource, new RegExp(`ruleId: "${n.flowRule}"`));
  assert.equal(serveSource.includes(n.anchorRule), false);
  assert.match(serveSource, /undelivered/);
  assert.equal(serveSource.includes('publish'), false);
  assert.match(confirmSource, /enforce:lifecycle/);
  assert.equal(confirmSource.includes('enforce:payload'), false);
  const serve = defOf(m, ids.serve);
  const blockOf = (ruleId: string) => caseBlock(serve.definition, serve.defPath, { routine: routes.serve, expect: { ruleId } }, reader(m), m.list);
  const anchor = await blockOf(n.anchorRule);
  const note = await blockOf(n.payloadRule);
  const version = await blockOf('expectedVersion');
  assert.equal(anchor?.gap, 'ACCESS_ANCHOR');
  assert.equal(note, null);
  assert.equal(version?.gap, 'PRECONDITION_UNDECLARED');
  assert.equal(version?.owner, 'x1_05');

  const problems = compile(m, [
    [refs.entity, await emit(m, n.Entity)],
    [refs.port, portSource],
    [refs.uc(ids.serve), serveSource],
    [refs.uc(ids.confirm), confirmSource],
  ]);
  assert.equal(problems, '', problems);

  const files = scratch(m, 'm1-06-transition-');
  try {
    const memory = await memoryOf(m, files.write(refs.port, portSource));
    const served = await usecaseAt(files.write(refs.uc(ids.serve), serveSource), ids.serve);
    const confirmed = await usecaseAt(files.write(refs.uc(ids.confirm), confirmSource), ids.confirm);
    const ports = { [`${n.entity}Repository`]: memory.repository };
    const ctx = {};
    const row = { id: 'b-1', version: 2, [n.clientField]: 'c-1', [n.ownerField]: 'a-1', [n.slot]: '2026-09-25T13:00:00.000Z', [n.status]: n.initial, details: { [n.note]: '' } };
    memory.resetMemory([row]);
    await assert.rejects(() => served({ id: 'b-1', details: { [n.note]: '' } }, ctx, ports), rejectsWith('VALIDATION_ERROR', n.payloadRule));
    memory.resetMemory([{ ...row, [n.status]: n.missed, details: { [n.note]: 'seen' } }]);
    await assert.rejects(() => served({ id: 'b-1', details: { [n.note]: 'seen' } }, ctx, ports), rejectsWith('VALIDATION_ERROR', n.flowRule));
    memory.resetMemory([row]);
    const saved = await served({ id: 'b-1', details: { [n.note]: 'seen' } }, ctx, ports);
    assert.equal(saved[n.status], n.done);
    assert.equal((saved.details as Row)[n.note], 'seen');
    const opened = withoutPayloadChecks(serveSource);
    assert.equal(opened.removed, 1);
    const openServe = await usecaseAt(files.write(refs.uc(ids.serve), opened.source, 'Open'), ids.serve);
    memory.resetMemory([row]);
    assert.equal((await openServe({ id: 'b-1', details: {} }, ctx, ports))[n.status], n.done);
    memory.resetMemory([row]);
    assert.equal((await confirmed({ id: 'b-1' }, ctx, ports))[n.status], n.confirmed);
    memory.resetMemory([{ ...row, [n.status]: n.done }]);
    await assert.rejects(() => confirmed({ id: 'b-1' }, ctx, ports), rejectsWith('VALIDATION_ERROR', n.flowRule));
  } finally {
    files.dispose();
  }
});

void test('a transition enforces from/to and payload without picking one lifecycle rule', async () => {
  // Three local rules, none an entity invariant and none named after the payload: no rule id is chosen.
  const unclaimed = (n: Names) => (definition: M1Definition): M1Definition => definition.artifactId !== `serve${n.Entity}` ? definition : {
    ...definition,
    data: {
      ...definition.data,
      rulePlan: ['ruleAlpha', 'ruleBeta', 'ruleGamma'].map(ruleId => ({ ruleId, origin: `l4/${n.mod}/rules.defs.ts#${ruleId}`, consumer: `usecase:serve${n.Entity}`, enforcement: 'local', gap: '' })),
    },
  };
  const sources = new Map<Names, string>();
  for (const n of [BASE, RENAMED]) {
    const m = build(n, { patch: unclaimed(n) });
    const source = await emit(m, m.ids.serve);
    assert.match(source, /enforce:lifecycle/);
    assert.match(source, /enforce:payload/);
    assert.match(source, new RegExp(`\\["${n.initial}"\\]`));
    assert.match(source, new RegExp(`"${n.done}"`));
    assert.match(source, new RegExp(`"details\\.${n.note}"`));
    for (const ruleId of ['ruleAlpha', 'ruleBeta', 'ruleGamma', n.flowRule, n.payloadRule]) assert.equal(source.includes(ruleId), false, ruleId);
    sources.set(n, source);
  }
  for (const token of [BASE.initial, BASE.done, BASE.note]) assert.equal(sources.get(RENAMED)?.includes(`"${token}"`), false, token);

  const m = build(BASE, { patch: unclaimed(BASE) });
  const { ids, n, refs } = m;
  const serveSource = sources.get(BASE) ?? '';
  const portSource = await emit(m, `${n.Entity}Repository`);
  const problems = compile(m, [[refs.entity, await emit(m, n.Entity)], [refs.port, portSource], [refs.uc(ids.serve), serveSource]]);
  assert.equal(problems, '', problems);
  const files = scratch(m, 'm1-11-transition-');
  try {
    const memory = await memoryOf(m, files.write(refs.port, portSource));
    const served = await usecaseAt(files.write(refs.uc(ids.serve), serveSource), ids.serve);
    const ports = { [`${n.entity}Repository`]: memory.repository };
    const row = { id: 'b-1', version: 1, [n.clientField]: 'c-1', [n.ownerField]: 'a-1', [n.slot]: '2026-09-25T13:00:00.000Z', [n.status]: n.initial, details: { [n.note]: '' } };
    memory.resetMemory([row]);
    await assert.rejects(() => served({ id: 'b-1', details: { [n.note]: '' } }, {}, ports), rejectsWith('VALIDATION_ERROR'));
    memory.resetMemory([{ ...row, [n.status]: n.missed, details: { [n.note]: 'seen' } }]);
    await assert.rejects(() => served({ id: 'b-1', details: { [n.note]: 'seen' } }, {}, ports), rejectsWith('VALIDATION_ERROR'));
    memory.resetMemory([row]);
    assert.equal((await served({ id: 'b-1', details: { [n.note]: 'seen' } }, {}, ports))[n.status], n.done);
    const openNote = withoutPayloadChecks(serveSource);
    const openState = withoutLifecycleChecks(serveSource);
    assert.equal(openNote.removed, 1);
    assert.equal(openState.removed, 1);
    const noteModule = await usecaseAt(files.write(refs.uc(ids.serve), openNote.source, 'OpenNote'), ids.serve);
    const stateModule = await usecaseAt(files.write(refs.uc(ids.serve), openState.source, 'OpenState'), ids.serve);
    memory.resetMemory([row]);
    assert.equal((await noteModule({ id: 'b-1', details: {} }, {}, ports))[n.status], n.done);
    memory.resetMemory([{ ...row, [n.status]: n.missed, details: { [n.note]: 'seen' } }]);
    assert.equal((await stateModule({ id: 'b-1', details: { [n.note]: 'seen' } }, {}, ports))[n.status], n.done);
  } finally {
    files.dispose();
  }
});

void test('mdm create attaches an existing record and update rejects a stale version', async () => {
  const m = build(BASE);
  const { ids, n, refs } = m;
  const createSource = await emit(m, ids.createMdm);
  const updateSource = await emit(m, ids.updateMdm);
  assert.match(createSource, /enforce:create/);
  assert.match(createSource, /findByDocument/);
  assert.match(createSource, /attachRole/);
  assert.match(updateSource, /enforce:version/);
  assert.match(updateSource, /readPath\(body, "version"\)/);
  assert.match(await emit(m, ids.listMdm), /listByType/);
  const openCreate = withoutCreateChecks(createSource);
  const openUpdate = withoutVersionChecks(updateSource);
  assert.equal(openCreate.removed, 1);
  assert.equal(openUpdate.removed, 1);

  const files = scratch(m, 'm1-06-mdm-');
  try {
    type Mdm = (input: Row, ctx: unknown) => Promise<{ id: string; version: number }>;
    const createAt = async (source: string, suffix: string) => await usecaseAt(files.write(refs.uc(ids.createMdm), source, suffix), ids.createMdm) as unknown as Mdm;
    const updateAt = async (source: string, suffix: string) => await usecaseAt(files.write(refs.uc(ids.updateMdm), source, suffix), ids.updateMdm) as unknown as Mdm;
    const created = await createAt(createSource, '');
    const updated = await updateAt(updateSource, '');
    const openCreated = await createAt(openCreate.source, 'Open');
    const openUpdated = await updateAt(openUpdate.source, 'Open');
    const ctx = createRequestContext(createMemoryDataRuntime(), { sandbox: true, moduleId: n.mod });
    const seen: string[] = [];
    const entity = ctx.mdm.entity as unknown as Record<string, (...args: never[]) => Promise<unknown>>;
    for (const name of ['findByDocument', 'create', 'attachRole']) {
      const original = entity[name];
      entity[name] = (async (...args: never[]) => {
        seen.push(name);
        return original.apply(ctx.mdm.entity, args);
      }) as typeof original;
    }
    const input = { details: { identification: { name: 'Ada', docType: 'Passport', docId: 'DOC1', countryCode: 'US' }, base: { aliases: ['Ada'] } } };
    const first = await created(input, ctx);
    assert.equal(seen.includes('findByDocument') && seen.includes('create') && seen.includes('attachRole'), true);
    const before = seen.filter(name => name === 'create').length;
    const second = await created(input, ctx);
    assert.equal(second.id, first.id);
    assert.equal(seen.filter(name => name === 'create').length, before);
    const openCtx = createRequestContext(createMemoryDataRuntime(), { sandbox: true, moduleId: n.mod });
    const openSeen: string[] = [];
    const openEntity = openCtx.mdm.entity as unknown as Record<string, (...args: never[]) => Promise<unknown>>;
    const openCreateFn = openEntity.create;
    openEntity.create = (async (...args: never[]) => {
      openSeen.push('create');
      return openCreateFn.apply(openCtx.mdm.entity, args);
    }) as typeof openCreateFn;
    await openCreated(input, openCtx);
    await openCreated(input, openCtx);
    assert.equal(openSeen.length, 2);

    const seeded = await ctx.mdm.entity.create({ details: { subtype: 'Person', name: 'Ada', countryCode: 'US', docType: 'Passport', docId: 'DOCother' } });
    const patch = {
      id: seeded.mdmId,
      version: seeded.version,
      details: { identification: { name: 'Ada Updated', docType: 'Passport', docId: 'DOCother', countryCode: 'US' }, person: { occupation: 'guide' } },
    };
    const saved = await updated(patch, ctx);
    assert.equal(saved.id, seeded.mdmId);
    await assert.rejects(() => updated(patch, ctx), rejectsWith('CONCURRENCY_CONFLICT'));
    const stale = await openUpdated({ ...patch, id: saved.id, version: seeded.version }, ctx);
    assert.equal(stale.id, seeded.mdmId);
  } finally {
    files.dispose();
  }

  const read = reader(m);
  const hidden = await emitBehavior('implement.usecase', defOf(m, ids.updateMdm).definition, outputPathFromDefPath(refs.uc(ids.updateMdm)), async ref => {
    const text = await read(ref);
    if (text === null) return null;
    if (ref.includes('/ontology/')) return text.replaceAll('"writePrecondition": true', '"writePrecondition": false');
    return text;
  }, m.list);
  assert.equal('code' in hidden, false);
  if (!('code' in hidden)) {
    assert.match(hidden.source, /PRECONDITION_UNDECLARED/);
    assert.equal(hidden.source.includes('enforce:version'), false);
  }
});

void test('a resolved scope path filters the list and an injected field does not widen it', async () => {
  const m = build(BASE, { ownPending: false });
  const { ids, n, refs, routes } = m;
  const list = defOf(m, ids.list);
  const blockOf = (ruleId: string | null, modules: readonly unknown[] = m.list) => caseBlock(list.definition, list.defPath, { routine: routes.ownRows, expect: { ruleId } }, reader(m), modules);
  assert.equal(await blockOf(null), null);
  assert.equal((await blockOf(n.coverageRule))?.gap, 'APPLICABILITY_UNDECLARED');
  // The same scope with no record path: the own grant has nothing to bind.
  const pathless = m.list.map(item => item.artifactType !== 'accessScope' ? item : {
    ...item,
    data: { ...item.data, grants: (item.data.grants as Row[]).map(grant => grant.scopeMode === 'own' ? { ...grant, path: [] } : grant) },
  });
  assert.equal((await blockOf(null, pathless))?.gap, 'ACCESS_ANCHOR');
  const E = n.Entity;
  const hop = (to: string, field: string) => ({ from: E, to, field: `${E}.${field}` });
  assert.equal(recordFieldFromGrant({ scopeMode: 'own', anchorEntity: 'Client', path: [{ entityId: E, steps: [hop('Client', n.clientField)], pending: '' }] }), n.clientField);
  assert.equal(recordFieldFromGrant({ scopeMode: 'own', anchorEntity: 'Client', path: [hop('Client', n.clientField)] }), n.clientField);
  assert.equal(recordFieldFromGrant({ scopeMode: 'own', anchorEntity: n.Anchor, path: [] }), '');
  assert.equal(recordFieldFromGrant({ scopeMode: 'own', anchorEntity: n.Anchor, path: [hop(n.Anchor, n.ownerField), hop('Client', n.clientField)] }), '');

  const controller = await emitAt(m, refs.ctrl(n.pageOwn));
  assert.match(controller, /enforce:scope/);
  const stripped = withoutScopeChecks(controller);
  assert.equal(stripped.removed, 1);
  // v2: the usecase returns the row; what each route discloses is the page request's projection (derivationDisclosure).
  const listSource = await emit(m, ids.list);
  const sources = new Map<string, string>([
    [refs.entity, await emit(m, E)],
    [refs.port, await emit(m, `${E}Repository`)],
    [refs.scope, await emitAt(m, refs.scope)],
    [refs.authority, await emitAt(m, refs.authority)],
    [refs.uc(ids.list), listSource],
    [refs.uc(ids.serve), await emit(m, ids.serve)],
    [refs.request(n.pageOwn), await emitAt(m, refs.request(n.pageOwn))],
  ]);
  const rows: Row[] = [
    { id: 'b-1', version: 1, [n.clientField]: 'c-1', [n.ownerField]: 'a-1', [n.slot]: '2026-09-25T13:00:00.000Z', [n.status]: n.initial, details: { [n.note]: '' } },
    { id: 'b-2', version: 1, [n.clientField]: 'c-2', [n.ownerField]: 'a-2', [n.slot]: '2026-09-25T15:00:00.000Z', [n.status]: n.initial, details: { [n.note]: '' } },
  ];
  const listAs = async (controllerSource: string, prefix: string): Promise<string[]> => {
    const files = scratch(m, prefix);
    try {
      for (const [ref, source] of sources) files.write(ref, source);
      const memory = await memoryOf(m, files.write(refs.port, sources.get(refs.port) ?? ''));
      const module = await import(files.write(refs.ctrl(n.pageOwn), controllerSource)) as { routes: Array<{ key: string; handler: (input: unknown) => Promise<{ data: unknown }> }> };
      clearRepositories();
      registerRepository(`${E}Repository`, () => memory.repository as never);
      memory.resetMemory(rows);
      const handler = module.routes.find(item => item.key === routes.ownRows)?.handler;
      assert.ok(handler, routes.ownRows);
      const ctx = createRequestContext();
      ctx.sessionContext.actorId = 'a-1';
      // The caller names another owner in the body.
      const response = await handler({ request: { routine: routes.ownRows, params: { [n.ownerField]: 'a-2' }, meta: { source: 'http', verifiedAuthorities: [`${n.mod}:${n.owner}`] } }, ctx });
      return ((response.data as Row)[`${n.entity}s`] as Row[]).map(row => String(row.id));
    } finally {
      clearRepositories();
      files.dispose();
    }
  };
  assert.deepEqual(await listAs(controller, 'm1-10-scope-'), ['b-1']);
  assert.deepEqual(await listAs(stripped.source, 'm1-10-widened-'), ['b-2']);
});

void test('a local table update is derived and proved on a module built in the test', async () => {
  const m = build(BASE);
  const { ids, n, refs } = m;
  const update = defOf(m, ids.update);
  assert.equal(behaviorNeedsLlm(update.definition), false);
  const updateSource = await emit(m, ids.update);
  assert.equal(updateSource.includes('enforce:storage'), false);
  assert.equal(updateSource.includes('enforce:version'), false);
  assert.equal(updateSource.includes('RULE_UNBOUND'), false);
  const versionGap = await caseBlock(update.definition, update.defPath, { routine: '', expect: { ruleId: 'expectedVersion' } }, reader(m), m.list);
  assert.equal(versionGap?.gap, 'PRECONDITION_UNDECLARED');
  const portSource = await emit(m, `${n.Entity}Repository`);
  const problems = compile(m, [[refs.entity, await emit(m, n.Entity)], [refs.port, portSource], [refs.uc(ids.update), updateSource]]);
  assert.equal(problems, '', problems);

  const details = { [n.check]: { doneAt: '' }, [n.note]: '' };
  const first: Row = { id: 'row-1', version: 1, [n.clientField]: 'p1', [n.ownerField]: 'pro-1', [n.slot]: '2026-09-26T13:00:00.000Z', [n.status]: n.initial, details };
  const second: Row = { id: 'row-2', version: 1, [n.clientField]: 'p2', [n.ownerField]: 'pro-1', [n.slot]: '2026-09-26T15:00:00.000Z', [n.status]: n.initial, details };
  const checked = { details: { [n.check]: { doneAt: '2026-09-26T12:00:00.000Z' } } };
  const files = scratch(m, 'm1-17-update-');
  try {
    const memory = await memoryOf(m, files.write(refs.port, portSource));
    const updated = await usecaseAt(files.write(refs.uc(ids.update), updateSource), ids.update);
    const ports = { [`${n.entity}Repository`]: memory.repository };
    const ctx = {};
    memory.resetMemory([first, second]);
    const saved = await updated({ ...first, ...checked }, ctx, ports);
    assert.equal(saved.id, 'row-1');
    assert.equal(saved[n.clientField], 'p1');
    const savedDetails = saved.details as Record<string, Row>;
    assert.equal(savedDetails[n.check].doneAt, '2026-09-26T12:00:00.000Z');
    assert.equal(savedDetails[n.note], details[n.note]);
    assert.equal(details[n.check].doneAt, '', 'the stored seed is not mutated');
    assert.equal(saved.version, 1);
    memory.resetMemory([first]);
    const omitted = await updated({ id: first.id }, ctx, ports);
    assert.deepEqual(omitted.details, first.details, 'an absent patch value is not written as undefined');
    memory.resetMemory([first, second]);
    const unchanged = await updated({ ...first, ...checked, [n.slot]: second[n.slot] }, ctx, ports);
    assert.equal(unchanged[n.slot], first[n.slot]);
    memory.resetMemory([first]);
    await assert.rejects(() => updated({ ...first, id: 'missing' }, ctx, ports), rejectsWith('NOT_FOUND'));
    const opened = withoutStorageChecks(updateSource);
    assert.equal(opened.removed, 0);
    const openUpdate = await usecaseAt(files.write(refs.uc(ids.update), opened.source, 'Open'), ids.update);
    memory.resetMemory([first, second]);
    assert.equal((await openUpdate({ ...first, ...checked, [n.slot]: second[n.slot] }, ctx, ports))[n.slot], first[n.slot]);

    // The l4 entity marks `version` as the write precondition and the signature carries it.
    const marked = build(BASE, {
      versionPrecondition: true,
      patch: definition => definition.artifactId !== ids.update ? definition : {
        ...definition,
        data: { ...definition.data, functions: (definition.data.functions as Row[]).map(fn => ({ ...fn, input: [...(fn.input as Row[]), { name: 'version', type: 'integer', fieldRef: `${n.Entity}.version` }] })) },
      },
    });
    const versioned = await emit(marked, ids.update);
    assert.match(versioned, /enforce:version/);
    const versionUpdate = await usecaseAt(files.write(refs.uc(ids.update), versioned, 'Version'), ids.update);
    memory.resetMemory([{ ...first, version: 2 }, second]);
    assert.equal((await versionUpdate({ ...first, version: 2, [n.clientField]: 'p8' }, ctx, ports)).version, 3);
    memory.resetMemory([{ ...first, version: 2 }, second]);
    await assert.rejects(() => versionUpdate({ ...first, version: 1 }, ctx, ports), rejectsWith('CONCURRENCY_CONFLICT'));
  } finally {
    files.dispose();
  }

  const r = build(RENAMED);
  const renamedUpdate = await emit(r, r.ids.update);
  const renamedPort = await emit(r, `${RENAMED.Entity}Repository`);
  for (const token of [BASE.mod, BASE.Entity, BASE.ownerField, BASE.slot, BASE.check, BASE.storageRule]) assert.equal(renamedUpdate.includes(token), false, token);
  const renamedFiles = scratch(r, 'm1-17-renamed-');
  try {
    const memory = await memoryOf(r, renamedFiles.write(r.refs.port, renamedPort));
    const updated = await usecaseAt(renamedFiles.write(r.refs.uc(r.ids.update), renamedUpdate), r.ids.update);
    const rn = RENAMED;
    const rowOf = (id: string, slot: string): Row => ({ id, version: 1, [rn.clientField]: 'p1', [rn.ownerField]: 'pro-1', [rn.slot]: slot, [rn.status]: rn.initial, details: { [rn.check]: { doneAt: '' }, [rn.note]: 'kept' } });
    const row = rowOf('row-1', '2026-09-26T13:00:00.000Z');
    const other = rowOf('row-2', '2026-09-26T15:00:00.000Z');
    memory.resetMemory([row, other]);
    const saved = await updated({ ...row, details: { [rn.check]: { doneAt: '2026-09-26T12:00:00.000Z' } }, [rn.slot]: other[rn.slot] }, {}, { [`${rn.entity}Repository`]: memory.repository });
    assert.equal(saved[rn.slot], row[rn.slot]);
    const savedDetails = saved.details as Record<string, Row>;
    assert.equal(savedDetails[rn.note], 'kept');
    assert.equal(savedDetails[rn.check].doneAt, '2026-09-26T12:00:00.000Z');
  } finally {
    renamedFiles.dispose();
  }
});
