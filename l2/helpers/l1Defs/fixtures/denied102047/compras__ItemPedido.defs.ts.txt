/// <mls fileReference="_102047_/l4/compras/ontology/ItemPedido.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityItemPedido = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "ItemPedido",
  "title": "Item do pedido",
  "description": "Produto do pedido de compra com quantidade e preço; a quantidade já recebida é derivada dos recebimentos.",
  "displayField": "produtoId",
  "relationships": {
    "pedidoCompra": {
      "relationshipId": "itemPedidoPedido",
      "to": "PedidoCompra",
      "via": "ItemPedido.pedidoCompraId",
      "cardinality": "N:1",
      "title": "Pedido de compra",
      "description": "Cada item pertence a um pedido de compra, que tem um ou mais itens.",
      "mode": "fk",
      "required": true
    },
    "produto": {
      "relationshipId": "itemPedidoProduto",
      "to": "Produto",
      "via": "ItemPedido.produtoId",
      "cardinality": "N:1",
      "title": "Produto",
      "description": "Cada item do pedido é de um produto.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um item do pedido pelo id, usado na tela do pedido e ao registrar o recebimento.",
    "listByForeignKey": "Lista os itens de um pedido de compra (ou de vários pedidos de uma vez) por pedidoCompraId, para o comprador revisar o pedido, o gerente decidir a aprovação e o almoxarife conferir o recebimento.",
    "locate.byColumn": "Lista itens filtrados por produto (produtoId), para o comprador ver o histórico de compras de um produto.",
    "count": "Conta os itens de um pedido, exibido no cabeçalho do pedido e usado para impedir o envio de pedido sem itens.",
    "create": "O comprador inclui um produto no pedido em rascunho com quantidade e preço, sugerido pelo preço combinado com o fornecedor.",
    "update": "O comprador altera quantidade, preço ou observação do item enquanto o pedido está em rascunho.",
    "delete": "O comprador remove um item do pedido enquanto o pedido está em rascunho.",
    "uniqueKey": "O motor recusa o mesmo produto duas vezes no mesmo pedido (pedidoCompraId + produtoId); a quantidade é ajustada no item existente.",
    "transaction": "Grava os itens junto com o pedido e o valor total em uma única operação, tudo ou nada.",
    "read.mdmRecord": "Lê no cadastro mestre o nome, SKU e unidade de medida do produto de cada item para exibir no pedido e no recebimento.",
    "comment": "O comprador ou o almoxarife deixa uma nota sobre o item, como divergência de especificação na entrega."
  },
  "rules": [
    "itemSomenteEmRascunho",
    "produtoUnicoPorPedido",
    "quantidadePositiva",
    "produtoDeveSerFornecidoPeloFornecedor",
    "recebimentoNaoExcedePedido"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_itempedido",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "pedidoCompraId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "PedidoCompra"
        ],
        "title": "Pedido de compra",
        "description": "Pedido de compra ao qual este item pertence."
      },
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto comprado neste item; nome, SKU e unidade vêm do cadastro mestre do produto."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do item",
        "description": "Quantidade, preço e observações do item do pedido.",
        "fields": {
          "quantidade": {
            "type": "number",
            "required": true,
            "title": "Quantidade",
            "description": "Quantidade do produto pedida ao fornecedor, na unidade de medida do produto.",
            "min": 0.0001
          },
          "precoUnitario": {
            "type": "money",
            "required": true,
            "title": "Preço unitário",
            "description": "Preço por unidade acertado neste pedido; sugerido a partir do preço combinado com o fornecedor para o produto, podendo ser ajustado pelo comprador.",
            "min": 0
          },
          "precoCombinadoReferencia": {
            "type": "money",
            "title": "Preço combinado de referência",
            "description": "Preço combinado com o fornecedor vigente no momento em que o item foi incluído, guardado para comparar com o preço praticado no pedido.",
            "min": 0
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Instruções ou especificações do item para o fornecedor.",
            "maxLength": 1000
          },
          "valorTotalItem": {
            "type": "money",
            "derived": true,
            "title": "Valor total do item",
            "description": "Quantidade pedida multiplicada pelo preço unitário do item."
          },
          "quantidadeRecebida": {
            "type": "number",
            "derived": true,
            "title": "Quantidade recebida",
            "description": "Soma das quantidades deste item registradas nos recebimentos do pedido pelo almoxarife."
          },
          "saldoAReceber": {
            "type": "number",
            "derived": true,
            "title": "Saldo a receber",
            "description": "Quantidade pedida menos a quantidade já recebida deste item, nunca menor que zero."
          },
          "totalmenteRecebido": {
            "type": "boolean",
            "derived": true,
            "title": "Totalmente recebido",
            "description": "Verdadeiro quando a quantidade já recebida nos recebimentos alcança a quantidade pedida do item."
          },
          "precoDivergeDoCombinado": {
            "type": "boolean",
            "derived": true,
            "title": "Preço diverge do combinado",
            "description": "Verdadeiro quando o preço unitário do item é diferente do preço combinado com o fornecedor para este produto."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "pedidoCompraId",
      "produtoId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityItemPedidoType = typeof comprasEntityItemPedido;

export default comprasEntityItemPedido;
