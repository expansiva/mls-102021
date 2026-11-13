/// <mls fileReference="_102047_/l2/tarefas/web/shared/painel_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "carregarPainelTarefas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "indicadores",
        "listas"
      ]
    }
  },
  "states": {
    "indicadores": {
      "source": "carregarPainelTarefas.indicadores",
      "description": "Contagens da situação geral das tarefas da organização: abertas, que vencem hoje, atrasadas e devolvidas aguardando retomada.",
      "organisms": [
        "indicadoresTarefas"
      ]
    },
    "listas": {
      "source": "carregarPainelTarefas.listas",
      "description": "the list of Lista de tarefas (projeto ou área) com a quantidade de tarefas abertas, os totais de itens de checklist concluídos e existentes nas suas tarefas abertas, e as tarefas abertas que têm checklist.",
      "organisms": [
        "tarefasPorLista"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharTarefas/filtrarTarefas",
      "organisms": [
        "indicadoresTarefas",
        "tarefasPorLista"
      ],
      "continuesIn": "tarefas_equipe"
    },
    {
      "step": "acompanharTarefas/verQuadro",
      "organisms": [],
      "continuesIn": "tarefas_equipe"
    },
    {
      "step": "acompanharTarefas/abrirTarefaGestor",
      "organisms": [],
      "continuesIn": "tarefas_equipe"
    }
  ],
  "rules": [
    "gestorPorAcessoPlataforma",
    "membroVeResponsavelOuCriador",
    "tarefaAbertaVencimento"
  ],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorListas",
      "gestorTodasTarefas"
    ]
  }
} as const;
