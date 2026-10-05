/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/ownerlessAggregate.test.ts" enhancement="_blank"/>

/**
 * d1_65: an output that is only an aggregate no entity owns (indicators: a count, a sum) has its authority from the
 * route grants that exist in the L4 access artifact, and is disclosed to them by the one rule the M1 reads too. The
 * first route has the shape that stopped the live run (task 20261005045529.1001, bench 83b4de0,
 * `inicio.carregarResumoOperacional`), with the access line the parser keeps greedy. Ids are arbitrary.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import type { D1RequestGapAnswer } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import type { D1ControllerBuild, D1ControllerGrant, D1ControllerRequest, D1ServiceRequestSource } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { emitRequestService, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { nodeDisclosure } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

const MOD = 'yyDock';
const PAGE = 'dock';
const TALLY = `${MOD}.${PAGE}.loadTally`;
const USECASE_PATH = `_900003_/l1/${MOD}/layer_2_application/usecases/listCrate.defs.ts`;
const MIXED = `${MOD}.${PAGE}.listWithTally`;

const contract = (tallyGrants: string, mixedGrants: string, withMixed: boolean) => `/// <mls fileReference="_900003_/l2/${MOD}/web/contracts/${PAGE}.defs.ts" enhancement="_blank"/>

/** Indicators of the dock, owned by no entity. */
export interface Tally {
  readonly freeBays: number;
  readonly openValue: number;
}

export interface CrateRow {
  id: string;
  label: string;
}

export interface DockContracts {
  /**
   * Finalidade: Carrega os indicadores do cais.
   * Entrada: Nenhuma.
   * Processamento: Conta as baias livres e soma o valor das caixas abertas, pela regra openValueRule.
   * Saída: Os indicadores agregados.
   */
  '${TALLY}': {
    kind: 'qry';
    input: {};
    output: { tally: Tally };
    rules: ['openValueRule'];
    access: { actors: ['loader', 'auditor']; grants: [${tallyGrants}]; scope: 'organization' };
  };${withMixed ? `
  /**
   * Finalidade: Lista as caixas com os indicadores.
   * Entrada: Nenhuma.
   * Processamento: Lê as caixas, conta as baias livres e soma o valor aberto.
   * Saída: As caixas e o indicador.
   */
  '${MIXED}': {
    kind: 'qry';
    input: {};
    output: { crates: CrateRow[]; tally: Tally };
    rules: ['openValueRule'];
    access: { actors: ['loader']; grants: [${mixedGrants}]; scope: 'organization' };
  };` : ''}
}
`;

const ENTITIES: Record<string, unknown> = {
  Crate: {
    entityId: 'Crate',
    record: { fields: { id: { type: 'uuid', derived: true }, version: { type: 'integer', derived: true }, label: { type: 'string' } } },
  },
};

const grant = (grantId: string, actorRef: string, entityRefs: string[], disclosure: D1ControllerGrant['disclosure'], allowedFields: string[]): D1ControllerGrant =>
  ({ grantId, actorRef, entityRefs, disclosure, allowedFields, anchorEntity: '', scopeMode: 'organization' });

/** The L4 grants: one per actor of the page, about the one entity there is (as the bench grants are about records). */
const L4_GRANTS = [
  grant('loaderDock', 'loader', ['Crate'], 'fieldsOnly', ['Crate.label']),
  grant('auditorDock', 'auditor', ['Crate'], 'fullRecord', []),
];

/** input20 + resolve25 stand-in: each gap with one candidate and `none` takes the candidate. */
function selected(source: string, route: string, uses: string[]): D1ServiceRequestSource {
  const definition = readContractV2(source);
  assert.ok(definition, 'the contract parses');
  const found = definition.routes.find(item => item.route === route);
  assert.ok(found, route);
  const first = applyResolutions({ route: found, definition, entities: ENTITIES }, []);
  const answers: D1RequestGapAnswer[] = first.unresolved.filter(gap => gap.candidates.length === 2).map(gap => ({ path: gap.path, choice: gap.candidates[0] }));
  const result = applyResolutions({ route: found, definition, entities: ENTITIES }, answers);
  return {
    route,
    pageId: PAGE,
    kind: found.kind,
    uses,
    outputs: result.outputs,
    params: result.params,
    ...(result.computedBy.length ? { computedBy: result.computedBy } : {}),
    ...(result.unresolved.length ? { unresolved: result.unresolved } : {}),
  };
}

function request(options: { tallyGrants?: string; mixedGrants?: string; grants?: D1ControllerGrant[]; routes?: string[] } = {}): D1ControllerRequest {
  const routes = options.routes ?? [TALLY, MIXED];
  const contractSource = contract(options.tallyGrants ?? `'loaderDock', 'auditorDock'`, options.mixedGrants ?? `'loaderDock'`, routes.includes(MIXED));
  return {
    project: 900003,
    moduleName: MOD,
    pages: [{ pageId: PAGE, actors: ['loader', 'auditor'], defPath: `l1/${MOD}/layer_1_external/adapters/http/controllers/${PAGE}.defs.ts` }],
    usecases: [{ usecaseId: 'listCrate', entity: 'Crate', operation: 'list', status: 'toCreate', functionName: '', defPath: `l1/${MOD}/layer_2_application/usecases/listCrate.defs.ts` }],
    grants: options.grants ?? L4_GRANTS.map(item => ({ ...item })),
    relationships: [],
    contracts: [{ pageId: PAGE, path: `l2/${MOD}/web/contracts/${PAGE}.defs.ts`, source: contractSource }],
    existing: [],
    enumerations: [],
    accessRead: true,
    actorsRead: true,
    serviceRequests: routes.map(route => selected(contractSource, route, route === MIXED ? ['listCrate'] : [])),
    ontology: ENTITIES,
  };
}

const errorsOf = (build: D1ControllerBuild, route: string) => build.problems.filter(item => item.severity === 'error' && item.path === route);
const codes = (build: D1ControllerBuild, route: string) => build.problems.filter(item => item.path === route).map(item => item.code);
const handlerOf = (build: D1ControllerBuild, route: string) => build.controllers.flatMap(item => item.handlers).find(item => item.route === route);

void test('an output that is only an aggregate takes its authority from the route grants in L4; the def keeps the computed node, the rules and the JSDoc', () => {
  const build = buildD1Controllers(request({ routes: [TALLY] }));
  assert.deepEqual(codes(build, TALLY), [], JSON.stringify(errorsOf(build, TALLY)));
  assert.deepEqual(handlerOf(build, TALLY)?.grantIds, ['loaderDock', 'auditorDock']);
  assert.equal(build.ok, true, JSON.stringify(build.problems));
  const row = build.services.find(item => item.pageId === PAGE)?.requests.find(item => item.route === TALLY);
  assert.ok(row);
  assert.deepEqual(row.output, [{ kind: 'computed', path: 'tally', rules: ['openValueRule'] }]);
  assert.deepEqual(row.rules, ['openValueRule']);
  assert.equal(row.doc?.processing?.includes('Conta as baias livres'), true, JSON.stringify(row.doc));
  assert.equal(build.emit.some(item => item.definition.artifactType === 'requestService'), true);
});

void test('a route grant the L4 does not have, or of an actor the page does not have, is an error on that route; with no valid grant, NO_AUTHORITY', () => {
  const ghost = buildD1Controllers(request({ routes: [TALLY], tallyGrants: `'loaderDock', 'ghostDock'` }));
  assert.deepEqual(codes(ghost, TALLY), ['CONTRACT_ACCESS_DIVERGENT']);
  assert.equal(ghost.problems.find(item => item.code === 'CONTRACT_ACCESS_DIVERGENT')?.severity, 'review');
  assert.equal(ghost.problems.find(item => item.path === TALLY)?.message.includes('ghostDock'), true);
  assert.equal(handlerOf(ghost, TALLY), undefined);
  assert.equal(ghost.ok, true, JSON.stringify(errorsOf(ghost, TALLY)));

  const otherActor = buildD1Controllers(request({ routes: [TALLY], grants: [...L4_GRANTS, grant('clerkDock', 'clerk', ['Crate'], 'fullRecord', [])], tallyGrants: `'clerkDock'` }));
  assert.deepEqual(codes(otherActor, TALLY).sort(), ['COMPUTED_NOT_DISCLOSED', 'CONTRACT_ACCESS_DIVERGENT', 'NO_AUTHORITY']);
  assert.equal(handlerOf(otherActor, TALLY), undefined);
  assert.equal(otherActor.services.flatMap(item => item.requests).find(item => item.route === TALLY)?.output[0].kind, 'unresolved');

  // No grant at all: the aggregate is not disclosed either (closed by default). The gap is declared; nothing is emitted as a handler.
  const none = buildD1Controllers(request({ routes: [TALLY], tallyGrants: `'ghostDock'` }));
  assert.deepEqual(codes(none, TALLY).sort(), ['COMPUTED_NOT_DISCLOSED', 'CONTRACT_ACCESS_DIVERGENT', 'NO_AUTHORITY']);
  assert.equal(none.problems.some(item => item.code === 'AUTHORITY_REQUIRED'), false);
  assert.equal(handlerOf(none, TALLY), undefined);
  assert.equal(none.services.flatMap(item => item.requests).find(item => item.route === TALLY)?.output[0].kind, 'unresolved');
  assert.equal(none.emit.some(item => item.definition.artifactType === 'httpController'), false);
});

void test('a route with an entity output and an aggregate keeps the entity authority; the aggregate needs a valid route grant among it', () => {
  const ok = buildD1Controllers(request());
  assert.deepEqual(codes(ok, MIXED), [], JSON.stringify(errorsOf(ok, MIXED)));
  assert.deepEqual(handlerOf(ok, MIXED)?.grantIds, ['loaderDock', 'auditorDock']);
  const row = ok.services.find(item => item.pageId === PAGE)?.requests.find(item => item.route === MIXED);
  assert.deepEqual(row?.output.map(node => `${node.kind} ${node.path}`), ['list crates', 'computed tally']);

  // The route names a grant the L4 has, but of no actor of the page: the entity grants hold, the aggregate does not.
  const uncovered = buildD1Controllers(request({ grants: [...L4_GRANTS, grant('clerkDock', 'clerk', ['Crate'], 'fullRecord', [])], mixedGrants: `'clerkDock'` }));
  assert.deepEqual(codes(uncovered, MIXED), ['CONTRACT_ACCESS_DIVERGENT', 'NO_AUTHORITY']);
  assert.equal(handlerOf(uncovered, MIXED), undefined);
  assert.equal(uncovered.services.flatMap(item => item.requests).find(item => item.route === MIXED)?.output[0].kind, 'unresolved');
  assert.equal(uncovered.ok, true, JSON.stringify(errorsOf(uncovered, MIXED)));
});

const def = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition =>
  ({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies, data } as M1Definition);
const detail = (result: EmitResult | EmitFailure): string => 'code' in result ? result.detail : 'ok';

/**
 * The M1 reads the def the D1 wrote, with the route grants the controller names. An output that is only an aggregate
 * uses no usecase, so the M1 refuses it by name before any shape (`USECASE_UNBOUND`); the route that also reads an
 * entity reaches the disclosure rule, which releases the aggregate to the route grants, and then the shape refusal.
 */
void test('the M1 discloses the aggregate by the same rule to the route grants, then refuses its shape by name', async () => {
  const build = buildD1Controllers(request());
  const service = def('requestService', PAGE, [USECASE_PATH], { pageId: PAGE, requests: build.services.find(item => item.pageId === PAGE)?.requests ?? [] });
  const scope = def('accessScope', 'accessScope', [], {
    scopeId: 'accessScope',
    grants: L4_GRANTS.map(item => ({ grantId: item.grantId, actorRef: item.actorRef, entityRefs: item.entityRefs, disclosure: item.disclosure, allowedFields: item.allowedFields })),
  });
  const controller = def('httpController', PAGE, [], {
    pageId: PAGE,
    handlers: [TALLY, MIXED].map(route => ({ route, kind: 'query', grantIds: handlerOf(build, route)?.grantIds ?? [], serviceFunction: route, contractPath: `l2/${MOD}/web/contracts/${PAGE}.defs.ts`, contractInterface: 'DockContracts' })),
  });
  const crate = def('domainEntity', 'Crate', [], {
    entityId: 'Crate', storageTarget: 'moduleDatabase', lifecycle: { states: [], transitions: [] }, invariants: [], imports: [],
    fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'version', type: 'integer', derived: true }, { name: 'label', type: 'string' }],
  });
  const usecase = def('usecase', 'listCrate', [], {
    usecaseId: 'listCrate', entityId: 'Crate', operation: 'list', ports: [],
    functions: [{ functionName: 'listCrate', input: [], output: [{ name: 'items', type: 'Crate' }] }],
  });
  const read = async (ref: string) => ref === USECASE_PATH ? `export const definition = ${JSON.stringify(usecase)} as const;\n` : null;
  const OUT = `l1/${MOD}/layer_2_application/requests/${PAGE}.ts`;
  const only = (route: string): M1Definition => ({ ...service, data: { ...service.data, requests: (service.data.requests as Array<{ route: string }>).filter(item => item.route === route) } });
  assert.equal(detail(await emitRequestService(only(TALLY), OUT, read, [crate, scope, controller], 'structure')), `${TALLY} uses no usecase.`);
  assert.equal(detail(await emitRequestService(only(MIXED), OUT, read, [crate, scope, controller], 'structure')), `REQUEST_SHAPE_UNSUPPORTED: ${MIXED} tally computed`);
});

void test('the aggregate rule is closed without a grant, or when a grant declares no mode (an undeclared grant is read as {})', () => {
  const node = { kind: 'computed' as const, field: 'tally', entity: '' };
  const declared = { disclosure: 'fieldsOnly', allowedFields: ['Crate.label'], entityRefs: ['Crate'] };
  const undeclared = { disclosure: '', allowedFields: [], entityRefs: [] };
  const none = () => undefined;
  assert.equal(nodeDisclosure([declared], node, none), 'disclosed');
  assert.equal(nodeDisclosure([], node, none), 'computed');
  assert.equal(nodeDisclosure([undeclared], node, none), 'computed');
  assert.equal(nodeDisclosure([declared, undeclared], node, none), 'computed');
});
