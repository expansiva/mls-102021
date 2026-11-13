/// <mls fileReference="_102047_/l4/tarefas/journeys/reatribuirTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reatribuirTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reatribuirTarefa",
  "business": {
    "actorRef": "gestor",
    "title": "Reatribuir tarefa",
    "goal": "Trocar o responsável de uma tarefa.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTarefaReatribuir",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa",
        "description": "O gestor localiza a tarefa por lista, responsável ou situação."
      },
      {
        "stepId": "verResponsavelAtual",
        "kind": "inspect",
        "entity": "Tarefa",
        "title": "Ver responsável atual",
        "description": "O gestor confere o responsável atual, o prazo e a situação antes de trocar."
      },
      {
        "stepId": "trocarResponsavel",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Trocar responsável",
        "description": "O gestor escolhe o novo responsável pelo nome entre quem aceita tarefas; quem age agora passa a ser o novo responsável, que é avisado."
      }
    ],
    "outcome": {
      "statement": "A tarefa tem novo responsável, que passou a ser quem age agora.",
      "evidence": [
        "O novo responsável aparece na tarefa",
        "O novo responsável recebe o aviso"
      ]
    }
  },
  "businessHash": "sha256:327bac5a7da44364c000049b9b362b7124ccf575df1ad03852a67a389c347a87"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReatribuirTarefaJourneyType = typeof reatribuirTarefaJourney;

export default reatribuirTarefaJourney;
