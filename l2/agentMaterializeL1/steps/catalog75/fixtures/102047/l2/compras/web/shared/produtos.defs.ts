/// <mls fileReference="_102047_/l2/compras/web/shared/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "produtoId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:produtoForm",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarProdutos": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "produtos"
      ]
    },
    "pesquisarProdutos": {
      "kind": "qry",
      "trigger": "pesquisarProdutos",
      "returns": [
        "produtos"
      ]
    },
    "obterProduto": {
      "kind": "qry",
      "trigger": "obterProduto",
      "returns": [
        "produto"
      ]
    },
    "cadastrarProduto": {
      "kind": "cmd",
      "trigger": "cadastrarProduto",
      "returns": [
        "produto"
      ],
      "writes": "Produto.create"
    },
    "salvarAlteracaoProduto": {
      "kind": "cmd",
      "trigger": "salvarAlteracaoProduto",
      "returns": [
        "produto"
      ],
      "writes": "Produto.update"
    }
  },
  "states": {
    "produtos": {
      "source": "listarProdutos.produtos",
      "description": "the list of Produto do catálogo de compras com os dados de identificação, código, classificação, unidade de medida, controle de estoque e situação no cadastro.",
      "organisms": [
        "produtosList"
      ]
    },
    "produto": {
      "source": "obterProduto.produto",
      "description": "Cadastro completo de um produto do catálogo de compras, com versão para controle de concorrência, nomes, país, código, classificação, unidade de medida, controle de estoque, observações e situação.",
      "organisms": [
        "produtoForm"
      ]
    },
    "selectedProduto": {
      "source": "entry.params.produtoId",
      "description": "the id of the Produto selected in produtosList",
      "organisms": [
        "produtoForm",
        "produtosList"
      ]
    }
  },
  "journeys": [],
  "rules": [],
  "access": {
    "actors": [
      "comprador",
      "gerenteCompras"
    ],
    "grants": [
      "compradorCadastros",
      "gerenteCadastrosConsulta"
    ]
  }
} as const;
