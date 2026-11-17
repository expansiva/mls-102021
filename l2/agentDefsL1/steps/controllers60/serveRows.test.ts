/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/serveRows.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { accessScopeIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1SelectedRequest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readContractV2, requestServiceProblems, serviceRowsFor, serviceSourceOf, serveRowsFor } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { serveGrants } from '/_102021_/l2/agentDefsL1/steps/controllers60/serveGrants.js';

function selected(partial: Pick<D1SelectedRequest, 'route' | 'pageId' | 'kind' | 'serves'> & Partial<D1SelectedRequest>): D1SelectedRequest {
  return {
    writes: '',
    outputs: [],
    params: [],
    uses: [],
    ...partial,
  };
}

void test('serve rows copy the mark, the kind and the snapshot params', () => {
  const record = serviceSourceOf(selected({
    route: 'agents.cm.record',
    pageId: 'cm',
    kind: 'cmd',
    serves: 'cm.record',
    uses: ['AgentExecution_create'],
    params: [{ name: 'executionId', target: '' }],
  }));
  const describe = serviceSourceOf(selected({
    route: 'agents.cm.describe',
    pageId: 'cm',
    kind: 'qry',
    serves: 'cm.describe',
  }));
  const ready = serviceSourceOf(selected({
    route: 'agents.cm.agentDraftReady',
    pageId: 'cm',
    kind: 'cmd',
    serves: 'cm.agentDraftReady',
    uses: ['AgentDraft_create'],
  }));
  assert.equal(record.serves, 'cm.record');
  assert.equal(describe.serves, 'cm.describe');
  const rows = serveRowsFor('cm', [ready, describe, record]);
  assert.deepEqual(rows.map(row => row.route), [
    'agents.cm.agentDraftReady',
    'agents.cm.describe',
    'agents.cm.record',
  ]);
  assert.equal(rows[0]?.transaction, 'single');
  assert.equal(rows[0]?.serves, 'cm.agentDraftReady');
  assert.deepEqual(rows[1], {
    route: 'agents.cm.describe',
    kind: 'qry',
    uses: [],
    transaction: 'none',
    output: [],
    params: [],
    rules: [],
    serves: 'cm.describe',
  });
  assert.equal(rows[2]?.transaction, 'single');
  assert.deepEqual(rows[2]?.params, [{ name: 'executionId', target: '' }]);
  assert.equal('doc' in (rows[2] || {}), false);
  const missing = requestServiceProblems({
    pageId: 'cm',
    contractRoutes: [],
    requests: rows,
    usecaseIds: new Set(['AgentDraft_create']),
    fieldsByEntity: new Map(),
    part: 'fields',
  });
  assert.equal(missing.some(item => item.code === 'INVALID_REF' && item.message.includes('AgentExecution_create')), true);
});

void test('a page request row is built from the contract as before', () => {
  const source = `/// <mls fileReference="_102099_/l2/mod/web/contracts/page.defs.ts" enhancement="_blank"/>

export interface ItemRow {
  id: string;
}

export interface PageContracts {
  'mod.page.list': {
    kind: 'qry';
    input: { term: string };
    output: { item: ItemRow };
    rules: [];
    access: { actors: ['member']; grants: ['read']; scope: 'organization' };
  };
}
`;
  const definition = readContractV2(source);
  assert.ok(definition);
  const built = serviceRowsFor('page', definition, [serviceSourceOf(selected({
    route: 'mod.page.list',
    pageId: 'page',
    kind: 'qry',
    outputs: [{ key: 'item', entity: 'Item', many: false }],
    params: [{ name: 'term', target: 'Item.term', field: 'term' }],
  }))]);
  assert.equal(built.rows.length, 1);
  assert.equal(built.rows[0]?.serves, undefined);
  assert.equal(built.rows[0]?.transaction, 'none');
  assert.equal(built.rows[0]?.output.length, 1);
});

void test('serve grants are one per connection and pass the scope check', () => {
  const none = serveGrants([selected({ route: 'mod.page.list', pageId: 'page', kind: 'qry' })]);
  assert.deepEqual(none, []);
  const grants = serveGrants([
    selected({ route: 'agents.cm.record', pageId: 'cm', kind: 'cmd', serves: 'cm.record' }),
    selected({ route: 'agents.cm.describe', pageId: 'cm', kind: 'qry', serves: 'cm.describe' }),
    selected({ route: 'agents.other.read', pageId: 'other', kind: 'qry', serves: 'other.read' }),
  ]);
  assert.deepEqual(grants.map(grant => grant.grantId), ['connection_cm', 'connection_other']);
  assert.equal(grants[0]?.actorRef, 'connection:cm');
  const issues = accessScopeIssues({ scopeId: 'accessScope', grants });
  assert.deepEqual(issues, []);
});
