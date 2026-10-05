/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/requests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { D1_DEFINITION_SCHEMA } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { D1_FLOW_ID, D1_FLOW_VERSION, D1_PIPELINE_SCHEMA, type D1PipelineState } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputArtifacts, D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { resolverAnswers } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { fieldsByEntity, readContractV2 as readContractV2Source, requestServiceProblems, serviceRowsFor, serviceSourceOf } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { CHAIN_STEP_IDS } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { buildD1Finalize } from '/_102021_/l2/agentDefsL1/steps/finalize80/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { capabilityNames } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { mdmForOperation } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

function artifactsOf(id: string, moduleName: string): D1InputArtifacts {
  const files = loadD1Fixture(id);
  const parsed = new Map<string, unknown>();
  const contractTexts: Record<string, string> = {};
  for (const [file, text] of Object.entries(files)) {
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    parsed.set(file, parseD1Source(text, kind));
    const contract = new RegExp(`^l2/${moduleName}/web/contracts/([A-Za-z0-9_]+)\\.defs\\.ts$`).exec(file);
    if (contract) contractTexts[contract[1]] = text;
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) journeys[file.split('/').pop()?.replace(/\.defs\.ts$/, '') || ''] = value;
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts') && !file.includes('/_102034_/')) {
      entities[file.split('/').pop()?.replace(/\.defs\.ts$/, '') || ''] = value;
    }
  }
  const root = `l4/${moduleName}`;
  return {
    sources: [...parsed.keys()].sort().map(path => ({
      path, sha256: 'fixture', bytes: 1, schemaVersion: '', state: 'present' as const,
    })),
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`${root}/pool/l1/pipeline.json`) ?? null,
    contracts: {},
    contractTexts,
    presentDefs: [],
  };
}

function build(id: string, moduleName: string): D1InputSnapshot {
  const artifacts = artifactsOf(id, moduleName);
  return buildD1InputSnapshot({ project: 102047, moduleName }, artifacts, null, resolverAnswers(artifacts));
}

function usecaseId(snapshot: D1InputSnapshot, entity: string, operation: string): string {
  const match = snapshot.selection.usecases.find(item => item.entity === entity && item.operation === operation);
  assert.ok(match, `${entity}.${operation}`);
  return match.usecaseId;
}

void test('contract v2 requests follow entity and operation, including the renamed pool', () => {
  const real = build('controleEstoque-39a5166', 'controleEstoque');
  const load = real.selection.requests.find(item => item.route === 'controleEstoque.movimentacoes.load');
  assert.ok(load);
  assert.deepEqual(load.uses, [
    usecaseId(real, 'MovimentacaoEstoque', 'list'),
    usecaseId(real, 'Produto', 'list'),
  ]);
  const produtoId = load.params.find(item => item.name === 'produtoId');
  assert.deepEqual(produtoId, { name: 'produtoId', target: 'movimentacoes', field: 'produtoId' });
  assert.equal(real.problems.some(item => item.code === 'CONTRACT_ACCESS_DIVERGENT'), false);

  const renamed = build('ledgerBin-39a5166', 'ledgerBin');
  const renamedLoad = renamed.selection.requests.find(item => item.route === 'ledgerBin.binEvents.load');
  assert.ok(renamedLoad);
  assert.deepEqual(renamedLoad.uses, [
    usecaseId(renamed, 'BinEvent', 'list'),
    usecaseId(renamed, 'Widget', 'list'),
  ]);
  assert.equal(renamedLoad.uses.includes('listMovimentacaoEstoque'), false);
  assert.equal(renamedLoad.uses.includes('listProduto'), false);
  const widgetId = renamedLoad.params.find(item => item.name === 'widgetId');
  assert.equal(widgetId?.target, 'binEvents');
  assert.equal(widgetId?.field, 'widgetId');
});

void test('synthetic contract covers get, a second entity, MDM plus local, and a missing usecase', () => {
  const artifacts = artifactsOf('synthetic-v2', 'ledgerDesk');
  const pool = [
    { usecaseId: 'readItem', entity: 'ItemCard', operation: 'get', status: 'toCreate', existing: '' },
    { usecaseId: 'writeItem', entity: 'ItemCard', operation: 'update', status: 'toCreate', existing: '' },
    { usecaseId: 'readNote', entity: 'DeskNote', operation: 'get', status: 'toCreate', existing: '' },
    { usecaseId: 'spareNote', entity: 'DeskNote', operation: 'custom', status: 'toCreate', existing: '' },
  ];
  (artifacts.backend as Record<string, unknown>).usecases = pool;
  (artifacts.effort as Record<string, unknown>).usecases = pool.map(item => ({ ...item }));
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null, resolverAnswers(artifacts));
  const get = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.get');
  const save = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.save');
  const move = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.move');
  assert.deepEqual(get?.uses, ['readItem']);
  assert.deepEqual(save?.uses, ['writeItem']);
  assert.equal(snapshot.problems.some(item => item.code === 'MDM_NOT_ATOMIC' && item.ownerRef === 'ledgerDesk.cards.save'), false);
  const verdict = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.veredito.aprovar');
  assert.deepEqual(move?.uses, ['aprovarDeskNote']);
  assert.deepEqual(verdict?.uses, ['aprovarSlip']);
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_FROM_CONTRACT' && item.ownerRef === 'aprovarDeskNote'), true);
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_FROM_CONTRACT' && item.ownerRef === 'aprovarSlip'), true);
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'aprovar'), false);
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_WITHOUT_REQUEST' && item.ownerRef === 'spareNote'), true);
  const mixed = artifactsOf('synthetic-v2', 'ledgerDesk');
  const saveBlock = `writes: 'ItemCard.update';
    input: { id: string; version: number; details: { identification: { name: string } } };
    output: { item: ItemLoad };
    meta: { output: { item: { entity: 'ItemCard'; many: false } }; lists: {}; params: {} };`;
  mixed.contractTexts = {
    cards: (mixed.contractTexts || {}).cards.replace(saveBlock, `writes: 'ItemCard.update';
    input: { id: string; version: number; details: { identification: { name: string } } };
    output: { item: ItemLoad; note: NoteSave };
    meta: { output: { item: { entity: 'ItemCard'; many: false }; note: { entity: 'DeskNote'; many: false } }; lists: {}; params: {} };`),
  };
  (mixed.backend as Record<string, unknown>).usecases = pool;
  (mixed.effort as Record<string, unknown>).usecases = pool.map(item => ({ ...item }));
  const mixedSnapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, mixed, null, resolverAnswers(mixed));
  assert.equal(mixedSnapshot.problems.some(item => item.code === 'MDM_NOT_ATOMIC' && item.ownerRef === 'ledgerDesk.cards.save'), true);
});

void test('contract access that disagrees with L4 is a review and does not gate', () => {
  const artifacts = artifactsOf('controleEstoque-39a5166', 'controleEstoque');
  const access = artifacts.access as { grants: Array<{ grantId: string }> };
  access.grants = access.grants.filter(grant => grant.grantId !== 'gerenciarEstoque');
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'controleEstoque' }, artifacts, null, resolverAnswers(artifacts));
  const review = snapshot.problems.filter(item => item.code === 'CONTRACT_ACCESS_DIVERGENT');
  assert.ok(review.length > 0);
  assert.equal(review.every(item => item.severity === 'review'), true);
  assert.ok(snapshot.selection.requests.some(item => item.route === 'controleEstoque.movimentacoes.load'));
});

type PoolRow = { usecaseId: string; entity: string; operation: string; status: string; existing: string; transitionRef?: string };

function qryRoute(route: string, key: string, entity: string, many: boolean): string {
  return `  '${route}': {
    kind: 'qry';
    input: {};
    output: { ${key}: NoteSave${many ? '[]' : ''} };
    meta: { output: { ${key}: { entity: '${entity}'; many: ${many} } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['clerk']; grants: ['manageDesk']; scope: 'organization' };
  };`;
}

function cmdRoute(route: string, writes: string): string {
  return `  '${route}': {
    kind: 'cmd';
    writes: '${writes}';
    input: { id: string; version: number };
    output: { note: NoteSave };
    meta: { output: { note: { entity: 'DeskNote'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['clerk']; grants: ['manageDesk']; scope: 'organization' };
  };`;
}

function boardContract(routes: string[]): string {
  return `/// <mls fileReference="_102047_/l2/ledgerDesk/web/contracts/board.defs.ts" enhancement="_blank"/>

export interface BoardContracts {
${routes.join('\n')}
}

export interface NoteSave {
  id: string;
  version: number;
}
`;
}

/** synthetic-v2 with this pool in both plans and, when given, only the board contract with these routes. */
function deskOf(pool: PoolRow[], routes: string[] | null): D1InputArtifacts {
  const artifacts = artifactsOf('synthetic-v2', 'ledgerDesk');
  (artifacts.backend as Record<string, unknown>).usecases = pool;
  (artifacts.effort as Record<string, unknown>).usecases = pool.map(item => ({ ...item }));
  if (routes) artifacts.contractTexts = { board: boardContract(routes) };
  return artifacts;
}

function deskBuild(artifacts: D1InputArtifacts): D1InputSnapshot {
  return buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null, resolverAnswers(artifacts));
}

const listNote: PoolRow = { usecaseId: 'listNote', entity: 'DeskNote', operation: 'list', status: 'toCreate', existing: '' };

void test('a read the plan lacks is created from the contract, once for two requests', () => {
  const snapshot = deskBuild(deskOf([listNote], [
    qryRoute('ledgerDesk.board.load', 'notes', 'DeskNote', true),
    qryRoute('ledgerDesk.board.note', 'note', 'DeskNote', false),
    qryRoute('ledgerDesk.board.noteAgain', 'note', 'DeskNote', false),
  ]));
  const created = snapshot.selection.usecases.filter(item => item.entity === 'DeskNote' && item.operation === 'get');
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], {
    usecaseId: 'getDeskNote',
    entity: 'DeskNote',
    operation: 'get',
    status: 'toCreate',
    existing: '',
    identity: 'getDeskNote',
    routes: ['ledgerDesk.board.note', 'ledgerDesk.board.noteAgain'],
  });
  const uses = (route: string) => snapshot.selection.requests.find(item => item.route === route)?.uses;
  assert.deepEqual(uses('ledgerDesk.board.load'), ['listNote']);
  assert.deepEqual(uses('ledgerDesk.board.note'), ['getDeskNote']);
  assert.deepEqual(uses('ledgerDesk.board.noteAgain'), ['getDeskNote']);
  const fromContract = snapshot.problems.filter(item => item.code === 'USECASE_FROM_CONTRACT');
  assert.equal(fromContract.length, 1);
  assert.equal(fromContract[0].severity, 'review');
  assert.equal(fromContract[0].ownerRef, 'getDeskNote');
  // synthetic-v2 carries schema and planner errors of its own. None of them is about these requests or this usecase.
  const touched = new Set(['ledgerDesk.board.load', 'ledgerDesk.board.note', 'ledgerDesk.board.noteAgain', 'getDeskNote', 'listNote']);
  assert.deepEqual(snapshot.problems.filter(item => item.severity === 'error' && (item.code.startsWith('REQUEST_') || touched.has(item.ownerRef || ''))), []);
  assert.ok(snapshot.files.some(file => file.id === 'usecase:getDeskNote' && file.action === 'create'));
});

void test('a role read created from the contract binds read.byId in the usecase step', () => {
  const artifacts = deskOf([], null);
  artifacts.contractTexts = { cards: (artifacts.contractTexts || {}).cards };
  const snapshot = deskBuild(artifacts);
  const created = snapshot.selection.usecases.find(item => item.entity === 'ItemCard' && item.operation === 'get');
  assert.ok(created);
  assert.equal(created.usecaseId, 'getItemCard');
  assert.deepEqual(snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.get')?.uses, ['getItemCard']);
  assert.ok(snapshot.problems.some(item => item.code === 'USECASE_FROM_CONTRACT' && item.ownerRef === 'getItemCard'));
  const body = { ...(artifacts.entities.ItemCard as Record<string, unknown>), capabilities: { 'read.byId': 'Read one item card by id.' } };
  const bound = mdmForOperation({
    entityId: created.entity,
    namespace: 'ledgerDesk',
    capabilities: capabilityNames(body),
    platformFields: [],
    // The route input of ledgerDesk.cards.get is { id: string }.
    inputFields: [{ path: 'id', optional: false, writePrecondition: false }],
    operation: created.operation,
  });
  assert.ok(bound.calls.some(call => call.method === 'get' && call.capabilities.includes('read.byId')));
});

void test('a write the plan lacks is created; an unknown transition and a foreign entity stay errors', () => {
  const snapshot = deskBuild(deskOf([listNote], [
    qryRoute('ledgerDesk.board.load', 'notes', 'DeskNote', true),
    cmdRoute('ledgerDesk.board.add', 'DeskNote.create'),
    cmdRoute('ledgerDesk.board.reopen', 'DeskNote.reopen'),
    qryRoute('ledgerDesk.board.ghost', 'ghost', 'GhostCard', false),
  ]));
  assert.deepEqual(snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.add')?.uses, ['createDeskNote']);
  assert.ok(snapshot.selection.usecases.some(item => item.usecaseId === 'createDeskNote' && item.operation === 'create'));
  const unplanned = snapshot.problems.filter(item => item.code === 'REQUEST_USECASE_UNPLANNED');
  assert.ok(unplanned.some(item => item.ownerRef === 'ledgerDesk.board.reopen' && item.severity === 'error' && item.message.includes("'reopen' is not in the L4 lifecycle")));
  // d1_62: the entity comes from the ontology, so an entity outside it is never derived. The route stays a gap (review).
  assert.ok(snapshot.problems.some(item => item.code === 'OUTPUT_UNRESOLVED' && item.ownerRef === 'ledgerDesk.board.ghost' && item.severity === 'review'));
  assert.equal(snapshot.selection.usecases.some(item => item.entity === 'GhostCard'), false);
});

function deskTransitions(artifacts: D1InputArtifacts, ids: string[]): void {
  const note = artifacts.entities.DeskNote as Record<string, unknown>;
  note.transitions = ids.map(transitionId => ({ transitionId }));
}

void test('two planned transitions on one entity each bind their own route and neither is pruned', () => {
  const close: PoolRow = { usecaseId: 'close', entity: 'DeskNote', operation: 'transition', status: 'toCreate', existing: '', transitionRef: 'close' };
  const archive: PoolRow = { usecaseId: 'archive', entity: 'DeskNote', operation: 'transition', status: 'toCreate', existing: '', transitionRef: 'archive' };
  const artifacts = deskOf([close, archive], [
    cmdRoute('ledgerDesk.board.close', 'DeskNote.close'),
    cmdRoute('ledgerDesk.board.archive', 'DeskNote.archive'),
  ]);
  deskTransitions(artifacts, ['close', 'archive']);
  const snapshot = deskBuild(artifacts);
  assert.deepEqual(snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.close')?.uses, ['close']);
  assert.deepEqual(snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.archive')?.uses, ['archive']);
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'close'), true);
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'archive'), true);
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_WITHOUT_REQUEST' && (item.ownerRef === 'close' || item.ownerRef === 'archive')), false);
});

void test('colliding transitionRef aprovar binds each route and each outbound event to its own usecase', () => {
  const aprovarA: PoolRow = { usecaseId: 'aprovarA', entity: 'A', operation: 'transition', status: 'toCreate', existing: '', transitionRef: 'aprovar' };
  const aprovarB: PoolRow = { usecaseId: 'aprovarB', entity: 'B', operation: 'transition', status: 'toCreate', existing: '', transitionRef: 'aprovar' };
  const artifacts = deskOf([aprovarA, aprovarB], [
    cmdRoute('ledgerDesk.board.aprovarA', 'A.aprovar'),
    cmdRoute('ledgerDesk.board.aprovarB', 'B.aprovar'),
  ]);
  artifacts.entities.A = { transitions: [{ transitionId: 'aprovar' }] };
  artifacts.entities.B = { transitions: [{ transitionId: 'aprovar' }] };
  const integration = artifacts.integration as { outbound: unknown[] };
  integration.outbound = [
    { id: 'aAprovada', on: 'A.aprovar' },
    { id: 'bAprovada', on: 'B.aprovar' },
  ];
  const snapshot = deskBuild(artifacts);
  assert.equal(snapshot.problems.some(item => item.code === 'TRANSITION_REF_MISSING'), false);
  const usesA = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.aprovarA')?.uses || [];
  const usesB = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.aprovarB')?.uses || [];
  assert.equal(usesA.includes('aprovarA') && !usesA.includes('aprovarB'), true);
  assert.equal(usesB.includes('aprovarB') && !usesB.includes('aprovarA'), true);
  assert.equal(snapshot.selection.usecases.find(item => item.usecaseId === 'aprovarA')?.transitionRef, 'aprovar');
  assert.equal(snapshot.selection.usecases.find(item => item.usecaseId === 'aprovarB')?.transitionRef, 'aprovar');
  const outbound = snapshot.files.find(file => file.artifactType === 'integrationOutbound');
  assert.deepEqual(outbound?.dependsOn.slice().sort(), ['usecase:aprovarA', 'usecase:aprovarB']);
});

void test('a transition usecase without transitionRef is refused and not selected', () => {
  const bare: PoolRow = { usecaseId: 'aprovar', entity: 'DeskNote', operation: 'transition', status: 'toCreate', existing: '' };
  const snapshot = deskBuild(deskOf([bare], [cmdRoute('ledgerDesk.board.aprovar', 'DeskNote.aprovar')]));
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'aprovar'), false);
  const missing = snapshot.problems.find(item => item.code === 'TRANSITION_REF_MISSING' && item.ownerRef === 'aprovar');
  assert.ok(missing);
  assert.match(missing.path, /backend\.json$/);
});

void test('transitionRef missing on the backend is TRANSITION_REF_MISSING even when effort has it', () => {
  const row: PoolRow = { usecaseId: 'close', entity: 'DeskNote', operation: 'transition', status: 'toCreate', existing: '', transitionRef: 'close' };
  const artifacts = deskOf([row], [cmdRoute('ledgerDesk.board.close', 'DeskNote.close')]);
  deskTransitions(artifacts, ['close']);
  delete (artifacts.backend as { usecases: PoolRow[] }).usecases[0].transitionRef;
  const snapshot = deskBuild(artifacts);
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'close'), false);
  const missing = snapshot.problems.find(item => item.code === 'TRANSITION_REF_MISSING' && item.ownerRef === 'close');
  assert.ok(missing);
  assert.match(missing.path, /backend\.json$/);
});

void test('a lifecycle transition the plan lacks is created from the contract and the route uses it', () => {
  const artifacts = deskOf([], [
    cmdRoute('ledgerDesk.board.reopen', 'DeskNote.reopen'),
  ]);
  deskTransitions(artifacts, ['reopen']);
  const snapshot = deskBuild(artifacts);
  const created = snapshot.selection.usecases.find(item => item.usecaseId === 'reopen');
  assert.ok(created);
  assert.equal(created.operation, 'transition');
  assert.equal(created.entity, 'DeskNote');
  assert.equal(created.identity, 'reopen');
  assert.equal(created.transitionRef, 'reopen');
  assert.deepEqual(snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.reopen')?.uses, ['reopen']);
  const fromContract = snapshot.problems.filter(item => item.code === 'USECASE_FROM_CONTRACT' && item.ownerRef === 'reopen');
  assert.equal(fromContract.length, 1);
  assert.equal(fromContract[0].severity, 'review');
});

void test('a created id that the plan already names for another operation stays an error', () => {
  const clash: PoolRow = { usecaseId: 'getDeskNote', entity: 'DeskNote', operation: 'list', status: 'toCreate', existing: '' };
  const snapshot = deskBuild(deskOf([clash], [qryRoute('ledgerDesk.board.note', 'note', 'DeskNote', false)]));
  assert.ok(snapshot.problems.some(item => item.code === 'REQUEST_USECASE_UNPLANNED' && item.message.includes('already in the plan as DeskNote.list')));
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_FROM_CONTRACT'), false);
});

void test('a planned usecase no request calls is not generated when the module has a v2 contract', () => {
  const spare: PoolRow = { usecaseId: 'spareNote', entity: 'DeskNote', operation: 'custom', status: 'toCreate', existing: '' };
  const snapshot = deskBuild(deskOf([listNote, spare], [qryRoute('ledgerDesk.board.load', 'notes', 'DeskNote', true)]));
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'spareNote'), false);
  assert.equal(snapshot.files.some(file => file.ownerRefs.includes('usecase:spareNote')), false);
  assert.equal(snapshot.removed.some(item => item.id === 'spareNote'), false);
  const unrequested = snapshot.problems.find(item => item.code === 'USECASE_WITHOUT_REQUEST' && item.ownerRef === 'spareNote');
  assert.ok(unrequested);
  assert.equal(unrequested.severity, 'review');
  assert.ok(unrequested.message.includes('not generated'));
  assert.equal(unrequested.message.includes('removed'), false);

  const noContract = deskOf([listNote, spare], null);
  noContract.contractTexts = {};
  const today = deskBuild(noContract);
  assert.ok(today.selection.usecases.some(item => item.usecaseId === 'spareNote'));
  assert.ok(today.files.some(file => file.id === 'usecase:spareNote'));
});

void test('a pruned usecase with a previous receipt is removed and inventoried', () => {
  const spare: PoolRow = { usecaseId: 'spareNote', entity: 'DeskNote', operation: 'custom', status: 'toCreate', existing: '' };
  const priorArtifacts = deskOf([listNote, spare], null);
  priorArtifacts.contractTexts = {};
  const prior = deskBuild(priorArtifacts);
  const planned = prior.files.find(file => file.identity === 'spareNote' || file.ownerRefs.includes('usecase:spareNote'));
  assert.ok(planned);
  const hash = 'sha256:spare-note';
  const previous: D1InputSnapshot = {
    ...prior,
    files: prior.files.map(file => file === planned ? { ...file, contentHash: hash } : file),
  };
  const artifacts = deskOf([listNote, spare], [qryRoute('ledgerDesk.board.load', 'notes', 'DeskNote', true)]);
  artifacts.presentDefs = [{ path: planned.defPath, sha256: hash }];
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, previous, resolverAnswers(artifacts));
  assert.equal(snapshot.selection.usecases.some(item => item.usecaseId === 'spareNote'), false);
  assert.deepEqual(snapshot.removed.find(item => item.kind === 'usecase' && item.id === 'spareNote'), {
    kind: 'usecase',
    id: 'spareNote',
    defPath: planned.defPath,
    inventoried: true,
    contentHash: hash,
  });
  assert.equal(snapshot.problems.some(item => item.code === 'REMOVE_WITHOUT_RECEIPT' && item.ownerRef === 'spareNote'), false);
  assert.equal(snapshot.problems.some(item => item.code === 'DIVERGENT_SOURCE' && item.ownerRef === 'spareNote'), false);
  const unrequested = snapshot.problems.find(item => item.code === 'USECASE_WITHOUT_REQUEST' && item.ownerRef === 'spareNote');
  assert.ok(unrequested);
  assert.equal(unrequested.severity, 'review');
  assert.ok(unrequested.message.includes('removed'));

  const steps = Object.fromEntries(CHAIN_STEP_IDS.map(stepId => [stepId, { status: 'approved', updatedAt: '2026-10-02T00:00:00.000Z' }])) as D1PipelineState['steps'];
  const pipeline: D1PipelineState = {
    schemaVersion: D1_PIPELINE_SCHEMA,
    flowId: D1_FLOW_ID,
    flowVersion: D1_FLOW_VERSION,
    project: 102047,
    moduleName: 'ledgerDesk',
    status: 'inProgress',
    command: 'run',
    steps,
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
  const definition = {
    schemaVersion: D1_DEFINITION_SCHEMA,
    artifactType: 'usecase',
    artifactId: 'spareNote',
    moduleName: 'ledgerDesk',
    status: 'pending',
    dependencies: [] as string[],
    data: { usecaseId: 'spareNote' },
  };
  const report = buildD1Finalize({
    project: 102047,
    moduleName: 'ledgerDesk',
    pipeline,
    snapshot,
    sourceHashes: {},
    dependencyTexts: {},
    contracts: {},
    drafts: { domain30: null, persistence40: null, usecases50: null, controllers60: null, support70: null },
    observed: [{
      defPath: planned.defPath,
      text: `export const definition = ${JSON.stringify(definition)} as const;\n`,
      currentHash: hash,
      receiptHash: hash,
      action: '',
      ownerRefs: ['usecase:spareNote'],
      unitDone: true,
    }],
    futurePresent: {},
    children: [],
    callLog: null,
  });
  const removedFile = report.files.find(file => file.defPath === planned.defPath);
  assert.ok(removedFile);
  assert.equal(removedFile.action, 'removed');
  assert.equal(report.findings.some(finding => finding.code === 'EXTRA_FILE'), false);
});

/**
 * d1_62: a contract without meta goes through the derivation and the answers, and controllers60 checks only the
 * entity fields: a list with total, an N:1 field, a readonly value and a nested relation are classified, not refused.
 */
void test('a contract without meta: list with total, N:1 field, readonly value and relation are derived and checked by kind', () => {
  const artifacts = deskOf([listNote], null);
  (artifacts.entities.DeskNote as Record<string, unknown>).relationships = { itemCard: { to: 'ItemCard', relationshipId: 'noteItemCard', cardinality: 'N:1' } };
  (artifacts.entities.Slip as Record<string, unknown>).relationships = { notes: { to: 'DeskNote', relationshipId: 'slipNotes', cardinality: '1:N' } };
  const contract = `/// <mls fileReference="_102047_/l2/ledgerDesk/web/contracts/board.defs.ts" enhancement="_blank"/>

export interface BoardContracts {
  'ledgerDesk.board.load': {
    kind: 'qry';
    input: { page?: number; pageSize?: number; itemCardId?: string };
    output: { notes: NotePage };
    meta: { output: {}; lists: {}; params: {} };
    rules: ['labelRule'];
    access: { actors: ['clerk']; grants: ['manageDesk']; scope: 'organization' };
  };
  'ledgerDesk.board.slip': {
    kind: 'qry';
    input: { id: string };
    output: { slip: SlipView };
    meta: { output: {}; lists: {}; params: {} };
    rules: [];
    access: { actors: ['clerk']; grants: ['manageDesk']; scope: 'organization' };
  };
}

export interface NoteRow {
  id: string;
  version: number;
  itemCardId: string;
  state: string;
  details: { identification: { name: string } };
  readonly label: string;
}

export interface NotePage {
  items: NoteRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SlipView {
  id: string;
  version: number;
  state: string;
  notes: NoteRow[];
}
`;
  artifacts.contractTexts = { board: contract };
  // Slip and DeskNote both carry id, version and state: that one gap is the resolve25 answer. Nothing else is asked.
  const answers = new Map([['ledgerDesk.board.slip', [{ path: 'output.slip', choice: 'Slip' }]]]);
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null, answers);
  assert.equal(snapshot.problems.some(item => item.code === 'OUTPUT_UNRESOLVED'), false, JSON.stringify(snapshot.problems.filter(item => item.code === 'OUTPUT_UNRESOLVED')));
  const load = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.load');
  assert.deepEqual(load?.outputs, [{
    key: 'notes', entity: 'DeskNote', many: true, page: 'page', pageSize: 'pageSize', total: 'total', computed: ['label'],
    related: [{ field: 'details.identification.name', entity: 'ItemCard', relationship: 'noteItemCard' }],
  }]);
  assert.deepEqual(load?.params, [
    { name: 'page', target: 'notes', pages: 'notes' },
    { name: 'pageSize', target: 'notes', pages: 'notes' },
    { name: 'itemCardId', target: 'notes', field: 'itemCardId' },
  ]);
  const slip = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.board.slip');
  assert.deepEqual(slip?.outputs.map(item => [item.key, item.entity, item.many, item.parent, item.relationship]), [
    ['slip', 'Slip', false, undefined, undefined],
    ['slip.notes', 'DeskNote', true, 'slip', 'slipNotes'],
  ]);
  assert.deepEqual(slip?.params, [{ name: 'id', target: 'slip', field: 'id' }]);

  // controllers60 checks only the entity fields; the classified ones pass by their kind.
  const definition = readContractV2Source(contract);
  assert.ok(definition);
  const sources = snapshot.selection.requests.map(serviceSourceOf);
  const built = serviceRowsFor('board', definition, sources);
  const check = (rows: typeof built.rows) => requestServiceProblems({
    pageId: 'board',
    contractRoutes: built.routes,
    requests: rows,
    usecaseIds: new Set(snapshot.selection.usecases.map(item => item.usecaseId)),
    fieldsByEntity: fieldsByEntity(artifacts.entities),
  }).filter(problem => problem.code === 'PROJECTION_FIELD_UNKNOWN');
  assert.deepEqual(built.problems, []);
  assert.deepEqual(check(built.rows), []);
  // Control: without the readonly and N:1 classification, those fields are refused as unknown entity fields.
  const unclassified = serviceRowsFor('board', definition, sources.map(item => ({
    ...item,
    outputs: item.outputs.map(output => ({ ...output, computed: undefined, related: undefined })),
  })));
  const refused = check(unclassified.rows).map(problem => problem.message);
  assert.ok(refused.some(message => message.includes('DeskNote.label')), refused.join(' | '));
  assert.ok(refused.some(message => message.includes('DeskNote.details.identification.name')), refused.join(' | '));
  // A filter resolve25 left at none has no field: controllers60 says so and does not plan it (no silent filter).
  const unanswered = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null, new Map([
    ['ledgerDesk.board.slip', [{ path: 'output.slip', choice: 'none' }]],
  ]));
  const open = unanswered.selection.requests.find(item => item.route === 'ledgerDesk.board.slip');
  assert.deepEqual(open?.params, [{ name: 'id', target: 'slip' }]);
  const openRows = serviceRowsFor('board', definition, unanswered.selection.requests.map(serviceSourceOf));
  assert.ok(openRows.problems.some(problem => problem.code === 'FILTER_UNRESOLVED' && problem.severity === 'review' && problem.message.includes('input id')));
  assert.deepEqual(openRows.rows.find(row => row.route === 'ledgerDesk.board.slip')?.params ?? [], []);
});
