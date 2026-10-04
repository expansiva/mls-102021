/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/despesas_da_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:expenseReview",
        "persist": true
      },
      "colaboradorId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pendingTeamExpenses",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:pendingTeamExpenses",
        "persist": true
      }
    }
  },
  "forms": {
    "approveExpense": {
      "organism": "approvalDecision",
      "submit": "approveExpense"
    },
    "rejectExpense": {
      "organism": "approvalDecision",
      "submit": "rejectExpense"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "despesasDaEquipe",
        "colaborador"
      ]
    },
    "loadDespesasDaEquipe": {
      "kind": "qry",
      "trigger": "loadDespesasDaEquipe",
      "returns": [
        "despesasDaEquipe"
      ]
    },
    "approveExpense": {
      "kind": "cmd",
      "trigger": "approveExpense",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.aprovarDespesa"
    },
    "rejectExpense": {
      "kind": "cmd",
      "trigger": "rejectExpense",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.rejeitarDespesa"
    }
  },
  "states": {
    "despesasDaEquipe": {
      "source": "load.despesasDaEquipe",
      "description": "Despesas pendentes da equipe"
    },
    "colaborador": {
      "source": "load.colaborador",
      "description": "Colaborador da despesa selecionada"
    },
    "despesaSelecionada": {
      "source": "entry.params.despesaId",
      "description": "Despesa selecionada para análise"
    },
    "colaboradorId": {
      "source": "entry.params.colaboradorId",
      "description": "Filtro de colaborador"
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página da lista de despesas"
    }
  },
  "functions": {
    "load": {
      "description": "Carrega despesas pendentes da equipe e colaborador da despesa selecionada",
      "calls": "load",
      "sets": "despesasDaEquipe",
      "updates": [
        "colaborador"
      ]
    },
    "filterPendingTeamExpenses": {
      "description": "Filtra despesas pendentes da equipe",
      "calls": "loadDespesasDaEquipe",
      "sets": "despesasDaEquipe"
    },
    "loadMorePendingTeamExpenses": {
      "description": "Carrega mais despesas pendentes da equipe",
      "calls": "loadDespesasDaEquipe",
      "sets": "despesasDaEquipe"
    },
    "approveExpense": {
      "description": "Aprova a despesa selecionada",
      "calls": "approveExpense",
      "sets": "despesasDaEquipe",
      "updates": [
        "despesaSelecionada"
      ]
    },
    "rejectExpense": {
      "description": "Rejeita a despesa selecionada",
      "calls": "rejectExpense",
      "sets": "despesasDaEquipe",
      "updates": [
        "despesaSelecionada"
      ]
    }
  },
  "journeys": [
    {
      "step": "analisarDecidirDespesa/localizarDespesasPendentes",
      "organisms": [
        "pendingTeamExpenses"
      ],
      "functions": [
        "load",
        "filterPendingTeamExpenses",
        "loadMorePendingTeamExpenses"
      ],
      "continuesIn": "despesas_da_equipe"
    },
    {
      "step": "analisarDecidirDespesa/analisarDespesa",
      "organisms": [
        "expenseReview",
        "approvalDecision"
      ],
      "functions": [
        "approveExpense",
        "rejectExpense"
      ],
      "continuesIn": "despesas_da_equipe"
    }
  ],
  "rules": {
    "load": [
      "managerTeamExpenseAccess"
    ],
    "loadDespesasDaEquipe": [
      "managerTeamExpenseAccess"
    ],
    "approveExpense": [
      "managerTeamExpenseAccess"
    ],
    "rejectExpense": [
      "managerTeamExpenseAccess",
      "rejectionReasonRequired"
    ]
  },
  "access": {
    "actors": [
      "gestorEquipe"
    ],
    "grants": [
      "gestorAnalisaDespesasDaEquipe"
    ]
  }
} as const;
