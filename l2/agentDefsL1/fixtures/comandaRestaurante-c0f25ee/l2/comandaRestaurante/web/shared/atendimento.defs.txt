/// <mls fileReference="_102047_/l2/comandaRestaurante/web/shared/atendimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:lookupAtendimento",
        "persist": true
      },
      "mesaTermo": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:lookupAtendimento",
        "persist": true
      },
      "comandaNumero": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:lookupAtendimento",
        "persist": true
      },
      "itemTermo": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:lookupAtendimento",
        "persist": true
      },
      "comandaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheComanda",
        "persist": true
      },
      "itemCardapioId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:formularioLancamento",
        "persist": false
      }
    }
  },
  "forms": {
    "lancarItem": {
      "organism": "formularioLancamento",
      "submit": "lancarItem"
    }
  },
  "requests": {
    "carregarAtendimento": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "contextoAtendimento"
      ]
    },
    "atualizarLocalizacaoAtendimento": {
      "kind": "qry",
      "trigger": "atualizarLocalizacaoAtendimento",
      "returns": [
        "contextoAtendimento"
      ]
    },
    "obterComandaAtendimento": {
      "kind": "qry",
      "trigger": "obterComandaAtendimento",
      "returns": [
        "comanda"
      ]
    },
    "abrirComanda": {
      "kind": "cmd",
      "trigger": "abrirComanda",
      "returns": [
        "comanda"
      ],
      "writes": "Comanda.create"
    },
    "lancarItem": {
      "kind": "cmd",
      "trigger": "lancarItem",
      "returns": [
        "comanda"
      ],
      "writes": "ItemComanda.create"
    },
    "cancelarItem": {
      "kind": "cmd",
      "trigger": "cancelarItem",
      "returns": [
        "comanda"
      ],
      "writes": "ItemComanda.cancelarItemComanda"
    }
  },
  "states": {
    "contextoAtendimento": {
      "source": "carregarAtendimento.contextoAtendimento",
      "description": "Coleções independentes usadas para localizar a mesa, a comanda aberta e o item do pedido."
    },
    "comanda": {
      "source": "obterComandaAtendimento.comanda",
      "description": "Comanda selecionada, sua mesa, todos os itens e o subtotal calculado para o atendimento."
    },
    "selectedComanda": {
      "source": "entry.params.comandaId",
      "description": "Comanda selecionada, sua mesa, todos os itens e o subtotal calculado para o atendimento."
    }
  },
  "functions": {
    "carregarAtendimento": {
      "description": "Carrega de uma vez o contexto inicial para o garçom localizar uma mesa disponível, uma comanda aberta ou um item do cardápio.",
      "calls": "carregarAtendimento",
      "sets": "contextoAtendimento"
    },
    "atualizarLocalizacaoAtendimento": {
      "description": "Atualiza a localização do atendimento quando o garçom pesquisa ou navega nas listas de mesa, comanda e cardápio.",
      "calls": "atualizarLocalizacaoAtendimento",
      "sets": "contextoAtendimento"
    },
    "obterComandaAtendimento": {
      "description": "Carrega a comanda escolhida com a mesa, todas as linhas e o subtotal necessários para conferir e operar o atendimento.",
      "calls": "obterComandaAtendimento",
      "sets": "comanda"
    },
    "abrirComanda": {
      "description": "Abre a comanda da mesa disponível escolhida e devolve o atendimento pronto para registrar pedidos. (comanda: upsert)",
      "calls": "abrirComanda",
      "updates": [
        "comanda",
        "contextoAtendimento"
      ]
    },
    "lancarItem": {
      "description": "Inclui o pedido informado na comanda aberta e devolve a conferência integral já atualizada. (comanda: upsert)",
      "calls": "lancarItem",
      "updates": [
        "comanda"
      ]
    },
    "cancelarItem": {
      "description": "Cancela a linha escolhida por engano e devolve a comanda com a cobrança recalculada. (comanda: upsert)",
      "calls": "cancelarItem",
      "updates": [
        "comanda"
      ]
    }
  },
  "journeys": [
    {
      "step": "abrirComanda/localizarMesaDisponivel",
      "organisms": [
        "lookupAtendimento"
      ],
      "functions": [
        "carregarAtendimento",
        "atualizarLocalizacaoAtendimento"
      ]
    },
    {
      "step": "abrirComanda/criarComanda",
      "organisms": [
        "acoesAtendimento",
        "detalheComanda"
      ],
      "functions": [
        "abrirComanda"
      ],
      "continuesIn": "atendimento"
    },
    {
      "step": "cancelarItemComanda/localizarComandaParaCorrecao",
      "organisms": [
        "lookupAtendimento"
      ],
      "functions": [
        "carregarAtendimento",
        "atualizarLocalizacaoAtendimento",
        "obterComandaAtendimento"
      ]
    },
    {
      "step": "cancelarItemComanda/conferirItemLancado",
      "organisms": [
        "detalheComanda",
        "acoesAtendimento"
      ],
      "functions": [
        "obterComandaAtendimento"
      ]
    },
    {
      "step": "cancelarItemComanda/cancelarItemErrado",
      "organisms": [
        "acoesAtendimento",
        "detalheComanda"
      ],
      "functions": [
        "cancelarItem"
      ],
      "continuesIn": "atendimento"
    },
    {
      "step": "lancarItemComanda/localizarComandaAberta",
      "organisms": [
        "lookupAtendimento",
        "detalheComanda"
      ],
      "functions": [
        "carregarAtendimento",
        "atualizarLocalizacaoAtendimento",
        "obterComandaAtendimento"
      ]
    },
    {
      "step": "lancarItemComanda/consultarItemCardapio",
      "organisms": [
        "lookupAtendimento",
        "formularioLancamento"
      ],
      "functions": [
        "carregarAtendimento",
        "atualizarLocalizacaoAtendimento"
      ]
    },
    {
      "step": "lancarItemComanda/adicionarItemComanda",
      "organisms": [
        "formularioLancamento",
        "acoesAtendimento",
        "detalheComanda"
      ],
      "functions": [
        "lancarItem"
      ],
      "continuesIn": "atendimento"
    }
  ],
  "rules": {
    "carregarAtendimento": [],
    "atualizarLocalizacaoAtendimento": [],
    "obterComandaAtendimento": [
      "subtotalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ],
    "abrirComanda": [
      "mesaDisponivelParaAbrirComanda",
      "umaComandaAbertaPorMesa",
      "subtotalComandaCalculado"
    ],
    "lancarItem": [
      "itensSomenteEmComandaAberta",
      "precoUnitarioRegistradoNoLancamento",
      "valorTotalItemComandaCalculado",
      "subtotalComandaCalculado"
    ],
    "cancelarItem": [
      "itemComandaOperacaoSomenteComandaAberta",
      "valorTotalItemComandaCalculado",
      "subtotalComandaCalculado"
    ]
  },
  "access": {
    "actors": [
      "garcom"
    ],
    "grants": [
      "garcomAtendimentoComandas"
    ]
  }
} as const;
