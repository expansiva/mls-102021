/// <mls fileReference="_102047_/l4/tarefas/journeys/executarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const executarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "executarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Executar tarefa atribuída",
    "goal": "Iniciar a tarefa atribuída e enviá-la para revisão do criador.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirMinhaTarefa",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir minha tarefa",
        "description": "O responsável abre a tarefa pelo aviso ou entre as tarefas atribuídas a ele."
      },
      {
        "stepId": "verTarefa",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver detalhes da tarefa",
        "description": "Consulta descrição, prazo, checklist, anexos e a discussão da tarefa."
      },
      {
        "stepId": "iniciarTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "iniciar",
        "title": "Iniciar a tarefa",
        "description": "Passa a tarefa de a fazer para em andamento; a sala de discussão recebe a mensagem da mudança."
      },
      {
        "stepId": "marcarChecklist",
        "kind": "act",
        "entity": "ItemChecklist",
        "effect": "update",
        "title": "Marcar itens da checklist",
        "description": "Marca como feitos os itens da checklist à medida que avança."
      },
      {
        "stepId": "enviarRevisao",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "enviarParaRevisao",
        "title": "Enviar para revisão",
        "description": "Passa a tarefa para em revisão; a sala recebe a mensagem e o criador passa a ser quem age agora."
      },
      {
        "stepId": "passarCriador",
        "kind": "handoff",
        "entity": "Tarefa",
        "title": "Avisar o criador",
        "description": "O criador da tarefa é avisado para revisá-la.",
        "handoffTo": "membroEquipe"
      }
    ],
    "outcome": {
      "statement": "A tarefa está em revisão e o criador foi avisado.",
      "evidence": [
        "Situação da tarefa em revisão",
        "Mensagem da mudança na sala de discussão",
        "Criador recebeu o aviso de revisão"
      ]
    }
  },
  "businessHash": "sha256:83c53f576e34e235ae60707f2b27873c1e773dce88a5b31b429c1142e033f996"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ExecutarTarefaJourneyType = typeof executarTarefaJourney;

export default executarTarefaJourney;
