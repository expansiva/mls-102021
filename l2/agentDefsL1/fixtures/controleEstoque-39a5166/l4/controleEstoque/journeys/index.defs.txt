/// <mls fileReference="_102047_/l4/controleEstoque/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "controleEstoque",
  "journeys": [
    {
      "journeyId": "cadastrarProduto",
      "actorRef": "estoquista",
      "title": "Cadastrar produto de estoque"
    },
    {
      "journeyId": "registrarMovimentacaoEstoque",
      "actorRef": "estoquista",
      "title": "Registrar movimentação de estoque"
    },
    {
      "journeyId": "acompanharSaldos",
      "actorRef": "estoquista",
      "title": "Acompanhar saldos do estoque"
    },
    {
      "journeyId": "tratarAvisoSaldoBaixo",
      "actorRef": "estoquista",
      "title": "Verificar aviso de saldo baixo"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type ControleEstoqueJourneyIndexType = typeof controleEstoqueJourneyIndex;

export default controleEstoqueJourneyIndex;
