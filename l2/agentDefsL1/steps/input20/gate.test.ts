/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  D1_SOURCE_SCHEMAS,
  type D1InputArtifacts,
  type D1InputSnapshot,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const MODULE = 'controleEstoque';
const PROJECT = 102047;
const FIXTURE_ID = 'controleEstoque-39a5166';

function loadHead(): D1InputArtifacts {
  const files = loadD1Fixture(FIXTURE_ID);
  const parsed = new Map<string, unknown>();
  const contractTexts: Record<string, string> = {};
  const contracts: D1InputArtifacts['contracts'] = {};
  for (const [file, text] of Object.entries(files)) {
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    parsed.set(file, parseD1Source(text, kind));
    const contract = new RegExp(`^l2/${MODULE}/web/contracts/([A-Za-z0-9_]+)\\.defs\\.ts$`).exec(file);
    if (!contract) continue;
    contractTexts[contract[1]] = text;
    contracts[contract[1]] = readContractAst(text, file);
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts') && !file.includes('/_102034_/')) {
      journeys[baseName(file, '.defs.ts')] = value;
    }
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts') && !file.includes('/_102034_/')) {
      entities[baseName(file, '.defs.ts')] = value;
    }
  }
  const root = `l4/${MODULE}`;
  return {
    sources: [...parsed.keys()].sort().map(file => ({
      path: file,
      sha256: 'fixture',
      bytes: 1,
      schemaVersion: '',
      state: 'present' as const,
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
    contracts,
    contractTexts,
    presentDefs: [],
  };
}

const EFFORT_PATH = `l4/${MODULE}/pool/l2/web/effort.json`;
const BACKEND_PATH = `l4/${MODULE}/pool/l2/web/backend.json`;



function baseName(file: string, suffix: string): string {
  const name = file.slice(file.lastIndexOf('/') + 1);
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

function withoutRoute(source: string, route: string): string {
  const marker = `'${route}':`;
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`missing route ${route}`);
  const open = source.indexOf('{', at + marker.length);
  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    else if (source[end] === '}') {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }
  if (source[end] === ';') end += 1;
  return source.slice(0, at) + source.slice(end);
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function build(artifacts: D1InputArtifacts, previous: D1InputSnapshot | null = null): D1InputSnapshot {
  return buildD1InputSnapshot({ project: PROJECT, moduleName: MODULE }, artifacts, previous);
}

function codes(snapshot: D1InputSnapshot, severity: 'error' | 'review'): string[] {
  return snapshot.problems.filter(problem => problem.severity === severity).map(problem => problem.code);
}

function fileOf(snapshot: D1InputSnapshot, artifactType: string, identity: string) {
  return snapshot.files.find(file => file.artifactType === artifactType && file.identity === identity);
}

void test('supported plan schemas are the producers versions', () => {
  const files = loadD1Fixture(FIXTURE_ID);
  const backend = JSON.parse(files[`l4/${MODULE}/pool/l2/web/backend.json`]) as { schemaVersion: string };
  const effort = JSON.parse(files[`l4/${MODULE}/pool/l2/web/effort.json`]) as { schemaVersion: string };
  assert.equal(backend.schemaVersion, D1_SOURCE_SCHEMAS.backend);
  assert.equal(effort.schemaVersion, D1_SOURCE_SCHEMAS.effort);
});

void test('only the current backend plan is read; another version is refused by path', () => {
  const upgraded = clone(loadHead());
  const backend = upgraded.backend as Record<string, unknown>;
  backend.schemaVersion = '2026-09-21-p1-backend-v9';
  const refused = build(upgraded).problems.filter(problem => problem.code === 'SCHEMA_DIVERGENT' && problem.path === BACKEND_PATH);
  assert.equal(refused.length, 1);
  assert.match(refused[0].message, /'2026-09-21-p1-backend-v9', expected 2026-09-21-p1-backend-v1\.2\. Regenerate/);
});

void test('the v2 seed is cut by the contract routes, not by backend endpoints', () => {
  const snapshot = build(loadHead());
  assert.equal('routes' in snapshot.selection, false);
  assert.deepEqual(snapshot.selection.pages.map(page => page.pageId), ['movimentacoes', 'produtos']);
  const requestRoutes = snapshot.selection.requests.map(item => item.route).sort();
  assert.deepEqual(snapshot.selection.pages.flatMap(page => page.routes).sort(), requestRoutes);
  assert.equal(requestRoutes.includes('controleEstoque.movimentacoes.load'), true);
  assert.equal(requestRoutes.includes('controleEstoque.movimentacoes.qryListMovimentacaoEstoque'), false);
  assert.deepEqual(snapshot.selection.usecases.map(item => item.usecaseId).sort(), [
    'createMovimentacaoEstoque', 'createProduto', 'listMovimentacaoEstoque', 'listProduto',
  ]);
  assert.equal(snapshot.files.filter(file => file.artifactType === 'httpController').length, 2);
  assert.equal(snapshot.files.filter(file => file.artifactType === 'requestService').length, 2);
  for (const pageId of ['movimentacoes', 'produtos']) {
    const service = snapshot.files.find(file => file.id === `requestService:${pageId}`);
    const controller = snapshot.files.find(file => file.id === `controller:${pageId}`);
    assert.equal(service?.defPath, `l1/${MODULE}/layer_2_application/requests/${pageId}.defs.ts`);
    assert.equal(controller?.dependsOn.includes(`requestService:${pageId}`), true);
  }
  assert.equal(codes(snapshot, 'error').includes('DAG_CYCLE'), false);
  for (const file of snapshot.files) {
    for (const dep of file.dependsOn) assert.ok(snapshot.files.some(item => item.id === dep), `${file.id} -> ${dep}`);
  }
});

void test('integration outbound def is inventoried from an inbound item, with no outbound events', async () => {
  const artifacts = clone(loadHead());
  const integration = artifacts.integration as { outbound: unknown[]; inbound: unknown[] };
  integration.outbound = [];
  integration.inbound = [{ id: 'chamadaRecebida', kind: 'inbound', transitionRef: 'registrarFalta', mechanism: 'queue' }];
  const snapshot = build(artifacts);
  assert.ok(fileOf(snapshot, 'integrationOutbound', 'outbound'));
});

void test('integration outbound def is absent with no outbound event, process, inbound or plugin', async () => {
  const artifacts = clone(loadHead());
  const integration = artifacts.integration as { outbound: unknown[]; inbound: unknown[]; plugins: unknown[] };
  integration.outbound = [];
  integration.inbound = [];
  integration.plugins = [];
  const snapshot = build(artifacts);
  assert.equal(fileOf(snapshot, 'integrationOutbound', 'outbound'), undefined);
});

void test('removing one route keeps a usecase another page still uses', () => {
  const artifacts = clone(loadHead());
  const route = 'controleEstoque.movimentacoes.load';
  artifacts.contractTexts.movimentacoes = withoutRoute(artifacts.contractTexts.movimentacoes, route);
  const snapshot = build(artifacts);
  const requestRoutes = snapshot.selection.requests.map(item => item.route);
  assert.equal(requestRoutes.includes(route), false);
  assert.equal(requestRoutes.includes('controleEstoque.produtos.load'), true);
  assert.ok(snapshot.selection.usecases.some(usecase => usecase.usecaseId === 'listProduto'));
  assert.ok(fileOf(snapshot, 'usecase', 'listProduto'));
  assert.equal(snapshot.problems.some(problem => problem.code === 'REMOVE_STILL_REFERENCED'), false);
});

void test('an update keeps existing identity only with an inventoried hash', () => {
  const artifacts = clone(loadHead());
  const head = build(artifacts);
  const usecaseId = 'createMovimentacaoEstoque';
  const defPath = fileOf(head, 'usecase', usecaseId)!.defPath;
  const hash = 'sha256:ab'.padEnd(7 + 64, 'c');
  const previous = clone(head);
  previous.files.find(file => file.defPath === defPath)!.contentHash = hash;
  const backend = artifacts.backend as { usecases: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; totals: { usecases: Record<string, number> } };
  const usecase = backend.usecases.find(item => item.usecaseId === usecaseId)!;
  usecase.status = 'toUpdate';
  usecase.existing = usecaseId;
  const effortRow = effort.usecases.find(item => item.usecaseId === usecaseId)!;
  effortRow.status = 'toUpdate';
  effortRow.existing = usecaseId;
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.toUpdate += 1;
  artifacts.presentDefs = [{ path: defPath, sha256: hash }];
  const snapshot = build(artifacts, previous);
  const file = fileOf(snapshot, 'usecase', usecaseId);
  assert.equal(file?.action, 'update');
  assert.equal(file?.contentHash, hash);
  assert.equal(snapshot.problems.some(problem => problem.code === 'EXISTING_UNRESOLVED' && problem.ownerRef === `usecase:${usecaseId}`), false);
});

void test('alias existing keeps the inventoried id and does not mint the candidate', () => {
  const artifacts = clone(loadHead());
  const head = build(artifacts);
  const defPath = fileOf(head, 'usecase', 'listProduto')!.defPath;
  const hash = `sha256:${'d'.repeat(64)}`;
  const previous = clone(head);
  previous.files.find(file => file.defPath === defPath)!.contentHash = hash;
  const backend = artifacts.backend as { usecases: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; totals: { usecases: Record<string, number> } };
  const row = backend.usecases.find(item => item.usecaseId === 'listProduto')!;
  row.usecaseId = 'listProdutoNovo';
  row.existing = 'listProduto';
  row.status = 'toUpdate';
  const effortRow = effort.usecases.find(item => item.usecaseId === 'listProduto')!;
  effortRow.usecaseId = 'listProdutoNovo';
  effortRow.existing = 'listProduto';
  effortRow.status = 'toUpdate';
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.toUpdate += 1;
  artifacts.presentDefs = [{ path: defPath, sha256: hash }];
  const snapshot = build(artifacts, previous);
  assert.equal(fileOf(snapshot, 'usecase', 'listProduto')?.action, 'update');
  assert.equal(snapshot.files.some(file => file.defPath.endsWith('/listProdutoNovo.defs.ts')), false);
  assert.equal(snapshot.selection.usecases.find(usecase => usecase.usecaseId === 'listProdutoNovo')?.identity, 'listProduto');
});

void test('a done usecase with no file stays done and is not created', () => {
  const artifacts = clone(loadHead());
  const backend = artifacts.backend as { usecases: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; totals: { usecases: Record<string, number> } };
  backend.usecases.find(item => item.usecaseId === 'listProduto')!.status = 'done';
  effort.usecases.find(item => item.usecaseId === 'listProduto')!.status = 'done';
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.done += 1;
  const snapshot = build(artifacts);
  const file = fileOf(snapshot, 'usecase', 'listProduto');
  assert.equal(file?.action, 'preserve');
  assert.equal(snapshot.problems.some(problem => problem.code === 'DONE_ABSENT' && problem.ownerRef === 'usecase:listProduto'), true);
  assert.equal(snapshot.consumersReleased, false);
});

void test('unattributed changes are recorded and do not add files', () => {
  const artifacts = clone(loadHead());
  const head = build(artifacts);
  const backend = artifacts.backend as { changes: unknown[]; meta: { unmappedChanges: unknown[] } };
  const effort = artifacts.effort as { unattributed: unknown[] };
  backend.meta.unmappedChanges.push({ changeId: 'chg-map', kind: 'field', source: 'ontology/Produto.defs.ts' });
  backend.changes.push({ changeId: 'chg-open', kind: 'field', op: 'changed', entity: 'Produto', tableRefs: [], noTable: 'ok', usecaseRefs: [], reason: '', source: 'ontology/Produto.defs.ts' });
  effort.unattributed.push({ changeId: 'chg-effort', kind: 'rule', op: 'changed', reason: 'no page' });
  const snapshot = build(artifacts);
  const owners = snapshot.problems.filter(problem => problem.code === 'UNATTRIBUTED_CHANGE').map(problem => problem.ownerRef).sort();
  assert.deepEqual(owners, ['chg-effort', 'chg-map', 'chg-open']);
  assert.ok(snapshot.problems.filter(problem => problem.code === 'UNATTRIBUTED_CHANGE').every(problem => problem.path.includes(MODULE)));
  assert.equal(snapshot.files.length, head.files.length);
  assert.deepEqual(snapshot.selection.requests.map(item => item.route), head.selection.requests.map(item => item.route));
});

void test('a new L4 hash does not validate an unchanged plan', () => {
  const artifacts = clone(loadHead());
  const head = build(artifacts);
  const next = clone(artifacts);
  const target = `l4/${MODULE}/ontology/Produto.defs.ts`;
  const source = next.sources.find(item => item.path === target)!;
  const fresh = `sha256:${'e'.repeat(64)}`;
  source.sha256 = fresh;
  const snapshot = build(next, head);
  const problem = snapshot.problems.find(item => item.code === 'STALE_L4' && item.path === target);
  assert.ok(problem);
  assert.match(problem.message, new RegExp(fresh));
  assert.match(problem.message, /does not validate the plan/);
  assert.equal(snapshot.sources.find(item => item.path === target)?.sha256, fresh);
  assert.equal(snapshot.consumersReleased, false);
});

void test('toRemove on a live row is not treated as a removal', () => {
  const artifacts = clone(loadHead());
  const effort = artifacts.effort as { endpoints: Array<Record<string, string>>; totals: { endpoints: Record<string, number> } };
  const backend = artifacts.backend as { endpoints: Array<Record<string, string>> };
  const route = 'controleEstoque.movimentacoes.qryListMovimentacaoEstoque';
  backend.endpoints.find(item => item.route === route)!.status = 'toRemove';
  effort.endpoints.find(item => item.route === route)!.status = 'toRemove';
  effort.totals.endpoints.toCreate -= 1;
  effort.totals.endpoints.toRemove += 1;
  const snapshot = build(artifacts);
  assert.ok(snapshot.problems.some(problem => problem.code === 'STATUS_NOT_IN_REMOVED' && problem.ownerRef === route));
  assert.equal(snapshot.selection.requests.some(item => item.route === route), false);
  assert.equal(snapshot.removed.some(item => item.id === route), false);
});

void test('an existing unreadable contract is CONTRACT_UNPARSED, never ABSENT', () => {
  const artifacts = loadHead();
  const pageId = 'movimentacoes';
  const contract = `l2/${MODULE}/web/contracts/${pageId}.defs.ts`;
  const broken = 'export interface Broken { id: string';
  artifacts.contractTexts[pageId] = broken;
  artifacts.contracts[pageId] = readContractAst(broken, contract);
  const snapshot = build(artifacts);
  const unparsed = snapshot.problems.filter(problem => problem.code === 'CONTRACT_UNPARSED' && problem.path === contract);
  assert.ok(unparsed.length >= 1);
  assert.match(unparsed[0].message, /Broken/);
  assert.equal(snapshot.problems.some(problem => problem.code === 'CONTRACT_ABSENT' && problem.path === contract), false);
  assert.equal(snapshot.consumersReleased, false);
});

const WRITTEN = new Set(['domainEntity', 'repositoryPort', 'table', 'repositoryAdapter', 'usecase']);
const HASH = `sha256:${'ab'.repeat(32)}`;
const OTHER = `sha256:${'cd'.repeat(32)}`;

function releasedHead(): { artifacts: D1InputArtifacts; first: D1InputSnapshot } {
  const artifacts = loadHead();
  return { artifacts, first: build(artifacts) };
}

void test('resume accepts the writer receipt and keeps the plan', () => {
  const { artifacts, first } = releasedHead();
  const written = first.files.filter(file => WRITTEN.has(file.artifactType));
  assert.ok(written.length > 0);
  for (const artifactType of WRITTEN) assert.ok(written.some(file => file.artifactType === artifactType), artifactType);
  artifacts.presentDefs = written.map(file => ({ path: file.defPath, sha256: HASH }));
  artifacts.writerReceipts = written.map(file => ({ defPath: file.defPath, desiredHash: HASH }));
  const resume = build(artifacts, first);
  assert.equal(resume.problems.some(problem => problem.code === 'EXISTS_WITHOUT_RECEIPT'), false);
  assert.deepEqual(resume.files, first.files);
  assert.deepEqual(resume.problems, first.problems);
});

void test('a def changed outside the receipt stays refused', () => {
  const { artifacts, first } = releasedHead();
  const written = first.files.filter(file => WRITTEN.has(file.artifactType));
  const target = written[0];
  artifacts.presentDefs = written.map(file => ({
    path: file.defPath,
    sha256: file.defPath === target.defPath ? OTHER : HASH,
  }));
  artifacts.writerReceipts = written.map(file => ({ defPath: file.defPath, desiredHash: HASH }));
  const resume = build(artifacts, first);
  const problem = resume.problems.find(item => item.code === 'EXISTS_WITHOUT_RECEIPT' && item.path === target.defPath);
  assert.ok(problem);
  assert.match(problem.message, new RegExp(HASH));
  assert.match(problem.message, new RegExp(OTHER));
  assert.equal(resume.files.find(file => file.defPath === target.defPath)?.action, 'conflict');
  assert.equal(resume.problems.filter(item => item.code === 'EXISTS_WITHOUT_RECEIPT').length, 1);
  assert.equal(resume.consumersReleased, false);
});

void test('a missing def is planned again even when a writer receipt names it', () => {
  const { artifacts, first } = releasedHead();
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  artifacts.writerReceipts = [{ defPath: target.defPath, desiredHash: HASH }];
  const resume = build(artifacts, first);
  assert.equal(resume.problems.some(item => item.code === 'EXISTS_WITHOUT_RECEIPT'), false);
  assert.equal(resume.files.find(file => file.defPath === target.defPath)?.action, 'create');
  assert.deepEqual(resume.files, first.files);
  assert.deepEqual(resume.problems, first.problems);
});

void test('a present def with no receipt is still refused', () => {
  const { artifacts, first } = releasedHead();
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  artifacts.presentDefs = [{ path: target.defPath, sha256: HASH }];
  const resume = build(artifacts, first);
  const problem = resume.problems.find(item => item.code === 'EXISTS_WITHOUT_RECEIPT' && item.path === target.defPath);
  assert.ok(problem);
  assert.match(problem.message, /exists without an inventoried path and hash/);
  assert.equal(resume.consumersReleased, false);
});

void test('disagreeing writer receipts do not authorize a present def', () => {
  const { artifacts, first } = releasedHead();
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  artifacts.presentDefs = [{ path: target.defPath, sha256: HASH }];
  artifacts.writerReceipts = [
    { defPath: target.defPath, desiredHash: HASH },
    { defPath: target.defPath, desiredHash: OTHER },
  ];
  const resume = build(artifacts, first);
  const problem = resume.problems.find(item => item.code === 'EXISTS_WITHOUT_RECEIPT' && item.path === target.defPath);
  assert.ok(problem);
  assert.match(problem.message, /disagreeing receipts/);
  assert.match(problem.message, new RegExp(HASH));
  assert.match(problem.message, new RegExp(OTHER));
  assert.equal(resume.consumersReleased, false);
});

void test('an inventoried hash still recomposes without a writer receipt', () => {
  const { artifacts, first } = releasedHead();
  const target = first.files.find(file => file.artifactType === 'usecase');
  assert.ok(target);
  const previous = clone(first);
  previous.files.find(file => file.defPath === target.defPath)!.contentHash = HASH;
  artifacts.presentDefs = [{ path: target.defPath, sha256: HASH }];
  const resume = build(artifacts, previous);
  const file = resume.files.find(item => item.defPath === target.defPath);
  assert.equal(file?.action, 'recompose');
  assert.equal(file?.contentHash, HASH);
  assert.equal(resume.problems.some(item => item.code === 'EXISTS_WITHOUT_RECEIPT'), false);
});
