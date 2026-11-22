/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/processes.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { workflowProcessIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { arrivalUpserts, inboundOperation, processesOf } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

const PROJECT = 102047;

/** Every derived operation except `ItemChecklist.update` has a selected usecase. */
function selectedExceptChecklist(): D1SelectedUsecase[] {
  const rows: Array<[string, string, string?]> = [
    ['Tarefa', 'create'],
    ['Tarefa', 'update'],
    ['Tarefa', 'transition', 'iniciar'],
    ['Tarefa', 'transition', 'enviarParaRevisao'],
    ['Tarefa', 'transition', 'aceitar'],
    ['Tarefa', 'transition', 'devolver'],
    ['Tarefa', 'transition', 'cancelar'],
    ['AvisoVencimento', 'create'],
  ];
  return rows.map(([entity, operation, transitionRef]) => ({
    usecaseId: transitionRef ? `${entity}.${transitionRef}` : `${entity}.${operation}`,
    entity,
    operation,
    transitionRef,
    status: 'toCreate',
    existing: '',
    identity: transitionRef ? `${entity}.${transitionRef}` : `${entity}.${operation}`,
    routes: [],
  }));
}

void test('tarefas cicloTarefa and avisoDiario plans come from the frozen fixture', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'tarefas-7495be0', PROJECT);
  const plans = await processesOf(PROJECT, 'tarefas', selectedExceptChecklist());
  const ciclo = plans.find(plan => plan.processId === 'cicloTarefa');
  const aviso = plans.find(plan => plan.processId === 'avisoDiario');
  assert.ok(ciclo);
  assert.ok(aviso);
  assert.equal(ciclo.occurrence, 'Tarefa');
  assert.deepEqual(ciclo.functions, [
    'abrirOcorrenciaTarefa',
    'avancarEtapaTarefa',
    'reatribuirQuemAge',
    'resolverQuemAgeAgora',
  ]);
  assert.deepEqual(ciclo.operations, [
    { operation: 'ItemChecklist.update', steps: ['journey:executarTarefa/marcarChecklist'], selected: false },
    { operation: 'Tarefa.aceitar', steps: ['journey:revisarTarefa/aceitarTarefa'], selected: true },
    {
      operation: 'Tarefa.cancelar',
      steps: ['journey:cancelarTarefaCriador/cancelarCriada', 'journey:cancelarTarefaGestor/cancelarPeloGestor'],
      selected: true,
    },
    { operation: 'Tarefa.create', steps: ['journey:criarTarefa/preencherTarefa'], selected: true },
    { operation: 'Tarefa.devolver', steps: ['journey:revisarTarefa/devolverTarefa'], selected: true },
    {
      operation: 'Tarefa.enviarParaRevisao',
      steps: ['journey:executarTarefa/enviarRevisao', 'journey:retomarTarefaDevolvida/reenviarRevisao'],
      selected: true,
    },
    { operation: 'Tarefa.iniciar', steps: ['journey:executarTarefa/iniciarTarefa'], selected: true },
    {
      operation: 'Tarefa.update',
      steps: [
        'journey:retomarTarefaDevolvida/ajustarCampos',
        'journey:reatribuirTarefaCriador/trocarResponsavel',
        'journey:reatribuirTarefaGestor/reatribuir',
      ],
      selected: true,
    },
  ]);
  assert.equal(ciclo.operations.some(row => row.steps.some(step => step.includes('editarTarefa'))), false);
  assert.equal(aviso.occurrence, 'AvisoVencimento');
  assert.deepEqual(aviso.functions, ['gerarAvisosDiarios', 'resolverResponsaveisComVencimento']);
  assert.deepEqual(aviso.operations, [
    { operation: 'AvisoVencimento.create', steps: ['task:gerarAvisos'], selected: true },
  ]);
});

void test('mensalidadesAcademia scheduled alert process has no occurrence', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'mensalidadesAcademia-7495be0', PROJECT);
  const plans = await processesOf(PROJECT, 'mensalidadesAcademia', []);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].processId, 'geracaoMensalMensalidades');
  assert.equal(plans[0].occurrence, '');
  assert.deepEqual(plans[0].operations, []);
});

void test('d1_232: the arrival that starts a process says create and update on an entity: the process plan has both operations, whatever its tasks say', async () => {
  const host = installStudio(PROJECT);
  const workflows = 'export const workflows = {"processes":[{"processId":"refresh","trigger":{"kind":"event","event":"sys.arrived"},"tasks":[{"taskId":"rebuild","kind":"mechanical","entityRef":"Item","effect":"update"}],"functions":[]}]} as const;\n';
  seed(host, fileInfoFromDisplay(PROJECT, 'l4/sample/workflows.defs.ts')!, workflows);
  const usecase = (entity: string, operation: string): D1SelectedUsecase => ({ usecaseId: `${operation}${entity}`, entity, operation, status: 'toCreate', existing: '', identity: `${operation}${entity}`, routes: [] });
  const selected = [usecase('Item', 'create'), usecase('Item', 'update')];
  const alone = await processesOf(PROJECT, 'sample', selected, new Set(['sys.arrived']));
  assert.deepEqual(alone[0].operations, [{ operation: 'Item.update', steps: ['task:rebuild'], selected: true }]);
  const arrivals = arrivalUpserts([{ serves: 'sys.arrived', upserts: [{ entityId: 'Item' }] }, { consumes: 'other.thing', upserts: [{ entityId: 'Else' }] }, { serves: 'x.y' }]);
  assert.deepEqual([...arrivals], [['sys.arrived', ['Item']], ['other.thing', ['Else']]]);
  const both = await processesOf(PROJECT, 'sample', selected, new Set(['sys.arrived']), arrivals);
  assert.deepEqual(both[0].operations, [
    { operation: 'Item.create', steps: ['task:rebuild'], selected: true },
    { operation: 'Item.update', steps: ['task:rebuild'], selected: true },
  ]);
});

void test('d1_232: the consumer of an inbound line is read through the one reader: per entity effects, the old line, and a line that writes nothing', () => {
  const selected: D1SelectedUsecase[] = [
    { usecaseId: 'createItem', entity: 'Item', operation: 'create', status: 'toCreate', existing: '', identity: 'createItem', routes: [] },
    { usecaseId: 'updateItem', entity: 'Item', operation: 'update', status: 'toCreate', existing: '', identity: 'updateItem', routes: [] },
    { usecaseId: 'createOther', entity: 'Other', operation: 'create', status: 'toCreate', existing: '', identity: 'createOther', routes: [] },
  ];
  const upsert = inboundOperation({ id: 'e1', entityEffects: [{ entityId: 'Item', effects: ['create', 'update'] }, { entityId: 'Other', effects: ['create'] }] }, selected);
  assert.deepEqual(upsert?.operations, ['createItem', 'updateItem', 'createOther']);
  assert.equal(upsert?.consumer, 'createItem');
  assert.deepEqual(inboundOperation({ id: 'e1', writes: ['Item', 'Other'], effect: 'create' }, selected)?.operations, ['createItem', 'createOther']);
  assert.deepEqual(inboundOperation({ id: 'e1', entityEffects: [] }, selected)?.operations, []);
});

// d1_275: the plan says which arrival each function receives, from the L4 field and not from the prose.
void test('d1_275 (on 2e3e5a1b): the plan of virtualEmployeeCreation says receiveDraftOutcome receives cm.agentDraftReady', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const plans = await processesOf(PROJECT, 'agents', []);
  assert.deepEqual(plans.find(plan => plan.processId === 'virtualEmployeeCreation')?.receives, [{ function: 'receiveDraftOutcome', arrival: 'cm.agentDraftReady' }]);
  assert.deepEqual(plans.find(plan => plan.processId === 'toolCatalogRefresh')?.receives, []);
});

void test('d1_275: data.receives names a function of the process and an arrival, once each', () => {
  const base = { processId: 'p', trigger: { kind: 'manual', actorRef: 'admin' }, functions: ['receive', 'other'], operations: [{ operation: 'AgentDraft.create', steps: ['task:a'] }] };
  assert.deepEqual(workflowProcessIssues({ ...base, receives: [{ function: 'receive', arrival: 'cm.agentDraftReady' }] }), []);
  assert.deepEqual(workflowProcessIssues(base), []);
  assert.ok(workflowProcessIssues({ ...base, receives: [] }).length > 0, 'a present list is not empty');
  assert.ok(workflowProcessIssues({ ...base, receives: [{ function: 'nope', arrival: 'cm.agentDraftReady' }] }).some(item => item.includes('not in data.functions')));
  assert.ok(workflowProcessIssues({ ...base, receives: [{ function: 'receive', arrival: 'not an arrival' }] }).some(item => item.includes('<connectionId>.<operationId>')));
  assert.ok(workflowProcessIssues({ ...base, receives: [{ function: 'receive', arrival: 'cm.a' }, { function: 'other', arrival: 'cm.a' }] }).some(item => item.startsWith('Duplicate')));
});


// d1_281 s2 (measured on 102047@6b9297d7 with the generator of the HEAD): the port of AgentDraft came out without `update` and the process named no usecase for the
// create of AgentTool, because the arrival `cm.agentDraftReady` (AgentDraft update, AgentTool create) is received by a function of the process, which owns it
// (d1_275), and only the arrival that starts a process (d1_232) was read for what it writes.
void test('d1_281 (on 2e3e5a1b): the process that receives cm.agentDraftReady has AgentDraft.update and AgentTool.create among its operations', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'agents-2e3e5a1b', PROJECT);
  const selected = ['create', 'update'].map(operation => ({ usecaseId: `${operation}AgentTool`, entity: 'AgentTool', operation, status: 'toCreate' as const, existing: '', identity: `${operation}AgentTool`, routes: [] }));
  const plan = (await processesOf(PROJECT, 'agents', selected)).find(item => item.processId === 'virtualEmployeeCreation')!;
  assert.deepEqual(plan.receives, [{ function: 'receiveDraftOutcome', arrival: 'cm.agentDraftReady' }]);
  const line = (operation: string) => plan.operations.find(item => item.operation === operation);
  assert.ok(line('AgentDraft.update'), 'the arrival updates the draft');
  assert.equal(line('AgentDraft.update')?.selected, false, 'no usecase of the pool does it: the process applies it through the port');
  assert.equal(line('AgentTool.create')?.selected, true, 'createAgentTool is the usecase of the create');
  assert.equal(line('AgentTool.create')?.steps.every(step => step.startsWith('task:')), true);
  // A process that receives nothing is not touched.
  const other = (await processesOf(PROJECT, 'agents', selected)).find(item => item.processId === 'toolCatalogRefresh')!;
  assert.deepEqual(other.receives, []);
  assert.equal(other.operations.some(item => item.operation === 'AgentDraft.update'), false);
});
