/// <mls fileReference="_102047_/l2/tarefas/web/shared/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "tarefaId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:tarefaDetalhe",
        "persist": false,
        "required": false
      },
      "listaTarefasId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:tarefasEquipe",
        "persist": false,
        "required": false
      },
      "responsavelId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:tarefaAcoes",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "carregarFiltrosEquipe": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "listas",
        "participantes"
      ]
    },
    "listarTarefasEquipe": {
      "kind": "qry",
      "trigger": "listarTarefasEquipe",
      "returns": [
        "tarefas",
        "contagemPorSituacao"
      ]
    },
    "obterTarefaEquipe": {
      "kind": "qry",
      "trigger": "obterTarefaEquipe",
      "returns": [
        "tarefa"
      ]
    },
    "buscarResponsaveisDisponiveis": {
      "kind": "qry",
      "trigger": "buscarResponsaveisDisponiveis",
      "returns": [
        "participantes"
      ]
    },
    "trocarResponsavelTarefa": {
      "kind": "cmd",
      "trigger": "trocarResponsavel",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.update"
    },
    "cancelarTarefaEquipe": {
      "kind": "cmd",
      "trigger": "cancelarTarefa",
      "returns": [
        "tarefa"
      ],
      "writes": "Tarefa.cancelar"
    }
  },
  "states": {
    "tarefas": {
      "source": "listarTarefasEquipe.tarefas",
      "description": "the list of Tarefa da organização em forma resumida, com a lista, o responsável, quem age agora e as marcas de vencimento já calculadas.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "contagemPorSituacao": {
      "source": "listarTarefasEquipe.contagemPorSituacao",
      "description": "the list of Quantidade de tarefas em uma situação, dentro dos filtros aplicados.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "listas": {
      "source": "carregarFiltrosEquipe.listas",
      "description": "the list of Lista de tarefas identificada pelo nome.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "carregarFiltrosEquipeParticipantes": {
      "source": "carregarFiltrosEquipe.participantes",
      "description": "the list of Participante do módulo identificado pelo nome, com a situação na plataforma e se aceita tarefas.",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    "tarefa": {
      "source": "obterTarefaEquipe.tarefa",
      "description": "Tarefa completa com lista, responsável, quem criou, quem age agora, subtarefas, checklist em ordem e o histórico de eventos.",
      "organisms": [
        "tarefaAcoes",
        "tarefaDetalhe",
        "tarefaHistorico"
      ]
    },
    "buscarResponsaveisDisponiveisParticipantes": {
      "source": "buscarResponsaveisDisponiveis.participantes",
      "description": "the list of Participante do módulo identificado pelo nome, com a situação na plataforma e se aceita tarefas.",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    "selectedTarefa": {
      "source": "entry.params.tarefaId",
      "description": "the id of the Tarefa selected in tarefasEquipe",
      "organisms": [
        "tarefaDetalhe",
        "tarefasEquipe"
      ]
    }
  },
  "journeys": [
    {
      "step": "acompanharTarefas/filtrarTarefas",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "acompanharTarefas/verQuadro",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "acompanharTarefas/abrirTarefaGestor",
      "organisms": [
        "tarefaDetalhe",
        "tarefaHistorico"
      ]
    },
    {
      "step": "cancelarTarefa/localizarTarefaCancelar",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "cancelarTarefa/cancelar",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "reatribuirTarefa/localizarTarefaReatribuir",
      "organisms": [
        "tarefasEquipe"
      ]
    },
    {
      "step": "reatribuirTarefa/verResponsavelAtual",
      "organisms": [
        "tarefaDetalhe"
      ]
    },
    {
      "step": "reatribuirTarefa/trocarResponsavel",
      "organisms": [
        "tarefaAcoes"
      ]
    }
  ],
  "rules": [
    "avisarQuemAgeAgora",
    "cancelarApenasCriadorOuGestor",
    "edicaoNaoMudaSituacao",
    "escolhaResponsavelPeloNome",
    "gestorPorAcessoPlataforma",
    "membroVeResponsavelOuCriador",
    "moduloNaoGuardaComentarios",
    "participanteNaoConfiguradoAceitaECria",
    "quemAgeAgoraPorSituacao",
    "reatribuirApenasCriadorOuGestor",
    "responsavelAceitaTarefas",
    "tarefaAbertaVencimento"
  ],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorParticipantes",
      "gestorListas",
      "gestorTodasTarefas"
    ]
  }
} as const;
