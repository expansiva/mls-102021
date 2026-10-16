/// <mls fileReference="_102047_/l4/tarefas/journeys/retomarTarefaDevolvida.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const retomarTarefaDevolvidaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "retomarTarefaDevolvida",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Retomar tarefa devolvida",
    "goal": "Ajustar a tarefa devolvida e reenviá-la para revisão.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirDevolvida",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir tarefa devolvida",
        "description": "O responsável abre a tarefa devolvida pelo aviso."
      },
      {
        "stepId": "lerMotivo",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ler o motivo",
        "description": "Lê o motivo da devolução e a discussão na sala da tarefa."
      },
      {
        "stepId": "ajustarCampos",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Ajustar a tarefa",
        "description": "Edita campos, checklist ou anexos sem mudar a situação."
      },
      {
        "stepId": "reenviarRevisao",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "enviarParaRevisao",
        "title": "Reenviar para revisão",
        "description": "Envia novamente para revisão e o criador é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa ajustada voltou para em revisão.",
      "evidence": [
        "Situação em revisão",
        "Criador recebeu novo aviso"
      ]
    }
  },
  "businessHash": "sha256:62c401bf8fc3af42456d57f921e1cb80253d1157e6b6caef97f13d8b648485bf"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RetomarTarefaDevolvidaJourneyType = typeof retomarTarefaDevolvidaJourney;

export default retomarTarefaDevolvidaJourney;
