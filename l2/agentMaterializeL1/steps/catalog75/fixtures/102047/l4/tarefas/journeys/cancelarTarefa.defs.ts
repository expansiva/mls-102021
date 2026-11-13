/// <mls fileReference="_102047_/l4/tarefas/journeys/cancelarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarTarefa",
  "business": {
    "actorRef": "gestor",
    "title": "Cancelar tarefa",
    "goal": "Cancelar uma tarefa que não deve mais ser feita.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTarefaCancelar",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa",
        "description": "O gestor localiza a tarefa em lista ou no quadro."
      },
      {
        "stepId": "cancelar",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Cancelar tarefa",
        "description": "O gestor cancela a tarefa e quem estava agindo é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa está cancelada.",
      "evidence": [
        "A tarefa aparece na coluna cancelada do quadro"
      ]
    }
  },
  "businessHash": "sha256:44bfbcc432a73799ad8092eaf75dcb02f0ef3b3c1893856e50bdc6c1395d2ea6"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarTarefaJourneyType = typeof cancelarTarefaJourney;

export default cancelarTarefaJourney;
