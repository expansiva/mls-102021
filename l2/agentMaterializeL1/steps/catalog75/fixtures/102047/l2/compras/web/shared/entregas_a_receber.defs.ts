/// <mls fileReference="_102047_/l2/compras/web/shared/entregas_a_receber.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "pedidoCompraId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:registroRecebimento",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "getEntregasDoDia": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "resumo",
        "fila"
      ]
    },
    "buscarFilaEntregas": {
      "kind": "qry",
      "trigger": "buscarFilaEntregas",
      "returns": [
        "fila"
      ]
    },
    "getPedidoParaRecebimento": {
      "kind": "qry",
      "trigger": "getPedidoParaRecebimento",
      "returns": [
        "pedido",
        "recebimentos"
      ]
    },
    "registrarRecebimento": {
      "kind": "cmd",
      "trigger": "registrarRecebimento",
      "returns": [
        "recebimento",
        "pedido"
      ],
      "writes": "Recebimento.create"
    }
  },
  "states": {
    "resumo": {
      "source": "getEntregasDoDia.resumo",
      "description": "Indicadores do dia sobre os pedidos ainda não totalmente recebidos: entregas previstas para hoje, pedidos atrasados e saldo total a receber.",
      "organisms": [
        "resumoEntregas"
      ]
    },
    "fila": {
      "source": "getEntregasDoDia.fila",
      "description": "the list of Pedido de compra em aberto ou parcialmente recebido, com fornecedor, produto, data prevista, quantidades e indicação de atraso ou entrega prevista para hoje.",
      "organisms": [
        "filaEntregas"
      ]
    },
    "pedido": {
      "source": "getPedidoParaRecebimento.pedido",
      "description": "Pedido de compra com os dados de conferência do recebimento: fornecedor, produto, unidade, quantidades pedida, recebida e saldo, datas de emissão, previsão e último lembrete.",
      "organisms": [
        "historicoPedido",
        "registroRecebimento"
      ]
    },
    "recebimento": {
      "source": "registrarRecebimento.recebimento",
      "description": "Recebimento lançado para um pedido de compra, com data, quantidade, observação, indicação se completou o pedido e saldo pendente.",
      "organisms": [
        "registroRecebimento"
      ]
    },
    "recebimentos": {
      "source": "getPedidoParaRecebimento.recebimentos",
      "description": "the list of Recebimento lançado para um pedido de compra, com data, quantidade, observação, indicação se completou o pedido e saldo pendente.",
      "organisms": [
        "historicoPedido"
      ]
    },
    "selectedPedidoCompra": {
      "source": "entry.params.pedidoCompraId",
      "description": "the id of the PedidoCompra selected in registroRecebimento",
      "organisms": [
        "filaEntregas",
        "historicoPedido",
        "registroRecebimento"
      ]
    }
  },
  "journeys": [
    {
      "step": "registrarRecebimento/abrirLembrete",
      "organisms": [
        "resumoEntregas",
        "filaEntregas"
      ]
    },
    {
      "step": "registrarRecebimento/conferirPedido",
      "organisms": [
        "registroRecebimento",
        "historicoPedido"
      ]
    },
    {
      "step": "registrarRecebimento/lancarRecebimento",
      "organisms": [
        "registroRecebimento",
        "historicoPedido"
      ]
    }
  ],
  "rules": [
    "lembreteEntregaEAtraso",
    "quantidadeRecebidaPositiva",
    "recebimentoAtualizaSituacaoPedido",
    "recebimentoDaEntradaEstoque",
    "recebimentoNaoExcedePedido",
    "recebimentoNaoExcedeSaldo",
    "recebimentoSomentePedidoEmAberto"
  ],
  "access": {
    "actors": [
      "almoxarife"
    ],
    "grants": [
      "almoxarifeRecebimento",
      "almoxarifeFornecedorProduto"
    ]
  }
} as const;
