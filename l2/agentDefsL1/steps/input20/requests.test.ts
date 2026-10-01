/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/requests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputArtifacts, D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

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
  return buildD1InputSnapshot({ project: 102047, moduleName }, artifactsOf(id, moduleName), null);
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
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'ledgerDesk' }, artifacts, null);
  const get = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.get');
  const save = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.save');
  const move = snapshot.selection.requests.find(item => item.route === 'ledgerDesk.cards.move');
  assert.deepEqual(get?.uses, ['readItem']);
  assert.deepEqual(save?.uses, ['writeItem', 'readNote']);
  assert.equal(snapshot.problems.some(item => item.code === 'MDM_NOT_ATOMIC' && item.ownerRef === 'ledgerDesk.cards.save'), true);
  assert.equal(move?.uses.length, 0);
  assert.equal(snapshot.problems.some(item => item.code === 'REQUEST_USECASE_UNPLANNED' && item.message.includes('DeskNote.transition')), true);
  assert.equal(snapshot.problems.some(item => item.code === 'USECASE_WITHOUT_REQUEST' && item.ownerRef === 'spareNote'), true);
});

void test('contract access that disagrees with L4 is a review and does not gate', () => {
  const artifacts = artifactsOf('controleEstoque-39a5166', 'controleEstoque');
  const access = artifacts.access as { grants: Array<{ grantId: string }> };
  access.grants = access.grants.filter(grant => grant.grantId !== 'gerenciarEstoque');
  const snapshot = buildD1InputSnapshot({ project: 102047, moduleName: 'controleEstoque' }, artifacts, null);
  const review = snapshot.problems.filter(item => item.code === 'CONTRACT_ACCESS_DIVERGENT');
  assert.ok(review.length > 0);
  assert.equal(review.every(item => item.severity === 'review'), true);
  assert.ok(snapshot.selection.requests.some(item => item.route === 'controleEstoque.movimentacoes.load'));
});
