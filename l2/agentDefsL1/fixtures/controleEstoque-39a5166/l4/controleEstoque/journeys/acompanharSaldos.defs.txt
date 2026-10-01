/// <mls fileReference="_102047_/l4/controleEstoque/journeys/acompanharSaldos.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharSaldosJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharSaldos",
  "business": {
    "actorRef": "estoquista",
    "title": "Acompanhar saldos do estoque",
    "goal": "Consultar os saldos atuais dos produtos e identificar itens abaixo da quantidade mínima.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarProdutos",
        "kind": "locate",
        "entity": "Produto",
        "title": "Localizar produtos",
        "description": "Localiza os produtos cadastrados para acompanhamento do estoque."
      },
      {
        "stepId": "consultarSaldos",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar saldos atuais",
        "description": "Consulta os saldos atuais, as quantidades mínimas e os avisos de produtos abaixo do mínimo."
      }
    ],
    "outcome": {
      "statement": "O estoquista identifica os produtos que exigem reposição por estarem abaixo da quantidade mínima.",
      "evidence": [
        "Saldo atual exibido para cada produto.",
        "Aviso exibido para produto com saldo abaixo do mínimo."
      ]
    }
  },
  "businessHash": "sha256:2e47a6d87a2619f21bdbb4539a1f2b08b83c3559019f1e195c2c62963e6c75a2"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharSaldosJourneyType = typeof acompanharSaldosJourney;

export default acompanharSaldosJourney;
