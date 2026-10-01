/// <mls fileReference="_102047_/l2/controleEstoque/web/shared/movimentacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:historicoMovimentacoes",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:historicoMovimentacoes",
        "persist": true
      }
    }
  },
  "forms": {
    "formularioMovimentacao": {
      "organism": "formularioMovimentacao",
      "submit": "registrarMovimentacao"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "movimentacoes",
        "produtos"
      ]
    },
    "registrarMovimentacao": {
      "kind": "cmd",
      "trigger": "registrarMovimentacao",
      "returns": [
        "movimentacaoEstoque"
      ],
      "writes": "MovimentacaoEstoque.create"
    }
  },
  "states": {
    "historicoMovimentacoes": {
      "source": "load.movimentacoes",
      "description": "Histórico de movimentações de estoque."
    },
    "produtos": {
      "source": "load.produtos",
      "description": "Produtos e saldos de estoque."
    },
    "produtoIdFiltro": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado para filtrar o histórico."
    },
    "paginaHistorico": {
      "source": "entry.params.page",
      "description": "Página atual do histórico."
    },
    "movimentacaoEstoqueFormulario": {
      "source": "registrarMovimentacao.input",
      "description": "Dados da movimentação em preenchimento."
    },
    "movimentacaoEstoqueRegistrada": {
      "source": "registrarMovimentacao.movimentacaoEstoque",
      "description": "Movimentação de estoque registrada."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega movimentações e produtos.",
      "calls": "load",
      "sets": "historicoMovimentacoes",
      "updates": [
        "produtos"
      ]
    },
    "filterHistoricoMovimentacoes": {
      "description": "Filtra o histórico por produto e página.",
      "calls": "load",
      "sets": "historicoMovimentacoes",
      "updates": [
        "produtoIdFiltro",
        "paginaHistorico"
      ],
      "carries": {
        "produtoId": "produtoIdFiltro.value",
        "page": "paginaHistorico.value"
      }
    },
    "loadMoreHistoricoMovimentacoes": {
      "description": "Carrega mais movimentações do histórico.",
      "calls": "load",
      "sets": "historicoMovimentacoes",
      "updates": [
        "paginaHistorico"
      ],
      "carries": {
        "produtoId": "produtoIdFiltro.value",
        "page": "paginaHistorico.value"
      }
    },
    "registrarMovimentacao": {
      "description": "Registra uma movimentação de estoque.",
      "calls": "registrarMovimentacao",
      "sets": "movimentacaoEstoqueRegistrada",
      "updates": [
        "historicoMovimentacoes",
        "produtos",
        "movimentacaoEstoqueFormulario"
      ]
    }
  },
  "journeys": [
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "historicoMovimentacoes"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "formularioMovimentacao"
      ],
      "functions": [
        "filterHistoricoMovimentacoes"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "formularioMovimentacao",
        "acoesRegistro"
      ],
      "functions": [
        "registrarMovimentacao"
      ]
    }
  ],
  "rules": {
    "load": [
      "movimentacaoEstoqueImutavel",
      "quantidadeMovimentadaPositiva",
      "registroMovimentacaoAtualizaSaldo",
      "quantidadeMinimaValida",
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
    ],
    "registrarMovimentacao": [
      "movimentacaoEstoqueImutavel",
      "quantidadeMovimentadaPositiva",
      "registroMovimentacaoAtualizaSaldo"
    ]
  },
  "access": {
    "actors": [
      "estoquista"
    ],
    "grants": [
      "gerenciarEstoque"
    ]
  }
} as const;
