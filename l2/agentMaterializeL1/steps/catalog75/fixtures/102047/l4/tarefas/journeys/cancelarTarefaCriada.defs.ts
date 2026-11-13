/// <mls fileReference="_102047_/l4/tarefas/journeys/cancelarTarefaCriada.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarTarefaCriadaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarTarefaCriada",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Cancelar tarefa que criei",
    "goal": "Cancelar uma tarefa que o membro criou.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarCriadaCancelar",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa criada",
        "description": "O membro localiza a tarefa entre as que criou."
      },
      {
        "stepId": "cancelarCriada",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Cancelar tarefa",
        "description": "Quem criou cancela a tarefa e o responsável é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa criada pelo membro está cancelada.",
      "evidence": [
        "A situação mostra cancelada"
      ]
    }
  },
  "businessHash": "sha256:6c373b2c4170600e6e48bd300a158d72c546da16d775cbc50c005e2cd90cff90"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarTarefaCriadaJourneyType = typeof cancelarTarefaCriadaJourney;

export default cancelarTarefaCriadaJourney;
