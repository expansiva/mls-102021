/// <mls fileReference="_102047_/l4/tarefas/journeys/avisoDiarioVencimentos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const avisoDiarioVencimentosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "avisoDiarioVencimentos",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Consultar aviso diário",
    "goal": "Ver as tarefas abertas que vencem hoje ou estão atrasadas.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirAviso",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir aviso das 8h",
        "description": "O responsável abre o aviso diário com suas tarefas abertas que vencem hoje ou estão atrasadas."
      },
      {
        "stepId": "verVencendo",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver tarefas vencendo",
        "description": "Consulta cada tarefa listada, com prazo e situação."
      }
    ],
    "outcome": {
      "statement": "O responsável conhece suas tarefas que vencem hoje ou estão atrasadas.",
      "evidence": [
        "Aviso diário recebido às 8h",
        "Tarefas listadas com prazo de hoje ou vencido"
      ]
    }
  },
  "businessHash": "sha256:00d16339e1fe9d7c3d418390c6e85e0ce9a42203cb0ff8f1b2b35d94d241e617"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AvisoDiarioVencimentosJourneyType = typeof avisoDiarioVencimentosJourney;

export default avisoDiarioVencimentosJourney;
