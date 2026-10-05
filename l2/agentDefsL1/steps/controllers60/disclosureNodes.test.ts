/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/disclosureNodes.test.ts" enhancement="_blank"/>

/**
 * d1_63: each projected path is checked by what it is in the ontology, not by the name the contract writes. A command
 * that creates a record and returns it flattened (a derived ontology path behind a readonly name, a field of an N:1
 * entity, a nested 1:N relation, system id/version, and one value that is no ontology path) goes from the derivation
 * (`applyResolutions`, answers as resolve25 records them) to the request service row (`serviceRowsFor`) and through the
 * one rule (`nodeDisclosure`). Ids are arbitrary.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import type { D1RequestGapAnswer } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readContractV2, serviceRowsFor } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import { nodeDisclosure, outputNodes, type DisclosureGrant, type NodeDisclosure } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

const ROUTE = 'qqYard.dock.openCrate';

const CONTRACT = `/// <mls fileReference="_900004_/l2/qqYard/web/contracts/dock.defs.ts" enhancement="_blank"/>

export interface SlotView {
  id: string;
  version: number;
  qty: number;
  readonly worth: string;
  label: string;
}

export interface CrateView {
  id: string;
  version: number;
  ref: number;
  bayId: string;
  tag: string;
  readonly tally: string;
  readonly ratio: number;
  slots: SlotView[];
}

export interface DockContracts {
  /**
   * Finalidade: Opens a crate for the bay.
   * Entrada: bayId.
   * Processamento: Creates the crate.
   * Saída: The new crate with its slots.
   */
  '${ROUTE}': {
    kind: 'cmd';
    writes: 'Crate.create';
    input: { bayId: string };
    output: { crate: CrateView };
    rules: [];
    access: { actors: ['loader']; grants: ['loaderDock']; scope: 'organization' };
  };
}
`;

const ENTITIES: Record<string, unknown> = {
  Crate: {
    entityId: 'Crate',
    relationships: {
      bay: { relationshipId: 'crateBay', to: 'Bay', via: 'Crate.bayId', cardinality: 'N:1' },
      slots: { relationshipId: 'slotCrate', to: 'Slot', via: 'Slot.crateId', cardinality: '1:N' },
    },
    record: {
      fields: {
        id: { type: 'uuid', derived: true },
        version: { type: 'integer', derived: true },
        ref: { type: 'integer' },
        bayId: { type: 'record', to: ['Bay'] },
        details: { type: 'object', fields: { tally: { type: 'money', derived: true }, seal: { type: 'string' } } },
      },
    },
  },
  Bay: {
    entityId: 'Bay',
    relationships: { crates: { relationshipId: 'crateBay', to: 'Crate', via: 'Crate.bayId', cardinality: '1:N' } },
    record: { fields: { id: { type: 'uuid', derived: true }, version: { type: 'integer', derived: true }, tag: { type: 'string' } } },
  },
  Slot: {
    entityId: 'Slot',
    relationships: {
      crate: { relationshipId: 'slotCrate', to: 'Crate', via: 'Slot.crateId', cardinality: 'N:1' },
      item: { relationshipId: 'slotItem', to: 'Item', via: 'Slot.itemId', cardinality: 'N:1' },
    },
    record: {
      fields: {
        id: { type: 'uuid', derived: true },
        version: { type: 'integer', derived: true },
        crateId: { type: 'record', to: ['Crate'] },
        itemId: { type: 'record', to: ['Item'] },
        details: { type: 'object', fields: { qty: { type: 'integer' }, worth: { type: 'money', derived: true } } },
      },
    },
  },
  Item: {
    entityId: 'Item',
    relationships: { slots: { relationshipId: 'slotItem', to: 'Slot', via: 'Slot.itemId', cardinality: '1:N' } },
    record: { fields: { id: { type: 'uuid', derived: true }, version: { type: 'integer', derived: true }, label: { type: 'string' } } },
  },
};

const definition = (() => {
  const parsed = readContractV2(CONTRACT);
  assert.ok(parsed, 'the synthetic contract parses');
  return parsed;
})();
const route = definition.routes.find(item => item.route === ROUTE);

/**
 * resolve25 stand-in, one round as resolve25 runs: the gaps of the derivation without answers, each whose candidates are
 * one path and `none` answered with that path, then the route derived once with the answers.
 */
function derived() {
  assert.ok(route, ROUTE);
  const first = applyResolutions({ route, definition, entities: ENTITIES }, []);
  const answers: D1RequestGapAnswer[] = first.unresolved.filter(gap => gap.candidates.length === 2).map(gap => ({ path: gap.path, choice: gap.candidates[0] }));
  const result = applyResolutions({ route, definition, entities: ENTITIES }, answers);
  assert.deepEqual(result.unresolved, [], 'one round closes every gap');
  return result;
}

function outputOf() {
  const result = derived();
  const built = serviceRowsFor('dock', definition, [{ route: ROUTE, pageId: 'dock', kind: 'cmd', uses: [], outputs: result.outputs, params: [] }]);
  assert.deepEqual(built.problems.filter(item => item.severity === 'error'), []);
  const output = built.rows[0]?.outputs[0];
  assert.ok(output, 'one output row');
  return output;
}

const grant = (disclosure: string, entityRefs: string[], allowedFields: string[] = []): DisclosureGrant => ({ disclosure, entityRefs, allowedFields });
const LOADER = grant('fieldsOnly', ['Crate', 'Bay', 'Slot', 'Item'], [
  'Crate.ref', 'Crate.bayId', 'Crate.details.tally', 'Bay.tag', 'Slot.crateId', 'Slot.details', 'Item.label',
]);

function verdicts(grants: readonly DisclosureGrant[], output = outputOf()): Map<string, NodeDisclosure> {
  return new Map(outputNodes(output).map(node => [node.field, nodeDisclosure(grants, node, entity => ENTITIES[entity])]));
}
const refused = (map: Map<string, NodeDisclosure>): string[] => [...map].filter(entry => entry[1] !== 'disclosed').map(entry => `${entry[0]}:${entry[1]}`);

void test('the flattened derived value, the N:1 field and the nested relation are checked on their ontology paths', () => {
  const output = outputOf();
  const nodes = outputNodes(output);
  assert.deepEqual(nodes.find(node => node.field === 'tally'), { kind: 'entity', field: 'tally', entity: 'Crate', path: 'details.tally' });
  assert.deepEqual(nodes.find(node => node.field === 'tag'), { kind: 'entity', field: 'tag', entity: 'Bay', path: 'tag' });
  assert.deepEqual(nodes.find(node => node.field === 'slots.worth'), { kind: 'entity', field: 'slots.worth', entity: 'Slot', path: 'details.worth' });
  assert.deepEqual(nodes.find(node => node.field === 'slots.label'), { kind: 'entity', field: 'slots.label', entity: 'Item', path: 'label' });
  assert.deepEqual(nodes.find(node => node.field === 'ratio'), { kind: 'computed', field: 'ratio', entity: 'Crate' });
  assert.equal(nodes.some(node => node.field === 'slots'), false, 'the relation is its fields, not a leaf');
  // Only the calculated value is refused: the system id/version of both entities leave with the covering grant.
  assert.deepEqual(refused(verdicts([LOADER])), ['ratio:computed']);
});

void test('a mapped field whose ontology path the grant does not list stays refused', () => {
  const narrow = grant('fieldsOnly', LOADER.entityRefs, LOADER.allowedFields.filter(item => item !== 'Crate.details.tally'));
  assert.deepEqual(refused(verdicts([narrow])), ['tally:blocked', 'ratio:computed']);
  // The contract name is not a grant: `Crate.tally` does not name the ontology path.
  const byName = grant('fieldsOnly', LOADER.entityRefs, [...narrow.allowedFields, 'Crate.tally']);
  assert.deepEqual(refused(verdicts([byName])), ['tally:blocked', 'ratio:computed']);
});

void test('a relation that no grant of the route covers is not disclosed', () => {
  const noSlot = grant('fieldsOnly', ['Crate', 'Bay', 'Item'], LOADER.allowedFields);
  const map = verdicts([noSlot]);
  const slotFields = [...map.keys()].filter(field => field.startsWith('slots.') && field !== 'slots.label');
  assert.ok(slotFields.length >= 4, slotFields.join(','));
  for (const field of slotFields) assert.equal(map.get(field), 'blocked', field);
});

void test('a calculated value without an ontology path leaves only when every covering grant is fullRecord', () => {
  assert.equal(verdicts([LOADER]).get('ratio'), 'computed');
  assert.equal(verdicts([grant('fieldsOnly', ['Crate'], ['Crate'])]).get('ratio'), 'computed');
  assert.equal(verdicts([grant('fullRecord', ['Crate'])]).get('ratio'), 'disclosed');
  assert.equal(verdicts([grant('fullRecord', ['Crate']), LOADER]).get('ratio'), 'computed');
  assert.equal(verdicts([grant('fullRecord', ['Bay'])]).get('ratio'), 'computed');
  assert.deepEqual(refused(verdicts([grant('fullRecord', [])])), []);
});

void test('without the resolve25 answer the readonly value stays calculated (closed), not released', () => {
  assert.ok(route, ROUTE);
  const bare = applyResolutions({ route, definition, entities: ENTITIES }, []);
  const crate = bare.outputs.find(item => item.key === 'crate');
  assert.ok(crate);
  assert.equal(crate.computed?.includes('tally'), true, JSON.stringify(crate));
  assert.equal(bare.unresolved.some(gap => gap.path === 'output.crate.tally' && gap.kind === 'fieldPath'), true);
  assert.equal(bare.unresolved.some(gap => gap.path === 'output.crate.ratio'), false, 'no candidate, no gap');
});
