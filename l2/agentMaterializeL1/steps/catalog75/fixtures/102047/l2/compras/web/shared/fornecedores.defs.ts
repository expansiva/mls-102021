/// <mls fileReference="_102047_/l2/compras/web/shared/fornecedores.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "texto": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaFornecedores",
        "persist": true,
        "required": false
      },
      "fornecedorId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:fichaFornecedor",
        "persist": false,
        "required": false
      },
      "docId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:cadastroFornecedor",
        "persist": false,
        "required": false
      },
      "produtoId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:cadastroFornecedor",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "buscarFornecedores": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "fornecedores"
      ]
    },
    "obterFichaFornecedor": {
      "kind": "qry",
      "trigger": "obterFichaFornecedor",
      "returns": [
        "fornecedor",
        "contatos",
        "produtosFornecidos"
      ]
    },
    "buscarProdutos": {
      "kind": "qry",
      "trigger": "buscarProdutos",
      "returns": [
        "produtos"
      ]
    },
    "salvarFornecedor": {
      "kind": "cmd",
      "trigger": "salvarFornecedor",
      "returns": [
        "fornecedor"
      ],
      "writes": "Fornecedor.create"
    },
    "adicionarProdutoFornecido": {
      "kind": "cmd",
      "trigger": "adicionarProdutoFornecido",
      "returns": [
        "produtoFornecido"
      ],
      "writes": "ProdutoFornecido.create"
    }
  },
  "states": {
    "fornecedores": {
      "source": "buscarFornecedores.fornecedores",
      "description": "the list of Fornecedor cadastrado, com identificação, CNPJ, razão social e situação.",
      "organisms": [
        "listaFornecedores"
      ]
    },
    "fornecedor": {
      "source": "obterFichaFornecedor.fornecedor",
      "description": "Fornecedor cadastrado, com identificação, CNPJ, razão social e situação.",
      "organisms": [
        "fichaFornecedor"
      ]
    },
    "contatos": {
      "source": "obterFichaFornecedor.contatos",
      "description": "the list of Telefone, WhatsApp ou e-mail vinculado ao fornecedor.",
      "organisms": [
        "fichaFornecedor"
      ]
    },
    "produtosFornecidos": {
      "source": "obterFichaFornecedor.produtosFornecidos",
      "description": "the list of Produto fornecido por um fornecedor com preço combinado, moeda e prazo habitual, junto do nome e unidade do produto.",
      "organisms": [
        "fichaFornecedor"
      ]
    },
    "produtos": {
      "source": "buscarProdutos.produtos",
      "description": "the list of Produto do catálogo com nome e unidade de medida.",
      "organisms": [
        "cadastroFornecedor"
      ]
    },
    "selectedFornecedor": {
      "source": "entry.params.fornecedorId",
      "description": "the id of the Fornecedor selected in listaFornecedores",
      "organisms": [
        "fichaFornecedor",
        "listaFornecedores"
      ]
    }
  },
  "journeys": [
    {
      "step": "cadastrarFornecedor/localizarFornecedor",
      "organisms": [
        "listaFornecedores",
        "fichaFornecedor"
      ]
    },
    {
      "step": "cadastrarFornecedor/registrarFornecedor",
      "organisms": [
        "cadastroFornecedor"
      ]
    },
    {
      "step": "cadastrarFornecedor/registrarProdutoFornecido",
      "organisms": [
        "cadastroFornecedor",
        "fichaFornecedor"
      ]
    }
  ],
  "rules": [
    "fornecedorCnpjObrigatorio",
    "precoCombinadoPositivo",
    "produtoFornecidoUnicoPorFornecedor"
  ],
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
