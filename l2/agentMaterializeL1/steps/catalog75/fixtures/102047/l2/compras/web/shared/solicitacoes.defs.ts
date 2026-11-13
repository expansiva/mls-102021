/// <mls fileReference="_102047_/l2/compras/web/shared/solicitacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "fornecedorNome": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "status": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "enviadaDe": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "enviadaAte": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "numero": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaSolicitacoes",
        "persist": true,
        "required": false
      },
      "solicitacaoCompraId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:solicitacaoOpcoes",
        "persist": false,
        "required": false
      },
      "opcaoEscolhidaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:decisaoSolicitacao",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarSolicitacoes": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "solicitacoes"
      ]
    },
    "obterSolicitacao": {
      "kind": "qry",
      "trigger": "obterSolicitacao",
      "returns": [
        "solicitacao"
      ]
    },
    "buscarProdutos": {
      "kind": "qry",
      "trigger": "buscarProdutos",
      "returns": [
        "produtos"
      ]
    },
    "criarSolicitacao": {
      "kind": "cmd",
      "trigger": "criarSolicitacao",
      "returns": [
        "solicitacao"
      ],
      "writes": "SolicitacaoCompra.create"
    },
    "enviarSolicitacao": {
      "kind": "cmd",
      "trigger": "enviarSolicitacao",
      "returns": [
        "solicitacao"
      ],
      "writes": "SolicitacaoCompra.enviar"
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
    "solicitacoes": {
      "source": "listarSolicitacoes.solicitacoes",
      "description": "the list of Solicitação de compra resumida com produto, comprador, fornecedores das opções pesquisadas e indicadores de completude, quantidade de opções e necessidade vencida.",
      "organisms": [
        "listaSolicitacoes"
      ]
    },
    "produtos": {
      "source": "buscarProdutos.produtos",
      "description": "the list of Produto ativo do catálogo que pode ser solicitado, com sua unidade de medida.",
      "organisms": [
        "novaSolicitacao"
      ]
    },
    "solicitacao": {
      "source": "obterSolicitacao.solicitacao",
      "description": "Solicitação de compra completa com produto, quantidade, justificativa, marcos do processo do sistema, até três opções pesquisadas e o pedido gerado quando autorizada.",
      "organisms": [
        "decisaoSolicitacao",
        "historicoSistema",
        "solicitacaoOpcoes"
      ]
    },
    "selectedSolicitacaoCompra": {
      "source": "entry.params.solicitacaoCompraId",
      "description": "the id of the SolicitacaoCompra selected in solicitacaoOpcoes",
      "organisms": [
        "decisaoSolicitacao",
        "listaSolicitacoes",
        "solicitacaoOpcoes"
      ]
    }
  },
  "journeys": [
    {
      "step": "abrirSolicitacao/criarSolicitacao",
      "organisms": [
        "novaSolicitacao"
      ]
    },
    {
      "step": "abrirSolicitacao/enviarSolicitacao",
      "organisms": [
        "decisaoSolicitacao",
        "historicoSistema"
      ]
    },
    {
      "step": "abrirSolicitacao/verOpcoesPesquisadas",
      "organisms": [
        "solicitacaoOpcoes"
      ]
    },
    {
      "step": "autorizarSolicitacao/localizarPendentes",
      "organisms": [
        "listaSolicitacoes"
      ]
    },
    {
      "step": "autorizarSolicitacao/analisarSolicitacao",
      "organisms": [
        "solicitacaoOpcoes",
        "historicoSistema"
      ]
    },
    {
      "step": "autorizarSolicitacao/autorizar",
      "organisms": [
        "decisaoSolicitacao"
      ]
    },
    {
      "step": "autorizarSolicitacao/rejeitar",
      "organisms": [
        "decisaoSolicitacao"
      ]
    },
    {
      "step": "pesquisarCompras/filtrarSolicitacoes",
      "organisms": [
        "listaSolicitacoes"
      ]
    },
    {
      "step": "pesquisarCompras/filtrarPedidos",
      "organisms": [],
      "continuesIn": "pedidos"
    },
    {
      "step": "pesquisarCompras/verPedido",
      "organisms": [],
      "continuesIn": "pedidos"
    },
    {
      "step": "pesquisarComprasGerente/filtrarSolicitacoesGerente",
      "organisms": [
        "listaSolicitacoes"
      ]
    },
    {
      "step": "pesquisarComprasGerente/filtrarPedidosGerente",
      "organisms": [],
      "continuesIn": "pedidos"
    },
    {
      "step": "pesquisarComprasGerente/verPedidoGerente",
      "organisms": [],
      "continuesIn": "pedidos"
    }
  ],
  "rules": [
    "apenasGerenteDecide",
    "autorizacaoExigeOpcao",
    "compradorEscolhidoDaListaDeUsuarios",
    "compradorInativoNaoAbreSolicitacao",
    "numeroPedidoSequencial",
    "opcaoDaMesmaSolicitacao",
    "opcaoSomenteEstimativa",
    "pedidoSomenteDeSolicitacaoAutorizada",
    "pedidoUsaOpcaoEscolhida",
    "produtoInativoNaoSolicitado",
    "quantidadePositiva",
    "rejeicaoExigeMotivo",
    "solicitacaoCompletaParaEnviar",
    "umPedidoPorSolicitacao"
  ],
  "access": {
    "actors": [
      "comprador",
      "gerenteCompras"
    ],
    "grants": [
      "compradorCadastros",
      "compradorSolicitacoesPedidos",
      "compradorProprioRegistro",
      "compradorListaCompradores",
      "gerenteCadastrosConsulta",
      "gerenteSolicitacoesPedidos",
      "gerenteCompradores"
    ]
  }
} as const;
