/// <mls fileReference="_102047_/l4/tarefas/journeys/cancelarTarefaGestor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarTarefaGestorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarTarefaGestor",
  "business": {
    "actorRef": "gestor",
    "title": "Cancelar tarefa da equipe",
    "goal": "Cancelar qualquer tarefa da equipe.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarParaCancelar",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar a tarefa",
        "description": "Encontra a tarefa entre todas as da equipe."
      },
      {
        "stepId": "cancelarPeloGestor",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "cancelar",
        "title": "Cancelar a tarefa",
        "description": "Passa a tarefa para cancelada; a sala de discussão recebe a mensagem."
      }
    ],
    "outcome": {
      "statement": "A tarefa está cancelada.",
      "evidence": [
        "Situação cancelada",
        "Mensagem do cancelamento na sala de discussão"
      ]
    }
  },
  "businessHash": "sha256:57147b9a29e6c614705bdb97e9ac5e07d954135bc02e8b16d97c4e13f803c84a"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarTarefaGestorJourneyType = typeof cancelarTarefaGestorJourney;

export default cancelarTarefaGestorJourney;
