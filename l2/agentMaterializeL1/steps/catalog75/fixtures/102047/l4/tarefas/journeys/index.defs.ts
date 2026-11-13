/// <mls fileReference="_102047_/l4/tarefas/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "tarefas",
  "journeys": [
    {
      "journeyId": "configurarParticipantes",
      "actorRef": "gestor",
      "title": "Configurar participantes"
    },
    {
      "journeyId": "manterListas",
      "actorRef": "gestor",
      "title": "Manter listas de tarefas"
    },
    {
      "journeyId": "criarTarefa",
      "actorRef": "membroEquipe",
      "title": "Criar tarefa"
    },
    {
      "journeyId": "executarTarefa",
      "actorRef": "membroEquipe",
      "title": "Executar tarefa e enviar para revisão"
    },
    {
      "journeyId": "revisarTarefa",
      "actorRef": "membroEquipe",
      "title": "Revisar tarefa"
    },
    {
      "journeyId": "retomarTarefa",
      "actorRef": "membroEquipe",
      "title": "Retomar tarefa devolvida"
    },
    {
      "journeyId": "editarTarefa",
      "actorRef": "membroEquipe",
      "title": "Editar campos da tarefa"
    },
    {
      "journeyId": "reatribuirTarefa",
      "actorRef": "gestor",
      "title": "Reatribuir tarefa"
    },
    {
      "journeyId": "reatribuirTarefaCriada",
      "actorRef": "membroEquipe",
      "title": "Reatribuir tarefa que criei"
    },
    {
      "journeyId": "cancelarTarefa",
      "actorRef": "gestor",
      "title": "Cancelar tarefa"
    },
    {
      "journeyId": "cancelarTarefaCriada",
      "actorRef": "membroEquipe",
      "title": "Cancelar tarefa que criei"
    },
    {
      "journeyId": "minhasTarefas",
      "actorRef": "membroEquipe",
      "title": "Ver minhas tarefas"
    },
    {
      "journeyId": "resumoDiario",
      "actorRef": "membroEquipe",
      "title": "Receber resumo das 8h"
    },
    {
      "journeyId": "acompanharTarefas",
      "actorRef": "gestor",
      "title": "Acompanhar todas as tarefas"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type TarefasJourneyIndexType = typeof tarefasJourneyIndex;

export default tarefasJourneyIndex;
