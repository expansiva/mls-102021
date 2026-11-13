/// <mls fileReference="_102047_/l4/tarefas/journeys/editarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const editarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "editarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Editar campos da tarefa",
    "goal": "Ajustar campos de uma tarefa que vê sem mudar sua situação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTarefaEdicao",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa",
        "description": "O membro localiza a tarefa entre as que é responsável ou criou."
      },
      {
        "stepId": "alterarCampos",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Editar tarefa",
        "description": "O membro altera título, descrição, prioridade, prazo, lista ou etiquetas sem mudar a situação."
      },
      {
        "stepId": "ajustarChecklist",
        "kind": "act",
        "entity": "ItemChecklist",
        "effect": "update",
        "title": "Ajustar checklist",
        "description": "O membro edita ou marca itens da checklist."
      }
    ],
    "outcome": {
      "statement": "A tarefa tem os campos atualizados e mantém a mesma situação.",
      "evidence": [
        "Os novos valores aparecem no detalhe da tarefa",
        "A situação não mudou"
      ]
    }
  },
  "businessHash": "sha256:9448dda56a93a900b0dce6e4777a18d95cfecdfd0f6201db1b1611ffeffe52a1"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EditarTarefaJourneyType = typeof editarTarefaJourney;

export default editarTarefaJourney;
