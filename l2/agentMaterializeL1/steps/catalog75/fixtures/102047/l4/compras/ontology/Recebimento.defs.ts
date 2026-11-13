/// <mls fileReference="_102047_/l4/compras/ontology/Recebimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityRecebimento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Recebimento",
  "title": "Recebimento",
  "description": "Registro da chegada total ou parcial de um pedido pelo almoxarife, que dá entrada no estoque dos produtos recebidos.",
  "displayField": "dataRecebimento",
  "relationships": {
    "pedidoCompra": {
      "relationshipId": "recebimentoPedido",
      "to": "PedidoCompra",
      "via": "Recebimento.pedidoCompraId",
      "cardinality": "N:1",
      "title": "Pedido recebido",
      "description": "O recebimento registra a chegada de um pedido, total ou parcial; um pedido pode ter vários recebimentos parciais.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Grava o novo recebimento com a quantidade recebida; usado pelo almoxarife ao lançar o recebimento a partir do pedido.",
    "transaction": "Grava o recebimento, atualiza a situação do pedido e dá entrada no estoque numa única operação, tudo ou nada; executado no lançamento do almoxarife.",
    "read.byId": "Lê um recebimento pelo id para exibir seus dados na tela do pedido; usado pelo almoxarife, comprador e gerente.",
    "listByForeignKey": "Lista os recebimentos de um pedido pela coluna pedidoCompraId, para o almoxarife conferir a quantidade já recebida antes de lançar uma nova entrega.",
    "locate.byColumn": "Lista recebimentos filtrados por pedido e período da data de recebimento, ordenados pela data; usado por comprador e gerente nas pesquisas.",
    "count": "Conta os recebimentos de um pedido ou de um período para exibir totais nas listas.",
    "read.mdmRecord": "Lê o produto e o fornecedor do pedido recebido no MDM para mostrar nome e dados na conferência do almoxarife.",
    "attach.document": "Anexa a nota fiscal ou a foto da mercadoria recebida ao recebimento; usado pelo almoxarife.",
    "comment": "Registra notas sobre o recebimento, como divergências, para comprador e gerente acompanharem.",
    "compras.darEntradaEstoque": "Dá entrada no estoque da quantidade recebida do produto do pedido, disparado ao gravar o recebimento."
  },
  "rules": [
    "recebimentoSomentePedidoEmAberto",
    "quantidadeRecebidaPositiva",
    "recebimentoNaoExcedeSaldo",
    "recebimentoAtualizaSituacaoPedido",
    "recebimentoDaEntradaEstoque"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_recebimento",
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
        "description": "Pedido cuja chegada, total ou parcial, este recebimento registra."
      },
      "dataRecebimento": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Data do recebimento",
        "description": "Momento em que o almoxarife registrou a chegada da mercadoria; usado para ordenar e filtrar recebimentos por período."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do recebimento que não são filtrados.",
        "fields": {
          "quantidadeRecebida": {
            "type": "number",
            "required": true,
            "title": "Quantidade recebida",
            "description": "Quantidade do produto do pedido que chegou nesta entrega e que dá entrada no estoque.",
            "min": 0
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Anotação do almoxarife sobre a entrega, como avarias ou divergências encontradas na conferência.",
            "maxLength": 2000
          },
          "recebimentoTotal": {
            "type": "boolean",
            "derived": true,
            "title": "Recebimento completa o pedido",
            "description": "Verdadeiro quando a soma das quantidades recebidas do pedido, contando este recebimento, alcança a quantidade pedida; caso contrário o recebimento é parcial."
          },
          "saldoPendente": {
            "type": "number",
            "derived": true,
            "title": "Saldo pendente do pedido",
            "description": "Quantidade pedida menos a soma de todos os recebimentos já registrados para o mesmo pedido."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityRecebimentoType = typeof comprasEntityRecebimento;

export default comprasEntityRecebimento;
