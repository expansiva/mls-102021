/// <mls fileReference="_102047_/l4/tarefas/journeys/editarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const editarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "editarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Editar tarefa",
    "goal": "Atualizar os campos e a checklist de uma tarefa visível sem mudar sua situação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTarefa",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar a tarefa",
        "description": "Encontra a tarefa entre as que pode ver."
      },
      {
        "stepId": "alterarCampos",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Editar os campos",
        "description": "Altera título, descrição, prioridade, prazo, etiquetas ou anexos; a situação não muda."
      },
      {
        "stepId": "ajustarChecklist",
        "kind": "act",
        "entity": "ItemChecklist",
        "effect": "update",
        "title": "Ajustar a checklist",
        "description": "Altera ou marca itens da checklist da tarefa sem mudar a situação."
      }
    ],
    "outcome": {
      "statement": "Os campos da tarefa foram atualizados e a situação permaneceu a mesma.",
      "evidence": [
        "Novos valores visíveis na tarefa",
        "Situação inalterada"
      ]
    }
  },
  "businessHash": "sha256:268e7bc4350a4c241efcf00d3ec4ad17bc447d538d98c57e0326122f7cdcd84b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type EditarTarefaJourneyType = typeof editarTarefaJourney;

export default editarTarefaJourney;
