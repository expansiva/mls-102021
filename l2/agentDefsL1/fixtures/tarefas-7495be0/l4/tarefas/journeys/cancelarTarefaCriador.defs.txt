/// <mls fileReference="_102047_/l4/tarefas/journeys/cancelarTarefaCriador.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarTarefaCriadorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarTarefaCriador",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Cancelar tarefa criada",
    "goal": "Cancelar uma tarefa que o próprio membro criou.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarCriada",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa criada",
        "description": "Encontra a tarefa entre as que criou."
      },
      {
        "stepId": "cancelarCriada",
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
  "businessHash": "sha256:8925197e9c62f59501ef550e42cc2b81636f0ca204c8f152c0df0fe59a336815"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarTarefaCriadorJourneyType = typeof cancelarTarefaCriadorJourney;

export default cancelarTarefaCriadorJourney;
