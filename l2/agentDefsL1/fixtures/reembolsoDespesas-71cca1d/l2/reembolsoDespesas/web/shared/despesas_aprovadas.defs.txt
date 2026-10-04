/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/despesas_aprovadas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:approvedExpenseDetail",
        "persist": true
      },
      "colaboradorId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:approvedExpensesList",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:approvedExpensesList",
        "persist": true
      }
    }
  },
  "forms": {
    "registerPayment": {
      "organism": "paymentDateForm",
      "submit": "registerPayment"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "despesasAprovadas"
      ]
    },
    "loadDespesasAprovadas": {
      "kind": "qry",
      "trigger": "loadDespesasAprovadas",
      "returns": [
        "despesasAprovadas"
      ]
    },
    "registerPayment": {
      "kind": "cmd",
      "trigger": "registerPayment",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.registrarPagamento"
    }
  },
  "states": {
    "despesasAprovadas": {
      "source": "load.despesasAprovadas",
      "description": "Despesas aprovadas para pagamento."
    },
    "despesaAprovada": {
      "source": "entry.params.despesaId",
      "description": "Despesa aprovada selecionada."
    },
    "colaboradorId": {
      "source": "entry.params.colaboradorId",
      "description": "Colaborador usado para filtrar despesas aprovadas."
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página da lista de despesas aprovadas."
    },
    "dataPagamento": {
      "source": "registerPayment.input",
      "description": "Data de pagamento informada."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega as despesas aprovadas.",
      "calls": "load",
      "sets": "despesasAprovadas"
    },
    "filterApprovedExpensesList": {
      "description": "Filtra as despesas aprovadas.",
      "calls": "loadDespesasAprovadas",
      "sets": "despesasAprovadas"
    },
    "loadMoreApprovedExpensesList": {
      "description": "Carrega mais despesas aprovadas.",
      "calls": "loadDespesasAprovadas",
      "sets": "despesasAprovadas"
    },
    "registerPayment": {
      "description": "Registra o pagamento da despesa aprovada.",
      "calls": "registerPayment",
      "sets": "despesaAprovada",
      "updates": [
        "despesasAprovadas"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarDespesasAprovadas/consultarDespesaAprovada",
      "organisms": [
        "approvedExpensesList",
        "approvedExpenseDetail"
      ],
      "functions": [
        "load"
      ],
      "continuesIn": "despesas_aprovadas"
    },
    {
      "step": "consultarDespesasAprovadas/localizarDespesasAprovadas",
      "organisms": [
        "approvedExpensesList"
      ],
      "functions": [
        "filterApprovedExpensesList",
        "loadMoreApprovedExpensesList"
      ],
      "continuesIn": "despesas_aprovadas"
    },
    {
      "step": "registrarPagamentoDespesa/localizarDespesaAprovada",
      "organisms": [
        "approvedExpensesList",
        "approvedExpenseDetail"
      ],
      "functions": [
        "load"
      ],
      "continuesIn": "despesas_aprovadas"
    },
    {
      "step": "registrarPagamentoDespesa/registrarDataPagamento",
      "organisms": [
        "paymentDateForm"
      ],
      "functions": [
        "registerPayment"
      ],
      "continuesIn": "despesas_aprovadas"
    }
  ],
  "rules": {
    "load": [
      "financeApprovedExpenseAccess"
    ],
    "loadDespesasAprovadas": [
      "financeApprovedExpenseAccess"
    ],
    "registerPayment": [
      "financeApprovedExpenseAccess",
      "paymentDateRequired"
    ]
  },
  "access": {
    "actors": [
      "financeiro"
    ],
    "grants": [
      "financeiroConsultaEpagaDespesasAprovadas"
    ]
  }
} as const;
