/// <mls fileReference="_102047_/l4/controleEstoque/journeys/cadastrarProduto.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarProdutoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarProduto",
  "business": {
    "actorRef": "estoquista",
    "title": "Cadastrar produto de estoque",
    "goal": "Cadastrar um produto e definir a quantidade mínima para acompanhamento do estoque.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarProduto",
        "kind": "act",
        "entity": "Produto",
        "effect": "create",
        "title": "Cadastrar produto",
        "description": "Registra o produto no estoque com sua quantidade mínima para permitir o acompanhamento do saldo."
      }
    ],
    "outcome": {
      "statement": "O produto fica disponível para registrar entradas e saídas e para monitorar o saldo mínimo.",
      "evidence": [
        "Produto cadastrado com quantidade mínima definida."
      ]
    }
  },
  "businessHash": "sha256:24b2a9cdf5d9b30171dbee711d8f47c9bccfc925fe881d4d7740ea00ceaf5563"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarProdutoJourneyType = typeof cadastrarProdutoJourney;

export default cadastrarProdutoJourney;
