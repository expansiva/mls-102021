/// <mls fileReference="_102047_/l4/controleEstoque/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "controleEstoque",
  "inbound": [
    {
      "id": "recebimentoRegistrado",
      "kind": "event",
      "from": "compras",
      "event": "recebimentoRegistrado",
      "writes": [
        "MovimentacaoEstoque"
      ],
      "effect": "create",
      "description": "Recebe o recebimento registrado em Compras e cria a movimentação de entrada correspondente no estoque.",
      "entityRefs": []
    }
  ],
  "outbound": [],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ControleEstoqueIntegrationType = typeof controleEstoqueIntegration;

export default controleEstoqueIntegration;
