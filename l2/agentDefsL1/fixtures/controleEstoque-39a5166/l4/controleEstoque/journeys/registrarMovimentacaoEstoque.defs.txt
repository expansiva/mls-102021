/// <mls fileReference="_102047_/l4/controleEstoque/journeys/registrarMovimentacaoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarMovimentacaoEstoqueJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarMovimentacaoEstoque",
  "business": {
    "actorRef": "estoquista",
    "title": "Registrar movimentação de estoque",
    "goal": "Registrar uma entrada ou saída de unidades de um produto para atualizar seu saldo.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarProduto",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produto",
        "description": "Localiza o produto que receberá uma entrada ou terá unidades retiradas do estoque."
      },
      {
        "stepId": "consultarSaldo",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar saldo atual",
        "description": "Confere o saldo atual e a quantidade mínima definida para o produto."
      },
      {
        "stepId": "registrarMovimentacao",
        "kind": "act",
        "entity": "MovimentacaoEstoque",
        "effect": "create",
        "title": "Registrar movimentação",
        "description": "Registra a entrada ou saída e atualiza o saldo do produto; a movimentação permanece inalterável após o registro."
      }
    ],
    "outcome": {
      "statement": "A entrada ou saída fica registrada e o saldo atual do produto é atualizado.",
      "evidence": [
        "Movimentação de estoque registrada com o tipo de entrada ou saída.",
        "Saldo atual do produto exibido."
      ]
    }
  },
  "businessHash": "sha256:b7f0e96ea364fe3f3df1763faa602b2ae37dc590e079131744ca93e3da4446e4"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarMovimentacaoEstoqueJourneyType = typeof registrarMovimentacaoEstoqueJourney;

export default registrarMovimentacaoEstoqueJourney;
