/// <mls fileReference="_102047_/l4/tarefas/journeys/manterListas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manterListasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "manterListas",
  "business": {
    "actorRef": "gestor",
    "title": "Manter listas",
    "goal": "Cadastrar e atualizar as listas que agrupam tarefas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "verListas",
        "kind": "locate",
        "entity": "Lista",
        "title": "Ver as listas",
        "description": "O gestor vê as listas existentes por projeto ou área."
      },
      {
        "stepId": "criarLista",
        "kind": "act",
        "entity": "Lista",
        "effect": "create",
        "title": "Criar lista",
        "description": "Cadastra uma nova lista para um projeto ou área."
      },
      {
        "stepId": "editarLista",
        "kind": "act",
        "entity": "Lista",
        "effect": "update",
        "title": "Editar lista",
        "description": "Altera os dados de uma lista existente."
      }
    ],
    "outcome": {
      "statement": "As listas estão cadastradas e atualizadas.",
      "evidence": [
        "Lista nova ou alterada aparece no cadastro",
        "Lista disponível ao criar tarefas"
      ]
    }
  },
  "businessHash": "sha256:d0b2ac7ae87bd22ebc6f4098ae2e4236426bc02d96ef624197a2c945bb0866be"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ManterListasJourneyType = typeof manterListasJourney;

export default manterListasJourney;
