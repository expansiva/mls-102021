/// <mls fileReference="_102047_/l4/tarefas/journeys/reatribuirTarefaCriador.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reatribuirTarefaCriadorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reatribuirTarefaCriador",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Reatribuir tarefa criada",
    "goal": "Trocar o responsável de uma tarefa que o membro criou.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarParaReatribuir",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar tarefa criada",
        "description": "Encontra a tarefa entre as que criou."
      },
      {
        "stepId": "escolherNovoResponsavel",
        "kind": "locate",
        "entity": "MembroEquipe",
        "title": "Escolher novo responsável",
        "description": "Escolhe na equipe a pessoa que passará a ser responsável."
      },
      {
        "stepId": "trocarResponsavel",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Trocar o responsável",
        "description": "Grava o novo responsável; quem age agora passa a ser o novo responsável."
      },
      {
        "stepId": "avisarNovoResponsavel",
        "kind": "handoff",
        "entity": "Tarefa",
        "title": "Avisar novo responsável",
        "description": "O novo responsável é avisado de que recebeu a tarefa.",
        "handoffTo": "membroEquipe"
      }
    ],
    "outcome": {
      "statement": "A tarefa tem um novo responsável, que foi avisado.",
      "evidence": [
        "Novo responsável exibido na tarefa",
        "Novo responsável recebeu o aviso"
      ]
    }
  },
  "businessHash": "sha256:8ac166537471b04aea5d7a092e751ee7bcb31113ba8e768524edeb84ba4c9f68"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReatribuirTarefaCriadorJourneyType = typeof reatribuirTarefaCriadorJourney;

export default reatribuirTarefaCriadorJourney;
