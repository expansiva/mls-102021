/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/transitionRefCollision.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import type { D1UsecaseRequest, D1UsecaseSelection } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { planP1Backend, parseP1Needs } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import type { L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const EMPTY: L1Inventory = { routes: [], usecases: [], ports: [], tables: [], present: false };
const AT = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));

function entity(id: string, from: string, to: string): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId: id,
    moduleName: 'ledger',
    status: 'pending',
    dependencies: [],
    data: {
      entityId: id,
      storageTarget: 'moduleDatabase',
      fields: [
        { name: 'id', type: 'uuid', derived: true },
        { name: 'status', type: 'enum', derived: false },
      ],
      lifecycle: {
        states: [],
        transitions: [{ transitionId: 'aprovar', from: [from], to, by: ['clerk'], ruleRefs: [] }],
      },
      invariants: [],
      imports: [],
    },
  };
}

void test('colliding aprovar keeps each entity transition from P1 through planTransition', async () => {
  const needs = parseP1Needs({
    schemaVersion: '2026-09-21-p2-needs-v1',
    moduleName: 'ledger',
    device: 'web',
    pages: [{
      pageId: 'fila_a',
      actors: ['clerk'],
      reads: [],
      writes: [{ entity: 'A', operation: 'transition', transitionRef: 'aprovar', from: ['journey:a/act'] }],
    }, {
      pageId: 'fila_b',
      actors: ['clerk'],
      reads: [],
      writes: [{ entity: 'B', operation: 'transition', transitionRef: 'aprovar', from: ['journey:b/act'] }],
    }],
  });
  const planned = planP1Backend({
    needs,
    inventory: EMPTY,
    ontology: [
      { entityId: 'A', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [], rules: [] },
      { entityId: 'B', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [], rules: [] },
    ],
    now: AT,
  });
  const selected = planned.file.usecases.filter(item => item.operation === 'transition');
  assert.deepEqual(selected.map(item => item.usecaseId).sort(), ['aprovarA', 'aprovarB']);
  const usecases: D1UsecaseSelection[] = selected.map(item => ({
    usecaseId: item.usecaseId,
    entity: item.entity,
    operation: item.operation,
    transitionRef: item.transitionRef,
    routes: [],
    defPath: `l1/ledger/layer_2_application/usecases/${item.usecaseId}.defs.ts`,
  }));
  const request: D1UsecaseRequest = {
    project: 102047,
    moduleName: 'ledger',
    usecases,
    ports: ['A', 'B'].map(id => ({
      portId: `${id}Repository`,
      entityId: id,
      defPath: `l1/ledger/layer_2_application/ports/${id}.defs.ts`,
      methods: ['transition'],
    })),
    entities: [
      { entityId: 'A', storageTarget: 'moduleDatabase', defPath: 'l1/ledger/layer_3_domain/entities/a.defs.ts', namespace: '', fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'status', type: 'enum', derived: false }], transitions: [{ transitionId: 'aprovar', from: ['queuedA'], to: 'doneA', by: ['clerk'], ruleRefs: [], payload: [] }], rules: [], enumerations: [] },
      { entityId: 'B', storageTarget: 'moduleDatabase', defPath: 'l1/ledger/layer_3_domain/entities/b.defs.ts', namespace: '', fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'status', type: 'enum', derived: false }], transitions: [{ transitionId: 'aprovar', from: ['queuedB'], to: 'doneB', by: ['clerk'], ruleRefs: [], payload: [] }], rules: [], enumerations: [] },
    ],
    moduleRules: [],
    outbound: [],
    contracts: [],
    plans: [],
    llmCalls: 0,
  };
  request.plans = usecases.map(usecase => fixturePlan(request, usecase));
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const services: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'requestService',
    artifactId: 'fila',
    moduleName: 'ledger',
    status: 'pending',
    dependencies: [],
    data: {
      pageId: 'fila',
      requests: [
        { route: 'ledger.fila_a.cmdAprovarA', uses: ['aprovarA'] },
        { route: 'ledger.fila_b.cmdAprovarB', uses: ['aprovarB'] },
      ],
    },
  };
  const entities = new Map([['A', entity('A', 'queuedA', 'doneA')], ['B', entity('B', 'queuedB', 'doneB')]]);
  for (const item of build.emit) {
    const data = item.definition.data as { transitionRef?: string; usecaseId?: string; lifecycle?: { transitionId?: string } };
    assert.equal(data.transitionRef, 'aprovar');
    assert.equal(data.lifecycle?.transitionId, 'aprovar');
    assert.notEqual(data.usecaseId, data.transitionRef);
    const entityFile = `l1/ledger/layer_3_domain/entities/${data.usecaseId === 'aprovarA' ? 'a' : 'b'}.defs.ts`;
    const portFile = `l1/ledger/layer_2_application/ports/${data.usecaseId === 'aprovarA' ? 'a' : 'b'}.defs.ts`;
    const definition: M1Definition = {
      ...item.definition,
      dependencies: [entityFile, portFile],
    };
    const body = entities.get(definition.data.entityId as string);
    const port: M1Definition = {
      schemaVersion: M1_DEFINITION_SCHEMA,
      artifactType: 'repositoryPort',
      artifactId: `${definition.data.entityId}Repository`,
      moduleName: 'ledger',
      status: 'pending',
      dependencies: [],
      data: {
        entityId: definition.data.entityId,
        interfaceName: `${definition.data.entityId}Repository`,
        // As persistence40 plans it: the transition body loads the row by list (portReadsFor).
        methods: [{ name: 'list', params: ['rowFilter'], returns: 'row[]' }, { name: 'transition', params: ['row', 'transitionId'], returns: 'row' }],
      },
    };
    const read = async (ref: string) => {
      if (body && ref.includes('/entities/')) return `export const definition = ${JSON.stringify(body)} as const;\n`;
      if (ref.includes('/ports/')) return `export const definition = ${JSON.stringify(port)} as const;\n`;
      return null;
    };
    const result = await emitBehavior('implement.usecase', definition, `l1/ledger/layer_2_application/usecases/${data.usecaseId}.ts`, read, [services, definition, body]);
    assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
    const source = 'source' in result ? result.source : '';
    const from = definition.data.entityId === 'A' ? 'queuedA' : 'queuedB';
    const to = definition.data.entityId === 'A' ? 'doneA' : 'doneB';
    assert.equal(source.includes(JSON.stringify([from])), true, data.usecaseId);
    assert.equal(source.includes(JSON.stringify(to)), true, data.usecaseId);
    assert.equal(source.includes(definition.data.entityId === 'A' ? 'queuedB' : 'queuedA'), false);
  }
});
