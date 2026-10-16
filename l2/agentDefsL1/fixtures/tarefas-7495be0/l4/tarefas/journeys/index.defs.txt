/// <mls fileReference="_102047_/l4/tarefas/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "tarefas",
  "journeys": [
    {
      "journeyId": "criarTarefa",
      "actorRef": "membroEquipe",
      "title": "Criar tarefa"
    },
    {
      "journeyId": "executarTarefa",
      "actorRef": "membroEquipe",
      "title": "Executar tarefa atribuída"
    },
    {
      "journeyId": "revisarTarefa",
      "actorRef": "membroEquipe",
      "title": "Revisar tarefa criada"
    },
    {
      "journeyId": "retomarTarefaDevolvida",
      "actorRef": "membroEquipe",
      "title": "Retomar tarefa devolvida"
    },
    {
      "journeyId": "editarTarefa",
      "actorRef": "membroEquipe",
      "title": "Editar tarefa"
    },
    {
      "journeyId": "cancelarTarefaCriador",
      "actorRef": "membroEquipe",
      "title": "Cancelar tarefa criada"
    },
    {
      "journeyId": "reatribuirTarefaCriador",
      "actorRef": "membroEquipe",
      "title": "Reatribuir tarefa criada"
    },
    {
      "journeyId": "avisoDiarioVencimentos",
      "actorRef": "membroEquipe",
      "title": "Consultar aviso diário"
    },
    {
      "journeyId": "manterListas",
      "actorRef": "gestor",
      "title": "Manter listas"
    },
    {
      "journeyId": "acompanharTarefasEquipe",
      "actorRef": "gestor",
      "title": "Acompanhar tarefas da equipe"
    },
    {
      "journeyId": "reatribuirTarefaGestor",
      "actorRef": "gestor",
      "title": "Reatribuir tarefa"
    },
    {
      "journeyId": "cancelarTarefaGestor",
      "actorRef": "gestor",
      "title": "Cancelar tarefa da equipe"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type TarefasJourneyIndexType = typeof tarefasJourneyIndex;

export default tarefasJourneyIndex;
