/// <mls fileReference="_102047_/l4/tarefas/journeys/revisarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const revisarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "revisarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Revisar tarefa",
    "goal": "Aceitar ou devolver com motivo uma tarefa que criou e que está em revisão.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirRevisao",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir tarefa em revisão",
        "description": "Quem criou abre a tarefa a partir do aviso ou do que depende dele agora."
      },
      {
        "stepId": "conferirTarefa",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Conferir entrega",
        "description": "Quem criou confere checklist, campos e a conversa da tarefa."
      },
      {
        "stepId": "decidirRevisao",
        "kind": "decide",
        "entity": "Tarefa",
        "title": "Aceitar ou devolver",
        "description": "Quem criou decide se aceita a entrega ou devolve ao responsável."
      },
      {
        "stepId": "aceitarTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "aceitar",
        "title": "Aceitar tarefa",
        "description": "Quem criou aceita e a tarefa fica concluída."
      },
      {
        "stepId": "devolverTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "devolver",
        "title": "Devolver com motivo",
        "description": "Quem criou informa o motivo e a tarefa volta a em andamento; o responsável é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa foi concluída ou voltou ao responsável com o motivo.",
      "evidence": [
        "A situação mostra concluída, ou em andamento com o motivo da devolução visível",
        "O responsável é avisado quando a tarefa é devolvida"
      ]
    }
  },
  "businessHash": "sha256:525054bd6bb269f66350e139f533fc0c9e0c146cbec9c4d3e679ac13b9254afe"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RevisarTarefaJourneyType = typeof revisarTarefaJourney;

export default revisarTarefaJourney;
