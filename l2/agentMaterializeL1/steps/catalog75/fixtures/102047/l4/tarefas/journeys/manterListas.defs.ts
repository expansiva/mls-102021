/// <mls fileReference="_102047_/l4/tarefas/journeys/manterListas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manterListasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "manterListas",
  "business": {
    "actorRef": "gestor",
    "title": "Manter listas de tarefas",
    "goal": "Cadastrar e ajustar as listas que agrupam tarefas por projeto ou área.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarLista",
        "kind": "locate",
        "entity": "ListaTarefas",
        "title": "Ver listas",
        "description": "O gestor abre as listas existentes, com lista vazia e erro mostrados separadamente."
      },
      {
        "stepId": "criarLista",
        "kind": "act",
        "entity": "ListaTarefas",
        "effect": "create",
        "title": "Criar lista",
        "description": "O gestor cria uma nova lista informando seu nome."
      },
      {
        "stepId": "editarLista",
        "kind": "act",
        "entity": "ListaTarefas",
        "effect": "update",
        "title": "Editar lista",
        "description": "O gestor altera os dados de uma lista existente."
      }
    ],
    "outcome": {
      "statement": "As listas estão disponíveis para agrupar as tarefas.",
      "evidence": [
        "A lista aparece na escolha de lista ao criar uma tarefa"
      ]
    }
  },
  "businessHash": "sha256:1124a07b484bb371ce9c91e045b35452806d5b8c2eaf813a45fe54a91699a38b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ManterListasJourneyType = typeof manterListasJourney;

export default manterListasJourney;
