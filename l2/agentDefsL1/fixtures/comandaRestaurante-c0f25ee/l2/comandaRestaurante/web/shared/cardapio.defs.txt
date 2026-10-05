/// <mls fileReference="_102047_/l2/comandaRestaurante/web/shared/cardapio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaItensCardapio",
        "persist": true
      },
      "itemCardapioId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:formularioItemCardapio",
        "persist": true
      }
    }
  },
  "forms": {
    "cadastrarItemCardapio": {
      "organism": "formularioItemCardapio",
      "submit": "cadastrarItemCardapio"
    },
    "atualizarItemCardapio": {
      "organism": "formularioItemCardapio",
      "submit": "atualizarItemCardapio"
    }
  },
  "requests": {
    "carregarItensCardapio": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "pagina"
      ]
    },
    "carregarMaisItensCardapio": {
      "kind": "qry",
      "trigger": "carregarMaisItensCardapio",
      "returns": [
        "pagina"
      ]
    },
    "obterItemCardapio": {
      "kind": "qry",
      "trigger": "obterItemCardapio",
      "returns": [
        "item"
      ]
    },
    "cadastrarItemCardapio": {
      "kind": "cmd",
      "trigger": "cadastrarItemCardapio",
      "returns": [
        "item"
      ],
      "writes": "ItemCardapio.create"
    },
    "atualizarItemCardapio": {
      "kind": "cmd",
      "trigger": "atualizarItemCardapio",
      "returns": [
        "item"
      ],
      "writes": "ItemCardapio.update"
    }
  },
  "states": {
    "pagina": {
      "source": "carregarItensCardapio.pagina",
      "description": "Dados de um item exibidos no catálogo do cardápio."
    },
    "item": {
      "source": "obterItemCardapio.item",
      "description": "Dados persistidos do item selecionado para preenchimento e manutenção do formulário."
    },
    "selectedItemCardapio": {
      "source": "entry.params.itemCardapioId",
      "description": "Dados persistidos do item selecionado para preenchimento e manutenção do formulário."
    }
  },
  "functions": {
    "carregarItensCardapio": {
      "description": "Carrega a primeira página do catálogo ao abrir a página para o caixa conferir os itens disponíveis e selecionar um para manutenção.",
      "calls": "carregarItensCardapio",
      "sets": "pagina"
    },
    "carregarMaisItensCardapio": {
      "description": "Busca a próxima página do catálogo quando o caixa continua a leitura, sem transferir todos os itens cadastrados. (pagina.items: append)",
      "calls": "carregarMaisItensCardapio",
      "updates": [
        "pagina"
      ]
    },
    "obterItemCardapio": {
      "description": "Obtém o item escolhido no catálogo para preencher o formulário de manutenção.",
      "calls": "obterItemCardapio",
      "sets": "item"
    },
    "cadastrarItemCardapio": {
      "description": "Cadastra um item com nome e preço vigente para uso operacional no cardápio.",
      "calls": "cadastrarItemCardapio",
      "sets": "item",
      "updates": [
        "pagina"
      ]
    },
    "atualizarItemCardapio": {
      "description": "Atualiza o nome e o preço vigente do item selecionado para manter o catálogo usado pela operação.",
      "calls": "atualizarItemCardapio",
      "sets": "item",
      "updates": [
        "pagina"
      ]
    }
  },
  "journeys": [],
  "rules": {
    "carregarItensCardapio": [],
    "carregarMaisItensCardapio": [],
    "obterItemCardapio": [],
    "cadastrarItemCardapio": [],
    "atualizarItemCardapio": []
  },
  "access": {
    "actors": [
      "caixa"
    ],
    "grants": [
      "caixaFechamentoEcadastroOperacional"
    ]
  }
} as const;
