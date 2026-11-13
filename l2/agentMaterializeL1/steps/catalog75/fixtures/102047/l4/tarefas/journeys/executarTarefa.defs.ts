/// <mls fileReference="_102047_/l4/tarefas/journeys/executarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const executarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "executarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Executar tarefa e enviar para revisão",
    "goal": "Iniciar a tarefa de que é responsável e enviá-la para revisão de quem criou.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirTarefa",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Abrir tarefa avisada",
        "description": "O responsável abre a tarefa a partir do aviso ou das suas tarefas."
      },
      {
        "stepId": "verTarefa",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver detalhes da tarefa",
        "description": "O responsável lê descrição, prazo, checklist e a conversa da tarefa."
      },
      {
        "stepId": "iniciarTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "iniciar",
        "title": "Iniciar tarefa",
        "description": "O responsável passa a tarefa de a fazer para em andamento."
      },
      {
        "stepId": "marcarItem",
        "kind": "act",
        "entity": "ItemChecklist",
        "effect": "update",
        "title": "Marcar item da checklist",
        "description": "O responsável marca os itens concluídos da checklist."
      },
      {
        "stepId": "enviarRevisao",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "transition",
        "transitionRef": "enviarParaRevisao",
        "title": "Enviar para revisão",
        "description": "O responsável envia a tarefa para revisão e quem criou passa a ser quem age agora e é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa está em revisão aguardando quem criou.",
      "evidence": [
        "A situação da tarefa mostra em revisão",
        "Quem criou recebe o aviso e vê a tarefa no que depende dele agora"
      ]
    }
  },
  "businessHash": "sha256:bf9a413baf95b6d695a9f2b0b07f1841cf44081103c9e2f7f60f9a6f72019462"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ExecutarTarefaJourneyType = typeof executarTarefaJourney;

export default executarTarefaJourney;
