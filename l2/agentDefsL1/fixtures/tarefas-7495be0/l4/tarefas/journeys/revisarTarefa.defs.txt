/// <mls fileReference="_102047_/l4/tarefas/journeys/revisarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const revisarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "revisarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Revisar tarefa criada",
    "goal": "Aceitar a entrega ou devolvê-la para ajuste com o motivo.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirTarefaRevisao",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir tarefa em revisão",
        "description": "O criador abre a tarefa pelo aviso ou entre as que criou em revisão."
      },
      {
        "stepId": "conferirEntrega",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Conferir a entrega",
        "description": "Confere checklist, anexos e a discussão da tarefa."
      },
      {
        "stepId": "decidirRevisao",
        "kind": "decide",
        "entity": "Tarefa",
        "title": "Aceitar ou devolver",
        "description": "Decide se aceita a entrega ou devolve para ajuste."
      },
      {
        "stepId": "aceitarTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "aceitar",
        "title": "Aceitar a tarefa",
        "description": "Ao aceitar, a tarefa passa para concluída e a sala recebe a mensagem."
      },
      {
        "stepId": "devolverTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "devolver",
        "title": "Devolver com motivo",
        "description": "Ao devolver, informa o motivo e a tarefa volta para em andamento, com o responsável como quem age agora."
      },
      {
        "stepId": "avisarResponsavelAjuste",
        "kind": "handoff",
        "entity": "Tarefa",
        "title": "Avisar o responsável",
        "description": "Quando devolvida, o responsável é avisado de novo para retomar o trabalho.",
        "handoffTo": "membroEquipe"
      }
    ],
    "outcome": {
      "statement": "A tarefa foi concluída ou voltou para em andamento com o motivo registrado.",
      "evidence": [
        "Situação concluída ou em andamento",
        "Motivo da devolução visível na tarefa",
        "Mensagem da mudança na sala de discussão"
      ]
    }
  },
  "businessHash": "sha256:2e96c401845f09927042d2b3678925a824521511ac719c962d817965ca49dfe0"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RevisarTarefaJourneyType = typeof revisarTarefaJourney;

export default revisarTarefaJourney;
