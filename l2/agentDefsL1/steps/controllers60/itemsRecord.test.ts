/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/itemsRecord.test.ts" enhancement="_blank"/>

/**
 * d1_195: the items of a page are a record of entity members (`interface AgentListItem { agent?: AgentCard; draft?: DraftCard }`).
 * The derivation keys the outputs `agents.agent` and `agents.draft`, without the wrapper; the request service walks into
 * the items of the page and spells the path as the contract does (`agents.items.agent`). Without that walk the nodes
 * do not assemble and each is CONTRACT_UNPARSED.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import type { D1RequestGapAnswer } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readContractV2, serviceRowsFor } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import type { D1ServiceRequestSource } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

const ROUTE = 'hub.studio.load';

const CONTRACT = `/// <mls fileReference="_102099_/l2/hub/web/contracts/studio.defs.ts" enhancement="_blank"/>

export interface AgentCard {
  id: string;
  name: string;
}

export interface DraftCard {
  id: string;
  title: string;
}

export interface AgentListItem {
  agent?: AgentCard;
  draft?: DraftCard;
}

export interface StudioContracts {
  '${ROUTE}': {
    kind: 'qry';
    input: { page?: number; pageSize?: number };
    output: { agents: { items: AgentListItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['dev']; grants: ['devGrant']; scope: 'organization' };
  };
}
`;

const ENTITIES: Record<string, unknown> = {
  Agent: { entityId: 'Agent', record: { fields: { id: { type: 'uuid', derived: true }, name: { type: 'string' } } } },
  Draft: { entityId: 'Draft', record: { fields: { id: { type: 'uuid', derived: true }, title: { type: 'string' } } } },
};

/** input20 + resolve25 stand-in: the real derivation, each gap with one candidate and `none` takes the candidate. */
function selected(definition: NonNullable<ReturnType<typeof readContractV2>>): D1ServiceRequestSource {
  const found = definition.routes.find(item => item.route === ROUTE);
  assert.ok(found, ROUTE);
  const first = applyResolutions({ route: found, definition, entities: ENTITIES }, []);
  const answers: D1RequestGapAnswer[] = first.unresolved.filter(gap => gap.candidates.length === 2).map(gap => ({ path: gap.path, choice: gap.candidates[0] }));
  const result = applyResolutions({ route: found, definition, entities: ENTITIES }, answers);
  return { route: ROUTE, pageId: 'studio', kind: found.kind, uses: [], outputs: result.outputs, params: result.params };
}

void test('members of the items of a page wrapper sit at <wrapper>.items.<member>, and the contract is not CONTRACT_UNPARSED', () => {
  const definition = readContractV2(CONTRACT);
  assert.ok(definition, 'the contract parses');
  const source = selected(definition);
  assert.deepEqual(source.outputs.map(output => [output.key, output.entity, output.parent]), [
    ['agents.agent', 'Agent', undefined],
    ['agents.draft', 'Draft', undefined],
  ]);
  const built = serviceRowsFor('studio', definition, [source]);
  assert.deepEqual(built.problems, []);
  assert.equal(built.problems.some(item => item.code === 'CONTRACT_UNPARSED'), false);
  const row = built.rows.find(item => item.route === ROUTE);
  assert.ok(row);
  assert.deepEqual(row.output, [
    { kind: 'entity', path: 'agents.items.agent', entity: 'Agent', fields: [{ field: 'id', path: 'id' }, { field: 'name', path: 'name' }] },
    { kind: 'entity', path: 'agents.items.draft', entity: 'Draft', fields: [{ field: 'id', path: 'id' }, { field: 'title', path: 'title' }] },
  ]);
  assert.equal(row.output.some(node => node.kind === 'unresolved'), false);
});
