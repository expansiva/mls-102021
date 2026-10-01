/// <mls fileReference="_102047_/l2/controleEstoque/web/shared/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheProduto",
        "persist": true
      },
      "search": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProdutos",
        "persist": true
      }
    }
  },
  "forms": {
    "formularioProduto": {
      "organism": "formularioProduto",
      "submit": "cadastrarProduto"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "produtos"
      ]
    },
    "cadastrarProduto": {
      "kind": "cmd",
      "trigger": "cadastrarProduto",
      "returns": [
        "produto"
      ],
      "writes": "Produto.create"
    }
  },
  "states": {
    "listaProdutos": {
      "source": "load.produtos",
      "description": "Produtos carregados"
    },
    "filtroBuscaProdutos": {
      "source": "entry.params.search",
      "description": "Busca de produtos"
    },
    "paginaProdutos": {
      "source": "entry.params.page",
      "description": "Página de produtos"
    },
    "produtoSelecionado": {
      "source": "entry.params.produtoId",
      "description": "Produto selecionado"
    },
    "produtoCadastro": {
      "source": "cadastrarProduto.input",
      "description": "Dados do produto"
    },
    "produtoCadastrado": {
      "source": "cadastrarProduto.produto",
      "description": "Produto cadastrado"
    },
    "movimentacoesProduto": {
      "source": "abrirMovimentacoes",
      "description": "Produto para movimentações"
    }
  },
  "functions": {
    "load": {
      "description": "Carregar produtos",
      "calls": "load",
      "sets": "listaProdutos",
      "updates": [
        "produtoSelecionado"
      ]
    },
    "filterListaProdutos": {
      "description": "Filtrar produtos",
      "calls": "load",
      "sets": "listaProdutos",
      "updates": [
        "filtroBuscaProdutos",
        "paginaProdutos",
        "produtoSelecionado"
      ]
    },
    "loadMoreListaProdutos": {
      "description": "Carregar mais produtos",
      "calls": "load",
      "sets": "listaProdutos",
      "updates": [
        "paginaProdutos"
      ]
    },
    "cadastrarProduto": {
      "description": "Cadastrar produto",
      "calls": "cadastrarProduto",
      "sets": "produtoCadastrado",
      "updates": [
        "produtoCadastro",
        "listaProdutos",
        "produtoSelecionado"
      ]
    },
    "selecionarProduto": {
      "description": "Selecionar produto",
      "sets": "produtoSelecionado"
    },
    "abrirMovimentacoes": {
      "description": "Abrir movimentações",
      "sets": "movimentacoesProduto",
      "navigate": "movimentacoes",
      "carries": {
        "produtoId": "produtoSelecionado.id"
      }
    }
  },
  "journeys": [
    {
      "step": "acompanharSaldos/consultarSaldos",
      "organisms": [
        "saldoAtual",
        "alertasSaldoBaixo"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "acompanharSaldos/localizarProdutos",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ],
      "functions": [
        "filterListaProdutos",
        "loadMoreListaProdutos",
        "selecionarProduto"
      ]
    },
    {
      "step": "cadastrarProduto/informarProduto",
      "organisms": [
        "formularioProduto",
        "acoesCadastro"
      ],
      "functions": [
        "cadastrarProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/consultarSaldo",
      "organisms": [
        "saldoAtual",
        "detalheProduto"
      ],
      "functions": [
        "selecionarProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/localizarProduto",
      "organisms": [
        "listaProdutos",
        "detalheProduto"
      ],
      "functions": [
        "filterListaProdutos",
        "selecionarProduto"
      ]
    },
    {
      "step": "registrarMovimentacaoEstoque/registrarMovimentacao",
      "organisms": [
        "detalheProduto"
      ],
      "functions": [
        "abrirMovimentacoes"
      ],
      "continuesIn": "movimentacoes"
    },
    {
      "step": "tratarAvisoSaldoBaixo/consultarProdutoAvisado",
      "organisms": [
        "alertasSaldoBaixo",
        "detalheProduto"
      ],
      "functions": [
        "selecionarProduto"
      ]
    }
  ],
  "rules": {
    "load": [
      "quantidadeMinimaValida",
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
    ],
    "cadastrarProduto": [
      "quantidadeMinimaValida",
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
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
