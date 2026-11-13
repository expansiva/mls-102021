/// <mls fileReference="_102047_/l2/compras/web/shared/pedidos.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "numero": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "name": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "status": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "emitidoDe": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "emitidoAte": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "atrasado": {
        "type": "boolean",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pesquisaPedidos",
        "persist": true,
        "required": false
      },
      "pedidoCompraId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:detalhePedido",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "pesquisarPedidos": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "pedidos"
      ]
    },
    "abrirPedido": {
      "kind": "qry",
      "trigger": "abrirPedido",
      "returns": [
        "pedido"
      ]
    },
    "registrarRecebimento": {
      "kind": "cmd",
      "trigger": "registrarRecebimento",
      "returns": [
        "pedido",
        "linha"
      ],
      "writes": "Recebimento.create"
    }
  },
  "states": {
    "pedidos": {
      "source": "pesquisarPedidos.pedidos",
      "description": "the list of Pedido de compra resumido: número, emissão, situação, fornecedor, produto, valor total, atraso e saldo a receber.",
      "organisms": [
        "pesquisaPedidos"
      ]
    },
    "pedido": {
      "source": "abrirPedido.pedido",
      "description": "Pedido de compra completo com fornecedor, produto, quantidades, preço, saldo, origem na solicitação, último lembrete e os recebimentos registrados.",
      "organisms": [
        "detalhePedido",
        "historicoPedido"
      ]
    },
    "selectedPedidoCompra": {
      "source": "entry.params.pedidoCompraId",
      "description": "the id of the PedidoCompra selected in pesquisaPedidos",
      "organisms": [
        "detalhePedido",
        "pesquisaPedidos"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharPainel/verPainel",
      "organisms": [],
      "continuesIn": "painel_compras"
    },
    {
      "step": "acompanharPainel/abrirAtrasados",
      "organisms": [
        "pesquisaPedidos"
      ]
    },
    {
      "step": "pesquisarCompras/filtrarSolicitacoes",
      "organisms": [],
      "continuesIn": "solicitacoes"
    },
    {
      "step": "pesquisarCompras/filtrarPedidos",
      "organisms": [
        "pesquisaPedidos"
      ]
    },
    {
      "step": "pesquisarCompras/verPedido",
      "organisms": [
        "detalhePedido",
        "historicoPedido"
      ]
    },
    {
      "step": "pesquisarComprasGerente/filtrarSolicitacoesGerente",
      "organisms": [],
      "continuesIn": "solicitacoes"
    },
    {
      "step": "pesquisarComprasGerente/filtrarPedidosGerente",
      "organisms": [
        "pesquisaPedidos"
      ]
    },
    {
      "step": "pesquisarComprasGerente/verPedidoGerente",
      "organisms": [
        "detalhePedido",
        "historicoPedido"
      ]
    },
    {
      "step": "registrarRecebimento/abrirLembrete",
      "organisms": [
        "detalhePedido"
      ]
    },
    {
      "step": "registrarRecebimento/conferirPedido",
      "organisms": [
        "detalhePedido",
        "historicoPedido"
      ]
    },
    {
      "step": "registrarRecebimento/lancarRecebimento",
      "organisms": [
        "detalhePedido"
      ]
    }
  ],
  "rules": [
    "lembreteEntregaEAtraso",
    "pedidoAtrasadoAposDataPrevista",
    "quantidadeRecebidaPositiva",
    "recebimentoAtualizaSituacaoPedido",
    "recebimentoDaEntradaEstoque",
    "recebimentoNaoExcedePedido",
    "recebimentoNaoExcedeSaldo",
    "recebimentoSomentePedidoEmAberto"
  ],
  "access": {
    "actors": [
      "almoxarife",
      "comprador",
      "gerenteCompras"
    ],
    "grants": [
      "compradorCadastros",
      "compradorSolicitacoesPedidos",
      "gerenteCadastrosConsulta",
      "gerenteSolicitacoesPedidos",
      "almoxarifeRecebimento",
      "almoxarifeFornecedorProduto"
    ]
  }
} as const;
