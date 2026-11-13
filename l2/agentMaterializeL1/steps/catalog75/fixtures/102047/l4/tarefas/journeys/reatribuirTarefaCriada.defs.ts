/// <mls fileReference="_102047_/l4/tarefas/journeys/reatribuirTarefaCriada.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reatribuirTarefaCriadaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reatribuirTarefaCriada",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Reatribuir tarefa que criei",
    "goal": "Trocar o responsável de uma tarefa que o membro criou.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarCriada",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa criada",
        "description": "O membro localiza a tarefa entre as que criou."
      },
      {
        "stepId": "verResponsavelCriada",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver responsável atual",
        "description": "O membro confere o responsável atual e a situação da tarefa antes de trocar."
      },
      {
        "stepId": "trocarResponsavelCriada",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Trocar responsável",
        "description": "O membro escolhe o novo responsável pelo nome entre quem aceita tarefas; o novo responsável passa a agir e é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa criada pelo membro tem novo responsável.",
      "evidence": [
        "O novo responsável aparece na tarefa e recebe o aviso"
      ]
    }
  },
  "businessHash": "sha256:465fe33ef09faeb731b30b39d6645bf9baa107e67822b8c3b056affa97d20360"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReatribuirTarefaCriadaJourneyType = typeof reatribuirTarefaCriadaJourney;

export default reatribuirTarefaCriadaJourney;
