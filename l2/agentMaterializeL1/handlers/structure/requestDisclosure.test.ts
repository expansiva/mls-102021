/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/requestDisclosure.test.ts" enhancement="_blank"/>

/**
 * m1_41 b1-P3: the grant still bounds what a v2 page request returns. Every projected field fits what
 * each grant of the route discloses (same rule as the v1 controller); otherwise the request is refused
 * with `DISCLOSURE_EXCEEDS_GRANT: <route> <field>`, at structure and at implement. Ids are arbitrary.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitRequestService, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const P = '_900003_';
const MOD = 'yyDock';
const L1 = `${P}/l1/${MOD}`;
const UC = `${L1}/layer_2_application/usecases/listJjCrate.defs.ts`;
const OUT = 'l1/yyDock/layer_2_application/requests/bay.ts';
const ROUTE = `${MOD}.bay.crateRows`;

const def = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition =>
  ({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies, data } as M1Definition);

const usecase = def('usecase', 'listJjCrate', [], {
  usecaseId: 'listJjCrate', entityId: 'JjCrate', operation: 'list', ports: [],
  functions: [{ functionName: 'listJjCrate', input: [{ name: 'id', type: 'uuid', fieldRef: 'JjCrate.id' }], output: [{ name: 'items', type: 'JjCrate' }] }],
});
const service = (fields: string[]) => def('requestService', 'bay', [UC], {
  pageId: 'bay',
  requests: [{ route: ROUTE, kind: 'qry', uses: ['listJjCrate'], transaction: 'none', outputs: [{ key: 'crates', entity: 'JjCrate', fields }], params: [] }],
});
const grant = (grantId: string, disclosure: string, allowedFields?: string[]) => ({
  grantId, actorRef: 'loader', entityRefs: ['JjCrate'], disclosure, ...(allowedFields ? { allowedFields } : {}),
  scopeMode: 'organization', session: 'verified', path: [{ entityId: 'JjCrate', steps: [], pending: '' }], pending: '',
});
const scope = (grants: unknown[]) => def('accessScope', 'accessScope', [], { scopeId: 'accessScope', grants });
const controller = (grantIds: string[]) => def('httpController', 'bay', [], {
  pageId: 'bay',
  handlers: [{ route: ROUTE, kind: 'query', grantIds, serviceFunction: ROUTE, contractPath: `l2/${MOD}/web/contracts/bay.defs.ts`, contractInterface: 'BayContracts' }],
});
const read = async (ref: string) => ref === UC ? `export const definition = ${JSON.stringify(usecase)} as const;\n` : null;

async function emit(fields: string[], modules: unknown[], stage: 'structure' | 'implement' = 'structure'): Promise<EmitResult | EmitFailure> {
  return emitRequestService(service(fields), OUT, read, modules, stage);
}
const code = (result: EmitResult | EmitFailure) => 'code' in result ? result.detail : 'ok';

const crate = (fields: Record<string, unknown>[]) => def('domainEntity', 'JjCrate', [], {
  entityId: 'JjCrate', storageTarget: 'moduleDatabase', fields,
  lifecycle: { states: [], transitions: [] }, invariants: [], imports: [],
});
const declared = crate([
  { name: 'id', type: 'uuid', derived: true },
  { name: 'version', type: 'integer', derived: true },
  { name: 'label', type: 'string' },
  { name: 'weight', type: 'number' },
]);

void test('a fieldsOnly grant that omits the declared concurrency field still emits; a business field does not', async () => {
  const labelOnly = scope([grant('loaderBay', 'fieldsOnly', ['JjCrate.label'])]);
  assert.equal(code(await emit(['label', 'version'], [declared, labelOnly, controller(['loaderBay'])])), 'ok');
  assert.equal(code(await emit(['label', 'weight'], [declared, labelOnly, controller(['loaderBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} weight`);
  const noVersion = crate([{ name: 'id', type: 'uuid', derived: true }, { name: 'label', type: 'string' }]);
  assert.equal(code(await emit(['label', 'version'], [noVersion, labelOnly, controller(['loaderBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} version`);
});

const FIELDS = ['id', 'label', 'seal.code'];
const loaderSees = scope([grant('loaderBay', 'fieldsOnly', ['JjCrate.id', 'JjCrate.label', 'JjCrate.seal'])]);

void test('inside the grant passes; a field the grant does not disclose is refused with route and field', async () => {
  assert.equal(code(await emit(FIELDS, [loaderSees, controller(['loaderBay'])])), 'ok');
  for (const stage of ['structure', 'implement'] as const) {
    assert.equal(code(await emit([...FIELDS, 'weight'], [loaderSees, controller(['loaderBay'])], stage)), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} weight`);
  }
  // A whole object is more than one allowed leaf under it.
  const leafOnly = scope([grant('loaderBay', 'fieldsOnly', ['JjCrate.id', 'JjCrate.seal.code'])]);
  assert.equal(code(await emit(['id', 'seal'], [leafOnly, controller(['loaderBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} seal`);
});

void test('grant modes keep the v1 rule: fullRecord all, no allowedFields nothing, undeclared grant nothing, every grant must allow', async () => {
  assert.equal(code(await emit([...FIELDS, 'weight'], [scope([grant('loaderBay', 'fullRecord')]), controller(['loaderBay'])])), 'ok');
  assert.equal(code(await emit(['id'], [scope([grant('loaderBay', 'fieldsOnly')]), controller(['loaderBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} id`);
  assert.equal(code(await emit(['id'], [loaderSees, controller(['ghostBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} id`);
  const two = scope([grant('loaderBay', 'fullRecord'), grant('auditBay', 'fieldsOnly', ['JjCrate.id'])]);
  assert.equal(code(await emit(['id', 'label'], [two, controller(['loaderBay', 'auditBay'])])), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} label`);
  // A route with grants and no access scope in the module is not read as open.
  assert.equal('code' in await emit(['id'], [controller(['loaderBay'])]) && (await emit(['id'], [controller(['loaderBay'])]) as EmitFailure).code, 'GRANT_UNREAD');
});

/** d1_63: the def carries the nodes controllers60 classified; the request service applies the same rule on them. */
const classified = (disclosure: unknown) => def('requestService', 'bay', [UC], {
  pageId: 'bay',
  requests: [{ route: ROUTE, kind: 'qry', uses: ['listJjCrate'], transaction: 'none', outputs: [{ key: 'crates', entity: 'JjCrate', fields: ['label', 'tally', 'ratio'], disclosure }], params: [] }],
});
const nodes = [
  { kind: 'entity', field: 'label', entity: 'JjCrate', path: 'label' },
  { kind: 'entity', field: 'tally', entity: 'JjCrate', path: 'details.tally' },
  { kind: 'computed', field: 'ratio', entity: 'JjCrate' },
];

void test('d1_63: a mapped path is checked on its ontology path; a calculated value needs fullRecord (COMPUTED_NOT_DISCLOSED)', async () => {
  const sees = scope([grant('loaderBay', 'fieldsOnly', ['JjCrate.label', 'JjCrate.details.tally'])]);
  const run = async (disclosure: unknown, modules: unknown[]) => code(await emitRequestService(classified(disclosure), OUT, read, modules, 'structure'));
  assert.equal(await run(nodes.slice(0, 2), [declared, sees, controller(['loaderBay'])]), 'ok');
  assert.equal(await run(nodes, [declared, sees, controller(['loaderBay'])]), `COMPUTED_NOT_DISCLOSED: ${ROUTE} ratio`);
  assert.equal(await run(nodes, [declared, scope([grant('loaderBay', 'fullRecord')]), controller(['loaderBay'])]), 'ok');
  const byName = scope([grant('loaderBay', 'fieldsOnly', ['JjCrate.label', 'JjCrate.tally'])]);
  assert.equal(await run(nodes.slice(0, 2), [declared, byName, controller(['loaderBay'])]), `DISCLOSURE_EXCEEDS_GRANT: ${ROUTE} tally`);
  const bad = await emitRequestService(classified([{ kind: 'entity', field: 'label' }]), OUT, read, [declared, sees, controller(['loaderBay'])], 'structure');
  assert.equal('code' in bad && bad.code, 'PROJECTION_FIELD_UNKNOWN');
});
