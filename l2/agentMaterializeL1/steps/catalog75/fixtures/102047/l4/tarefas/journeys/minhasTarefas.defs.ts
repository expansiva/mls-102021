/// <mls fileReference="_102047_/l4/tarefas/journeys/minhasTarefas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const minhasTarefasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "minhasTarefas",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Ver minhas tarefas",
    "goal": "Ver as tarefas de que é responsável, as que criou e o que depende dele agora.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarMinhas",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Minhas tarefas",
        "description": "O membro vê suas tarefas separadas em responsável, criadas e o que depende de mim agora, com lista vazia e erro mostrados separadamente."
      },
      {
        "stepId": "verDetalhe",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver detalhe",
        "description": "O membro abre uma tarefa e vê campos, subtarefas, checklist e acesso à conversa da tarefa."
      }
    ],
    "outcome": {
      "statement": "O membro sabe o que tem a fazer e o que aguarda sua ação.",
      "evidence": [
        "As tarefas aparecem agrupadas por responsável, criadas e depende de mim agora"
      ]
    }
  },
  "businessHash": "sha256:26f27a78f883bb10a966e8639e7789a4ba0196bf540f28baf6d3558eeac2da98"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type MinhasTarefasJourneyType = typeof minhasTarefasJourney;

export default minhasTarefasJourney;
