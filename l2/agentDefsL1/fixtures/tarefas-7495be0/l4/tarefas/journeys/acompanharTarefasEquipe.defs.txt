/// <mls fileReference="_102047_/l4/tarefas/journeys/acompanharTarefasEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharTarefasEquipeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharTarefasEquipe",
  "business": {
    "actorRef": "gestor",
    "title": "Acompanhar tarefas da equipe",
    "goal": "Acompanhar todas as tarefas por lista, responsável, prioridade, prazo e situação.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "filtrarTarefas",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Filtrar tarefas da equipe",
        "description": "Filtra todas as tarefas da equipe por lista, responsável, prioridade, prazo e situação."
      },
      {
        "stepId": "verQuadro",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver lista e quadro",
        "description": "Vê as tarefas em lista ou em quadro por situação."
      },
      {
        "stepId": "verDetalhe",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver detalhe da tarefa",
        "description": "Abre uma tarefa para ver andamento, quem age agora e a discussão."
      }
    ],
    "outcome": {
      "statement": "O gestor tem a visão do andamento de todas as tarefas da equipe.",
      "evidence": [
        "Tarefas exibidas no quadro por situação",
        "Filtros aplicados refletem nas tarefas listadas"
      ]
    }
  },
  "businessHash": "sha256:fbe2ad8d5921c49fa5e0ae85e3a291daf4b19940ff0a6ef8a248cbce0546d3d7"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharTarefasEquipeJourneyType = typeof acompanharTarefasEquipeJourney;

export default acompanharTarefasEquipeJourney;
