/// <mls fileReference="_102047_/l2/comandaRestaurante/web/shared/fechamento.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "comandaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:comandaReview",
        "persist": true
      },
      "number": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:openComandaList",
        "persist": true
      },
      "mesaCode": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:openComandaList",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:openComandaList",
        "persist": true
      },
      "id": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:comandaReview",
        "persist": true
      }
    }
  },
  "forms": {
    "fecharComandaPaga": {
      "organism": "paymentForm",
      "submit": "fecharComandaPaga"
    }
  },
  "requests": {
    "carregarFechamento": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "openComandas",
        "selectedComanda"
      ]
    },
    "buscarComandasAbertas": {
      "kind": "qry",
      "trigger": "buscarComandasAbertas",
      "returns": [
        "openComandas"
      ]
    },
    "carregarMaisComandasAbertas": {
      "kind": "qry",
      "trigger": "carregarMaisComandasAbertas",
      "returns": [
        "openComandas"
      ]
    },
    "obterComandaParaFechamento": {
      "kind": "qry",
      "trigger": "obterComandaParaFechamento",
      "returns": [
        "comanda"
      ]
    },
    "fecharComandaPaga": {
      "kind": "cmd",
      "trigger": "fecharComandaPaga",
      "returns": [
        "comanda"
      ],
      "writes": "Comanda.fecharComanda"
    }
  },
  "states": {
    "openComandas": {
      "source": "carregarFechamento.openComandas",
      "description": "Resumo de uma comanda ainda aberta para localização e seleção no fechamento."
    },
    "comanda": {
      "source": "obterComandaParaFechamento.comanda",
      "description": "Comanda selecionada com linhas válidas, totais calculados, dados de pagamento e indicador da mesa para conferência e fechamento."
    },
    "selectedComanda": {
      "source": "entry.params.comandaId",
      "description": "Comanda selecionada com linhas válidas, totais calculados, dados de pagamento e indicador da mesa para conferência e fechamento."
    }
  },
  "functions": {
    "carregarFechamento": {
      "description": "Carrega o fechamento com as comandas abertas para localização e, quando houver contexto, a cobrança completa que o caixa irá conferir.",
      "calls": "carregarFechamento",
      "sets": "openComandas",
      "updates": [
        "comanda"
      ]
    },
    "buscarComandasAbertas": {
      "description": "Substitui a lista de localização pelas comandas abertas que correspondem ao número ou à mesa procurados pelo caixa.",
      "calls": "buscarComandasAbertas",
      "sets": "openComandas"
    },
    "carregarMaisComandasAbertas": {
      "description": "Busca a próxima janela das comandas abertas da localização atual sem recarregar os resumos já exibidos. (openComandas.items: append)",
      "calls": "carregarMaisComandasAbertas",
      "updates": [
        "openComandas"
      ]
    },
    "obterComandaParaFechamento": {
      "description": "Obtém a comanda aberta selecionada pelo caixa, já composta para conferência, recebimento e fechamento.",
      "calls": "obterComandaParaFechamento",
      "sets": "comanda"
    },
    "fecharComandaPaga": {
      "description": "Registra o desconto e o pagamento, fecha a comanda e confirma que sua mesa foi liberada. (comanda: upsert)",
      "calls": "fecharComandaPaga",
      "updates": [
        "comanda"
      ]
    }
  },
  "journeys": [
    {
      "step": "fecharComanda/localizarComandaParaFechamento",
      "organisms": [
        "openComandaList"
      ],
      "functions": [
        "carregarFechamento",
        "buscarComandasAbertas",
        "carregarMaisComandasAbertas",
        "obterComandaParaFechamento"
      ]
    },
    {
      "step": "fecharComanda/conferirTotalComanda",
      "organisms": [
        "comandaReview",
        "paymentForm"
      ],
      "functions": [
        "obterComandaParaFechamento"
      ]
    },
    {
      "step": "fecharComanda/fecharComandaPaga",
      "organisms": [
        "paymentForm",
        "closeComandaActions",
        "comandaReview"
      ],
      "functions": [
        "fecharComandaPaga",
        "buscarComandasAbertas"
      ]
    }
  ],
  "rules": {
    "carregarFechamento": [
      "subtotalComandaCalculado",
      "totalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ],
    "buscarComandasAbertas": [
      "subtotalComandaCalculado",
      "totalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ],
    "carregarMaisComandasAbertas": [
      "subtotalComandaCalculado",
      "totalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ],
    "obterComandaParaFechamento": [
      "subtotalComandaCalculado",
      "totalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ],
    "fecharComandaPaga": [
      "pagamentoObrigatorioNoFechamento",
      "descontoNaoExcedeSubtotal",
      "fechamentoLiberaMesa",
      "subtotalComandaCalculado",
      "totalComandaCalculado",
      "valorTotalItemComandaCalculado"
    ]
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
