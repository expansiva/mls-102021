/// <mls fileReference="_102047_/l4/tarefas/journeys/retomarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const retomarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "retomarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Retomar tarefa devolvida",
    "goal": "Retomar a tarefa devolvida, corrigir e enviar novamente para revisão.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "lerMotivo",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ler motivo da devolução",
        "description": "O responsável abre a tarefa direto do aviso de devolução e lê o motivo informado por quem criou."
      },
      {
        "stepId": "retomar",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "retomar",
        "title": "Retomar tarefa",
        "description": "O responsável retoma a tarefa para continuar o trabalho."
      },
      {
        "stepId": "reenviarRevisao",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "enviarParaRevisao",
        "title": "Reenviar para revisão",
        "description": "O responsável envia novamente para revisão e quem criou é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa corrigida voltou para revisão.",
      "evidence": [
        "A situação mostra em revisão",
        "Quem criou recebe novo aviso"
      ]
    }
  },
  "businessHash": "sha256:9d3e4ded2b1a30e36cb4fa721fcb039837ec5c6c104d17ac37f6359bd723b6fc"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RetomarTarefaJourneyType = typeof retomarTarefaJourney;

export default retomarTarefaJourney;
