/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/io.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { D1SupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import { buildD1Support } from '/_102021_/l2/agentDefsL1/steps/support70/gate.js';
import { accessGrantsOf, catalogOperationsOf, connectionOperations } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

void test('a summaryOnly grant is fieldsOnly with its allowed fields on the accessScope', () => {
  const read = accessGrantsOf({
    grants: [{
      grantId: 'pessoaVeEmpresa',
      actorRef: 'pessoa',
      entityRefs: ['Empresa'],
      disclosure: { mode: 'summaryOnly', allowedFields: ['Empresa.nome', 'Empresa.documento'] },
      dataScope: { anchorEntity: 'Empresa', mode: 'own' },
    }],
  }, {});
  assert.deepEqual(read.problems, []);
  const request: D1SupportRequest = {
    project: 102021,
    moduleName: 'inicio',
    grants: read.grants,
    relationships: [],
    scopePlans: [],
    citedGrantIds: [],
    adapters: [],
    files: [],
    existingHelpers: [],
    applicationEdges: [],
    formFields: [],
    enumerations: [],
    tables: [],
    models: [],
    journeys: [],
    missingJourneys: [],
    roleTags: [],
    seedRefs: [],
    existingDatasets: [],
    maintenance: null,
    outbound: [],
    selectedEventIds: [],
    usecaseIds: [],
    transitionUsecases: [],
    operations: [],
    processes: [],
  };
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  const grant = (scope?.definition.data as { grants: Array<{ grantId: string; disclosure: string; allowedFields?: string[] }> }).grants
    .find(item => item.grantId === 'pessoaVeEmpresa');
  assert.equal(grant?.disclosure, 'fieldsOnly');
  assert.deepEqual(grant?.allowedFields, ['Empresa.nome', 'Empresa.documento']);
});

void test('a serve request without an L4 grant adds one connection grant to accessScope and authorityMap', () => {
  const read = accessGrantsOf({ grants: [] }, {}, [
    { serves: 'cm.describe' },
    { serves: 'cm.record' },
  ]);
  assert.deepEqual(read.problems, []);
  assert.equal(read.grants.length, 1);
  assert.equal(read.grants[0]?.grantId, 'connection_cm');
  assert.equal(read.grants[0]?.actorRef, 'connection:cm');
  const request: D1SupportRequest = {
    project: 102021,
    moduleName: 'inicio',
    grants: read.grants,
    relationships: [],
    scopePlans: [],
    citedGrantIds: [],
    adapters: [],
    files: [],
    existingHelpers: [],
    applicationEdges: [],
    formFields: [],
    enumerations: [],
    tables: [],
    models: [],
    journeys: [],
    missingJourneys: [],
    roleTags: [],
    seedRefs: [],
    existingDatasets: [],
    maintenance: null,
    outbound: [],
    selectedEventIds: [],
    usecaseIds: [],
    transitionUsecases: [],
    operations: [],
    processes: [],
  };
  const build = buildD1Support(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const scope = build.emit.find(item => item.definition.artifactType === 'accessScope');
  const auth = build.emit.find(item => item.definition.artifactType === 'authorityMap');
  const scopeGrant = (scope?.definition.data as { grants: Array<{ grantId: string; actorRef: string }> }).grants[0];
  const entry = (auth?.definition.data as { entries: Array<{ grantId: string; actorRef: string }> }).entries[0];
  assert.equal(scopeGrant?.grantId, 'connection_cm');
  assert.equal(scopeGrant?.actorRef, 'connection:cm');
  assert.equal(entry?.grantId, 'connection_cm');
  assert.equal(entry?.actorRef, 'connection:cm');
  const plain = accessGrantsOf({
    grants: [{
      grantId: 'pessoaVeEmpresa',
      actorRef: 'pessoa',
      entityRefs: ['Empresa'],
      disclosure: { mode: 'fullRecord' },
      dataScope: { mode: 'organization' },
    }],
  }, {});
  assert.equal(plain.grants.length, 1);
  assert.equal(plain.grants[0]?.grantId, 'pessoaVeEmpresa');
});

void test('a disclosure mode outside fullRecord, fieldsOnly and summaryOnly is an error on the grant', () => {
  const read = accessGrantsOf({
    grants: [{
      grantId: 'pessoaVeEmpresa',
      actorRef: 'pessoa',
      entityRefs: ['Empresa'],
      disclosure: { mode: 'hidden', allowedFields: ['Empresa.nome'] },
    }],
  }, {});
  assert.deepEqual(read.grants, []);
  assert.equal(read.problems.length, 1);
  assert.equal(read.problems[0].severity, 'error');
  assert.equal(read.problems[0].path, 'pessoaVeEmpresa');
  assert.match(read.problems[0].message, /pessoaVeEmpresa/);
});

const CM_CATALOG = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../mls-102034/l2/shared/contracts/connections/cm.ts',
);

function selectedUsecase(usecaseId: string, entity = 'Nota', operation = 'read', transitionRef = ''): D1SelectedUsecase {
  return {
    usecaseId,
    entity,
    operation,
    status: 'toCreate',
    existing: '',
    identity: usecaseId,
    routes: [],
    ...(transitionRef ? { transitionRef } : {}),
  };
}

function journeyWith(journeyId: string, stepId: string, step: Record<string, string>): Record<string, unknown> {
  return { [journeyId]: { journeyId, business: { steps: [{ stepId, ...step }] } } };
}

void test('a call line becomes a connection operation and a serve line is ignored', async () => {
  const catalog = await catalogOperationsOf(readFileSync(CM_CATALOG, 'utf8'));
  assert.ok(catalog);
  const call = catalog.find(item => item.operationId === 'listAgents');
  const serve = catalog.find(item => item.operationId === 'describe');
  assert.equal(call?.direction, 'call');
  assert.equal(serve?.direction, 'serve');
  const selected = [selectedUsecase('listarNotas')];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'listAgents', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'describe', direction: 'serve', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'notInCatalog', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'absent', operationId: 'listAgents', direction: 'call', usedBy: ['listarNotas'] },
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', usedBy: ['nenhumPasso'] },
    { connectionId: 'cm', operationId: 'simulateAgent', direction: 'call', usedBy: ['simular.rodar'] },
  ], selected, { cm: catalog, absent: null }, journeyWith('simular', 'rodar', { kind: 'act', entity: 'Nota', effect: 'read' }));
  assert.deepEqual(rows.map(item => item.operationId), ['listAgents', 'notInCatalog', 'listAgents', 'readAgent', 'simulateAgent']);
  assert.equal(rows[0]?.consumer, 'listarNotas');
  assert.equal(rows[0]?.catalogOps?.some(item => item.operationId === 'listAgents' && item.direction === 'call'), true);
  assert.equal(rows[2]?.catalogOps, null);
  assert.equal(rows[3]?.consumer, '');
  assert.equal(rows[4]?.consumer, 'listarNotas');
});

void test('a journey effect read or remove resolves the get or delete usecase', () => {
  const selected = [selectedUsecase('lerNota', 'Nota', 'get'), selectedUsecase('apagarNota', 'Nota', 'delete')];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', effect: 'read', entityRefs: ['Nota'], usedBy: ['jornada.ler'] },
    { connectionId: 'cm', operationId: 'retireAgent', direction: 'call', effect: 'remove', entityRefs: ['Nota'], usedBy: ['jornada.apagar'] },
  ], selected, {}, {
    jornada: {
      journeyId: 'jornada',
      business: {
        steps: [
          { stepId: 'ler', kind: 'act', entity: 'Nota', effect: 'read' },
          { stepId: 'apagar', kind: 'act', entity: 'Nota', effect: 'remove' },
        ],
      },
    },
  });
  assert.equal(rows[0]?.consumer, 'lerNota');
  assert.equal(rows[1]?.consumer, 'apagarNota');
});

void test('an inspect step and an act transition step name the usecase through usedBy', () => {
  const selected = [
    selectedUsecase('listAgentSimulation', 'AgentSimulation', 'list'),
    selectedUsecase('activate', 'AgentDraft', 'transition', 'activate'),
  ];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'simulateAgent', direction: 'call', usedBy: ['simulateDraft.seeWhatItCan'] },
    { connectionId: 'cm', operationId: 'activateAgent', direction: 'call', usedBy: ['reviewAndActivateDraft.activateDraft'] },
    { connectionId: 'cm', operationId: 'orphan', direction: 'call', usedBy: ['reviewAndActivateDraft.notInPool'] },
  ], selected, {}, {
    simulateDraft: {
      journeyId: 'simulateDraft',
      business: { steps: [{ stepId: 'seeWhatItCan', kind: 'inspect', entity: 'AgentSimulation' }] },
    },
    reviewAndActivateDraft: {
      journeyId: 'reviewAndActivateDraft',
      business: {
        steps: [
          { stepId: 'activateDraft', kind: 'act', entity: 'AgentDraft', effect: 'transition', transitionRef: 'activate' },
          { stepId: 'notInPool', kind: 'act', entity: 'AgentDraft', effect: 'transition', transitionRef: 'missing' },
        ],
      },
    },
  });
  assert.equal(rows[0]?.consumer, 'listAgentSimulation');
  assert.equal(rows[1]?.consumer, 'activate');
  assert.equal(rows[2]?.consumer, '');
});

void test('a call used by the steps of two usecases becomes one operation per consumer', () => {
  const selected = [selectedUsecase('atualizarTarefa', 'Tarefa', 'update'), selectedUsecase('atualizarNota', 'Nota', 'update')];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', effect: 'update', usedBy: ['jornada.nota', 'jornada.tarefa'] },
    { connectionId: 'cm', operationId: 'orphan', direction: 'call', usedBy: ['jornada.semUsecase'] },
  ], selected, {}, {
    jornada: {
      journeyId: 'jornada',
      business: {
        steps: [
          { stepId: 'nota', kind: 'act', entity: 'Nota', effect: 'update' },
          { stepId: 'tarefa', kind: 'act', entity: 'Tarefa', effect: 'update' },
          { stepId: 'semUsecase', kind: 'act', entity: 'Outra', effect: 'update' },
        ],
      },
    },
  });
  const updates = rows.filter(item => item.operationId === 'updateAgent');
  assert.deepEqual(updates.map(item => item.consumer), ['atualizarNota', 'atualizarTarefa']);
  const orphans = rows.filter(item => item.operationId === 'orphan');
  assert.deepEqual(orphans.map(item => item.consumer), ['']);
});

void test('a call cited by a process task has the process as consumer, and a journey step still gives one row per usecase', () => {
  const selected = [selectedUsecase('atualizarTarefa', 'Tarefa', 'update'), selectedUsecase('atualizarNota', 'Nota', 'update')];
  const journeys = {
    jornada: {
      journeyId: 'jornada',
      business: {
        steps: [
          { stepId: 'nota', kind: 'act', entity: 'Nota', effect: 'update' },
          { stepId: 'tarefa', kind: 'act', entity: 'Tarefa', effect: 'update' },
        ],
      },
    },
  };
  const processes = [{
    processId: 'proc',
    tasks: [{ taskId: 'taskMech', kind: 'mechanical' }, { taskId: 'taskLlm', kind: 'llm' }, { taskId: 'taskHuman', kind: 'human' }],
  }];
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'runAgent', direction: 'call', usedBy: ['proc.taskMech'] },
    { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', effect: 'update', usedBy: ['jornada.nota', 'jornada.tarefa'] },
    { connectionId: 'cm', operationId: 'humanOnly', direction: 'call', usedBy: ['proc.taskHuman'] },
    { connectionId: 'cm', operationId: 'mixed', direction: 'call', usedBy: ['proc.taskLlm', 'jornada.nota'] },
  ], selected, {}, journeys, processes);
  assert.deepEqual(rows.filter(item => item.operationId === 'runAgent').map(item => item.consumer), ['proc']);
  assert.deepEqual(rows.filter(item => item.operationId === 'updateAgent').map(item => item.consumer), ['atualizarNota', 'atualizarTarefa']);
  // A human task is not a consumer: the call stays without one.
  assert.deepEqual(rows.filter(item => item.operationId === 'humanOnly').map(item => item.consumer), ['']);
  assert.deepEqual(rows.filter(item => item.operationId === 'mixed').map(item => item.consumer), ['atualizarNota', 'proc']);
  // Without the processes (the default) the process task names nobody.
  assert.deepEqual(connectionOperations([{ connectionId: 'cm', operationId: 'runAgent', direction: 'call', usedBy: ['proc.taskMech'] }], selected, {}, journeys).map(item => item.consumer), ['']);
});

void test('a usecase that names its call (a split) is the consumer only of that call, not of the other calls of the same step', () => {
  const selected: D1SelectedUsecase[] = [
    { ...selectedUsecase('getAgent', 'Agent', 'get'), call: 'cm.readAgent' },
    { ...selectedUsecase('listAgent', 'Agent', 'list'), call: 'cm.listAgents' },
  ];
  const journeys = {
    jornada: {
      journeyId: 'jornada',
      business: {
        steps: [
          { stepId: 'find', kind: 'locate', entity: 'Agent' },
          { stepId: 'see', kind: 'inspect', entity: 'Agent' },
        ],
      },
    },
  };
  const rows = connectionOperations([
    { connectionId: 'cm', operationId: 'listAgents', direction: 'call', usedBy: ['jornada.find'] },
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', usedBy: ['jornada.see'] },
  ], selected, {}, journeys);
  assert.deepEqual(rows.filter(item => item.operationId === 'listAgents').map(item => item.consumer), ['listAgent']);
  assert.deepEqual(rows.filter(item => item.operationId === 'readAgent').map(item => item.consumer), ['getAgent']);
  assert.equal(rows.length, 2, 'no operation has both consumers');
});
