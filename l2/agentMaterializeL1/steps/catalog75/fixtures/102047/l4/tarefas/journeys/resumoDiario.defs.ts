/// <mls fileReference="_102047_/l4/tarefas/journeys/resumoDiario.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const resumoDiarioJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "resumoDiario",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Receber resumo das 8h",
    "goal": "Ver as tarefas abertas que vencem hoje ou estão atrasadas.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "lerResumo",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ler resumo do dia",
        "description": "O responsável lê no aviso diário das 8h suas tarefas abertas que vencem hoje ou estão atrasadas."
      },
      {
        "stepId": "verVencendo",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver tarefa vencendo",
        "description": "O responsável abre uma das tarefas do resumo para ver o prazo e o que falta."
      }
    ],
    "outcome": {
      "statement": "O responsável conhece as tarefas que vencem hoje ou estão atrasadas.",
      "evidence": [
        "O aviso lista só tarefas abertas com prazo hoje ou vencido"
      ]
    }
  },
  "businessHash": "sha256:6405b62daa3f961495fba20ab57d550769d902eda40254b195404139ac6dad8f"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ResumoDiarioJourneyType = typeof resumoDiarioJourney;

export default resumoDiarioJourney;
