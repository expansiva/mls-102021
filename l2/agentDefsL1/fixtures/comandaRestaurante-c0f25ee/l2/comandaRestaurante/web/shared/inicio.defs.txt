/// <mls fileReference="_102047_/l2/comandaRestaurante/web/shared/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "forms": {},
  "requests": {
    "carregarResumoOperacional": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "resumoOperacional"
      ]
    }
  },
  "states": {
    "resumoOperacional": {
      "source": "carregarResumoOperacional.resumoOperacional",
      "description": "Indicadores consolidados da operação do restaurante para a visão geral."
    }
  },
  "functions": {
    "carregarResumoOperacional": {
      "description": "Carrega os indicadores consolidados que caixa e garçom usam para consultar rapidamente a disponibilidade das mesas e o valor ainda em atendimento.",
      "calls": "carregarResumoOperacional",
      "sets": "resumoOperacional"
    }
  },
  "journeys": [],
  "rules": {
    "carregarResumoOperacional": [
      "subtotalComandaCalculado"
    ]
  },
  "access": {
    "actors": [
      "caixa",
      "garcom"
    ],
    "grants": [
      "garcomAtendimentoComandas",
      "caixaFechamentoEcadastroOperacional"
    ]
  }
} as const;
