/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/processes.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { processesOf } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

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
