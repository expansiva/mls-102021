/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/taskEffects.test.ts" enhancement="_blank"/>

// d1_279: a task of a workflow process says what it does to each entity in `entityEffects` (read by the NS5 reader of an arrival) or, in the older form, with
// one `entityRef` and one `effect`. One function reads it. The proof edits, in memory, the L4 `workflows.defs.ts` of the recorded state `102047@2e3e5a1b`
// (the task `chooseNewToolsPerAgent`, the same in `bc0fbedf`); the live tree of the 102047 is never written.

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedD1Fixture, loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { emitProcesses } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { operationUsecasesOf } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { processesOf } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';
import { workflowFiles } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { deriveProcessUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/deriveProcess.js';
import { taskEffects } from '/_102021_/l2/helpers/l1Defs/taskEffects.js';
import { workflowTablesFromL4 } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';

const PROJECT = 102047;
const OLD_TASK = '"entityRef": "AgentTool",\n          "effect": "update",\n          "next": [],\n          "description": "For every agent';
const NEW_TASK = '"entityEffects": [{ "entityId": "AgentTool", "effects": ["create", "update"] }],\n          "next": [],\n          "description": "For every agent';

function usecase(entity: string, operation: string): D1SelectedUsecase {
  const id = `${operation}${entity}`;
  return { usecaseId: id, entity, operation, status: 'toCreate', existing: '', identity: id, routes: [] };
}

void test('d1_279: entityEffects wins; the older entityRef + effect reads as one entry; a task that names nothing gives nothing', () => {
  assert.deepEqual(taskEffects({ entityEffects: [{ entityId: 'AgentTool', effects: ['create', 'update'] }] }), [{ entityId: 'AgentTool', effects: ['create', 'update'] }]);
  assert.deepEqual(taskEffects({ entityRef: 'Tool', effect: 'update' }), [{ entityId: 'Tool', effects: ['update'] }]);
  assert.deepEqual(taskEffects({ entityRef: 'Tool' }), [{ entityId: 'Tool', effects: [] }], 'the entity of the record, no effect');
  assert.deepEqual(taskEffects({ entityEffects: [], entityRef: 'Tool', effect: 'update' }), [], 'a present list is the answer, even empty');
  assert.deepEqual(taskEffects({ taskId: 't' }), []);
  assert.deepEqual(taskEffects({ entityEffects: [{ effects: ['create'] }] }), [], 'an entry with no entity is dropped');
});

async function agentsHost(edit: boolean) {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const path = 'l4/agents/workflows.defs.ts';
  const text = loadD1Fixture('agents-2e3e5a1b')[path];
  assert.ok(text.includes(OLD_TASK), 'the task of the recorded state');
  if (edit) seed(host, fileInfoFromDisplay(PROJECT, path)!, text.replace(OLD_TASK, NEW_TASK));
  return { host, text: edit ? text.replace(OLD_TASK, NEW_TASK) : text };
}

const selected = [usecase('Tool', 'create'), usecase('Tool', 'update'), usecase('AgentTool', 'create'), usecase('AgentTool', 'update')];

void test('d1_279: the task with entityEffects create+update gives both operations in the same step; the old task is as it was', async () => {
  await agentsHost(false);
  const before = (await processesOf(PROJECT, 'agents', selected)).find(plan => plan.processId === 'toolCatalogRefresh')!;
  assert.deepEqual(before.operations.filter(item => item.operation.startsWith('AgentTool.')), [{ operation: 'AgentTool.update', steps: ['task:chooseNewToolsPerAgent'], selected: true }]);
  await agentsHost(true);
  const after = (await processesOf(PROJECT, 'agents', selected)).find(plan => plan.processId === 'toolCatalogRefresh')!;
  assert.deepEqual(after.operations.filter(item => item.operation.startsWith('AgentTool.')), [
    { operation: 'AgentTool.create', steps: ['task:chooseNewToolsPerAgent'], selected: true },
    { operation: 'AgentTool.update', steps: ['task:chooseNewToolsPerAgent'], selected: true },
  ]);
  assert.deepEqual(after.operations.filter(item => !item.operation.startsWith('AgentTool.')), before.operations.filter(item => !item.operation.startsWith('AgentTool.')), 'nothing else moves');
  assert.equal(after.occurrence, before.occurrence);
});

void test('d1_279: the task with entityEffects [] gives no operation', async () => {
  const { host, text } = await agentsHost(false);
  seed(host, fileInfoFromDisplay(PROJECT, 'l4/agents/workflows.defs.ts')!, text.replace(OLD_TASK, '"entityEffects": [],\n          "next": [],\n          "description": "For every agent'));
  const plan = (await processesOf(PROJECT, 'agents', selected)).find(item => item.processId === 'toolCatalogRefresh')!;
  assert.deepEqual(plan.operations.filter(item => item.operation.startsWith('AgentTool.')), []);
});

// s2: the def of the process, derived with no model, lists the operations and, through its pipeline item, the usecase of the create.
void test('d1_279 s2: the def of toolCatalogRefresh lists AgentTool.create and AgentTool.update and depends on createAgentTool', async () => {
  await agentsHost(true);
  const processes = await processesOf(PROJECT, 'agents', selected);
  const request = { project: PROJECT, moduleName: 'agents', processes, files: [], transitionUsecases: [], operationUsecases: operationUsecasesOf(selected) } as never;
  const emitted = emitProcesses(request, []).emit.find(item => item.definition.artifactId === 'toolCatalogRefresh')!;
  const operations = (emitted.definition.data.operations as Array<{ operation: string }>).map(item => item.operation);
  assert.ok(operations.includes('AgentTool.create'));
  assert.ok(operations.includes('AgentTool.update'));
  const depends = emitted.pipeline.flatMap(item => item.dependsFiles);
  assert.ok(depends.some(path => path.endsWith('/usecases/createAgentTool.defs.ts')), 'createAgentTool is a dependency');
  assert.ok(depends.some(path => path.endsWith('/usecases/updateAgentTool.defs.ts')));
});

void test('d1_279: the route derivation and the workflow emitter read the task through the same function', async () => {
  const { text } = await agentsHost(true);
  const tables = workflowTablesFromL4(text);
  assert.equal(tables.find(table => table.processId === 'toolCatalogRefresh')?.recordEntity, 'Tool', 'the record entity is the first task entity, as before');
  // deriveProcessUsecases: a request that serves the event of the process takes the usecases of every effect its tasks say.
  const process = { processId: 'p', trigger: { kind: 'event', event: 'sys.arrived' }, tasks: [{ taskId: 't', kind: 'mechanical', entityEffects: [{ entityId: 'Item', effects: ['create', 'update'] }] }] };
  const kept = deriveProcessUsecases({
    workflows: { processes: [process] },
    requests: [{ route: 'agents.sys.arrived', serves: 'sys.arrived' }],
    usecases: [usecase('Item', 'create'), usecase('Item', 'update')],
    moduleName: 'agents',
    problems: [],
    entities: {},
    plannedIds: new Map(),
    removedIds: new Set(),
  } as never);
  assert.deepEqual([...(kept.get('agents.sys.arrived') ?? [])].sort(), ['createItem', 'updateItem']);
});

void test('d1_279: the input gate lists the usecase of each effect the task says as a dependency of the process file', () => {
  const process = { processId: 'p', tasks: [{ taskId: 't', kind: 'llm', entityEffects: [{ entityId: 'Item', effects: ['create', 'update'] }] }, { taskId: 'u', kind: 'mechanical', entityRef: 'Other', effect: 'update' }] };
  const plans = workflowFiles({ processes: [process], journeyDecisions: [] }, {}, [usecase('Item', 'create'), usecase('Item', 'update'), usecase('Other', 'update')]);
  assert.deepEqual(plans, [{ processId: 'p', dependsOn: ['usecase:createItem', 'usecase:updateItem', 'usecase:updateOther'] }]);
});
