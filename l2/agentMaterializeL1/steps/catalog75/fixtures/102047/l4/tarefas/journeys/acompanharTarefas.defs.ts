/// <mls fileReference="_102047_/l4/tarefas/journeys/acompanharTarefas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharTarefasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharTarefas",
  "business": {
    "actorRef": "gestor",
    "title": "Acompanhar todas as tarefas",
    "goal": "Acompanhar todas as tarefas por lista, responsável, prioridade, prazo e situação, em lista e em quadro.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "filtrarTarefas",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Filtrar tarefas",
        "description": "O gestor filtra todas as tarefas por lista, responsável, prioridade, prazo e situação, com lista vazia e erro mostrados separadamente."
      },
      {
        "stepId": "verQuadro",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver quadro por situação",
        "description": "O gestor alterna entre a visão em lista e o quadro com colunas por situação."
      },
      {
        "stepId": "abrirTarefaGestor",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Abrir tarefa",
        "description": "O gestor abre uma tarefa para ver detalhes, checklist e conversa."
      }
    ],
    "outcome": {
      "statement": "O gestor tem visão de todas as tarefas da equipe.",
      "evidence": [
        "O quadro mostra as tarefas nas colunas a fazer, em andamento, em revisão, concluída e cancelada",
        "Os filtros aplicados restringem a lista e o quadro"
      ]
    }
  },
  "businessHash": "sha256:b2139d456f412d315d7bf7ba425b5c9722cf3b5170562489b2d0827eb1176ff1"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharTarefasJourneyType = typeof acompanharTarefasJourney;

export default acompanharTarefasJourney;
