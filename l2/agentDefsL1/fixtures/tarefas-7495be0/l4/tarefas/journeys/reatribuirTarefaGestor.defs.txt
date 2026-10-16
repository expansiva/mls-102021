/// <mls fileReference="_102047_/l4/tarefas/journeys/reatribuirTarefaGestor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reatribuirTarefaGestorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reatribuirTarefaGestor",
  "business": {
    "actorRef": "gestor",
    "title": "Reatribuir tarefa",
    "goal": "Trocar o responsável de qualquer tarefa da equipe.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarTarefaEquipe",
        "kind": "locate",
        "entity": "Tarefa",
        "title": "Localizar a tarefa",
        "description": "Encontra a tarefa entre todas as da equipe."
      },
      {
        "stepId": "escolherResponsavelEquipe",
        "kind": "locate",
        "entity": "MembroEquipe",
        "title": "Escolher novo responsável",
        "description": "Escolhe na equipe a pessoa que passará a ser responsável."
      },
      {
        "stepId": "reatribuir",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "update",
        "title": "Trocar o responsável",
        "description": "Grava o novo responsável; quem age agora muda para ele."
      },
      {
        "stepId": "avisarNovoResponsavelGestor",
        "kind": "handoff",
        "entity": "Tarefa",
        "title": "Avisar novo responsável",
        "description": "O novo responsável é avisado de que recebeu a tarefa.",
        "handoffTo": "membroEquipe"
      }
    ],
    "outcome": {
      "statement": "A tarefa tem novo responsável, que foi avisado.",
      "evidence": [
        "Novo responsável exibido na tarefa",
        "Aviso recebido pelo novo responsável"
      ]
    }
  },
  "businessHash": "sha256:1633659aba2894911a7f9a37fdea756f58b423837ca131f29f0181953eaa8736"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReatribuirTarefaGestorJourneyType = typeof reatribuirTarefaGestorJourney;

export default reatribuirTarefaGestorJourney;
