/// <mls fileReference="_102047_/l2/compras/web/shared/painel_compras.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "opcaoEscolhidaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:solicitacoesAguardandoDecisao",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "carregarPainel": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "resumo",
        "solicitacoes",
        "pedidosAtrasados"
      ]
    },
    "listarPedidosAtrasados": {
      "kind": "qry",
      "trigger": "listarPedidosAtrasados",
      "returns": [
        "pedidos"
      ]
    },
    "autorizarSolicitacao": {
      "kind": "cmd",
      "trigger": "autorizarSolicitacao",
      "returns": [
        "solicitacao"
      ],
      "writes": "SolicitacaoCompra.autorizar"
    },
    "rejeitarSolicitacao": {
      "kind": "cmd",
      "trigger": "rejeitarSolicitacao",
      "returns": [
        "solicitacao"
      ],
      "writes": "SolicitacaoCompra.rejeitar"
    }
  },
  "states": {
    "resumo": {
      "source": "carregarPainel.resumo",
      "description": "Resumo do painel de compras de um mês: indicadores gerais da organização e total comprado por fornecedor.",
      "organisms": [
        "resumoCompras"
      ]
    },
    "solicitacoes": {
      "source": "carregarPainel.solicitacoes",
      "description": "the list of Solicitação de compra com produto, comprador, dados da necessidade, decisão do gerente e suas opções pesquisadas.",
      "organisms": [
        "solicitacoesAguardandoDecisao"
      ]
    },
    "pedidosAtrasados": {
      "source": "carregarPainel.pedidosAtrasados",
      "description": "the list of Pedido de compra não totalmente recebido cuja data prevista de entrega já passou, com fornecedor, produto, atraso e saldo a receber.",
      "organisms": [
        "pedidosAtrasados"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharPainel/verPainel",
      "organisms": [
        "resumoCompras"
      ]
    },
    {
      "step": "acompanharPainel/abrirAtrasados",
      "organisms": [
        "pedidosAtrasados"
      ]
    },
    {
      "step": "autorizarSolicitacao/localizarPendentes",
      "organisms": [
        "solicitacoesAguardandoDecisao"
      ]
    },
    {
      "step": "autorizarSolicitacao/analisarSolicitacao",
      "organisms": [
        "solicitacoesAguardandoDecisao"
      ]
    },
    {
      "step": "autorizarSolicitacao/autorizar",
      "organisms": [
        "solicitacoesAguardandoDecisao"
      ]
    },
    {
      "step": "autorizarSolicitacao/rejeitar",
      "organisms": [
        "solicitacoesAguardandoDecisao"
      ]
    }
  ],
  "rules": [
    "apenasGerenteDecide",
    "autorizacaoExigeOpcao",
    "maximoTresOpcoes",
    "numeroPedidoSequencial",
    "opcaoDaMesmaSolicitacao",
    "opcaoSomenteEstimativa",
    "pedidoAtrasadoAposDataPrevista",
    "pedidoSomenteDeSolicitacaoAutorizada",
    "pedidoUsaOpcaoEscolhida",
    "rejeicaoExigeMotivo",
    "solicitacaoAguardandoAutorizacao",
    "totalCompradoPorFornecedorNoMes",
    "umPedidoPorSolicitacao"
  ],
  "access": {
    "actors": [
      "gerenteCompras"
    ],
    "grants": [
      "gerenteCadastrosConsulta",
      "gerenteSolicitacoesPedidos",
      "gerenteCompradores",
      "gerentePainel"
    ]
  }
} as const;
