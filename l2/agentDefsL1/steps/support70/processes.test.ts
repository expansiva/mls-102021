/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/processes.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
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
