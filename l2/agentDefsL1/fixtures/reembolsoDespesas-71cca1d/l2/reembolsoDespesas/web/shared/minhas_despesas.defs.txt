/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/minhas_despesas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "despesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheDespesa",
        "persist": true
      },
      "colaboradorId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaMinhasDespesas",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaMinhasDespesas",
        "persist": true
      }
    }
  },
  "forms": {
    "registrarDespesa": {
      "organism": "formularioDespesa",
      "submit": "registrarDespesa"
    },
    "corrigirDespesa": {
      "organism": "formularioDespesa",
      "submit": "corrigirDespesa"
    },
    "enviarParaAprovacao": {
      "organism": "formularioDespesa",
      "submit": "enviarParaAprovacao"
    },
    "reenviarParaAprovacao": {
      "organism": "formularioDespesa",
      "submit": "reenviarParaAprovacao"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "minhasDespesas"
      ]
    },
    "loadMinhasDespesas": {
      "kind": "qry",
      "trigger": "loadMinhasDespesas",
      "returns": [
        "minhasDespesas"
      ]
    },
    "registrarDespesa": {
      "kind": "cmd",
      "trigger": "registrarDespesa",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.create"
    },
    "corrigirDespesa": {
      "kind": "cmd",
      "trigger": "corrigirDespesa",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.update"
    },
    "enviarParaAprovacao": {
      "kind": "cmd",
      "trigger": "enviarParaAprovacao",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.enviarParaAprovacao"
    },
    "reenviarParaAprovacao": {
      "kind": "cmd",
      "trigger": "reenviarParaAprovacao",
      "returns": [
        "despesa"
      ],
      "writes": "Despesa.reenviarParaAprovacao"
    }
  },
  "states": {
    "minhasDespesas": {
      "source": "load.minhasDespesas",
      "description": "Lista paginada de despesas do colaborador."
    },
    "colaboradorId": {
      "source": "entry.params.colaboradorId",
      "description": "Identificador do colaborador usado para filtrar as despesas."
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página solicitada da lista de despesas."
    },
    "detalheDespesa": {
      "source": "entry.params.despesaId",
      "description": "Despesa selecionada na lista para consulta, correção ou envio."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega a primeira página das despesas do colaborador.",
      "calls": "load",
      "sets": "minhasDespesas"
    },
    "filterListaMinhasDespesas": {
      "description": "Recarrega a primeira página das despesas conforme os filtros informados.",
      "calls": "loadMinhasDespesas",
      "sets": "minhasDespesas"
    },
    "loadMoreListaMinhasDespesas": {
      "description": "Acrescenta a próxima página de despesas à lista.",
      "calls": "loadMinhasDespesas",
      "sets": "minhasDespesas"
    },
    "registrarDespesa": {
      "description": "Registra uma nova despesa.",
      "calls": "registrarDespesa",
      "sets": "detalheDespesa",
      "updates": [
        "minhasDespesas"
      ]
    },
    "corrigirDespesa": {
      "description": "Corrige a despesa selecionada.",
      "calls": "corrigirDespesa",
      "sets": "detalheDespesa",
      "updates": [
        "minhasDespesas"
      ]
    },
    "enviarParaAprovacao": {
      "description": "Envia a despesa selecionada para aprovação.",
      "calls": "enviarParaAprovacao",
      "sets": "detalheDespesa",
      "updates": [
        "minhasDespesas"
      ]
    },
    "reenviarParaAprovacao": {
      "description": "Reenvia para aprovação a despesa rejeitada selecionada.",
      "calls": "reenviarParaAprovacao",
      "sets": "detalheDespesa",
      "updates": [
        "minhasDespesas"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarMinhasDespesas/consultarDespesa",
      "organisms": [
        "listaMinhasDespesas",
        "detalheDespesa"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "consultarMinhasDespesas/localizarMinhasDespesas",
      "organisms": [
        "listaMinhasDespesas"
      ],
      "functions": [
        "filterListaMinhasDespesas",
        "loadMoreListaMinhasDespesas"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/consultarMotivoRejeicao",
      "organisms": [
        "detalheDespesa"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/localizarDespesaRejeitada",
      "organisms": [
        "listaMinhasDespesas",
        "detalheDespesa"
      ],
      "functions": [
        "filterListaMinhasDespesas"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/corrigirDespesa",
      "organisms": [
        "formularioDespesa"
      ],
      "functions": [
        "corrigirDespesa"
      ]
    },
    {
      "step": "corrigirReenviarDespesa/reenviarDespesa",
      "organisms": [
        "formularioDespesa",
        "acoesDespesa"
      ],
      "functions": [
        "reenviarParaAprovacao"
      ]
    },
    {
      "step": "registrarEnviarDespesa/registrarDespesa",
      "organisms": [
        "formularioDespesa"
      ],
      "functions": [
        "registrarDespesa"
      ]
    },
    {
      "step": "registrarEnviarDespesa/enviarParaAprovacao",
      "organisms": [
        "formularioDespesa",
        "acoesDespesa"
      ],
      "functions": [
        "enviarParaAprovacao"
      ]
    }
  ],
  "rules": {
    "load": [
      "expenseOwnerOnly"
    ],
    "loadMinhasDespesas": [
      "expenseOwnerOnly"
    ],
    "registrarDespesa": [
      "validExpenseData"
    ],
    "corrigirDespesa": [
      "expenseOwnerOnly",
      "validExpenseData",
      "singleResubmission"
    ],
    "enviarParaAprovacao": [
      "expenseOwnerOnly",
      "validExpenseData",
      "proofRequiredBeforeSubmission"
    ],
    "reenviarParaAprovacao": [
      "expenseOwnerOnly",
      "validExpenseData",
      "proofRequiredBeforeSubmission",
      "singleResubmission"
    ]
  },
  "access": {
    "actors": [
      "colaborador"
    ],
    "grants": [
      "colaboradorGerenciaPropriasDespesas"
    ]
  }
} as const;
