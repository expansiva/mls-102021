/// <mls fileReference="_102047_/l4/compras/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "compras",
  "inbound": [
    {
      "id": "produtoCadastrado",
      "kind": "event",
      "from": "controleEstoque",
      "event": "produtoCadastrado",
      "writes": [
        "Produto"
      ],
      "effect": "create",
      "description": "Quando o controleEstoque cadastra um produto (Produto.create), o módulo compras cria ou atualiza o seu Produto com a mesma identificação, para que o comprador possa vinculá-lo a fornecedores e solicitações de compra.",
      "entityRefs": []
    }
  ],
  "outbound": [
    {
      "id": "recebimentoCompraRegistrado",
      "kind": "event",
      "to": "controleEstoque",
      "event": "recebimentoCompraRegistrado",
      "on": "Recebimento.create",
      "description": "Quando o almoxarife registra o recebimento (total ou parcial) de um pedido de compra, o registro do Recebimento é publicado para o controleEstoque dar entrada no estoque dos produtos e quantidades recebidos.",
      "entityRefs": [
        "Recebimento",
        "PedidoCompra",
        "Produto"
      ]
    },
    {
      "id": "pedidoCompraRecebido",
      "kind": "event",
      "to": "any",
      "event": "pedidoCompraRecebido",
      "on": "PedidoCompra.concluirRecebimento",
      "description": "Quando o pedido de compra é recebido por completo, o registro do PedidoCompra é publicado para módulos interessados (por exemplo, financeiro para o pagamento ao fornecedor).",
      "entityRefs": [
        "PedidoCompra",
        "Fornecedor"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ComprasIntegrationType = typeof comprasIntegration;

export default comprasIntegration;
