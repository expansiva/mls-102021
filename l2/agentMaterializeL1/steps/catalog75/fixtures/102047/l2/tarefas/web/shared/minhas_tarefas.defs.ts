/// <mls fileReference="_102047_/l2/tarefas/web/shared/minhas_tarefas.defs.ts" enhancement="_blank"/>

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
      "listaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:tarefaForm",
        "persist": false,
        "required": false
      },
      "responsavelId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:tarefaForm",
        "persist": false,
        "required": false
      },
      "tarefaPaiId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:tarefaForm",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "qryMinhasTarefas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "tarefas",
        "quantidadeDependeDeMim",
        "quantidadeResponsavel",
        "quantidadeCriadas",
        "quantidadeVenceHoje",
        "quantidadeAtrasadas",
        "podeCriarTarefasEfetivo"
      ]
    },
    "qryTarefasDoGrupo": {
      "kind": "qry",
      "trigger": "qryTarefasDoGrupo",
      "returns": [
        "tarefas"
      ]
    },
    "qryTarefa": {
      "kind": "qry",
      "trigger": "qryTarefa",
      "returns": [
        "tarefa",
        "historico"
      ]
    },
    "qryResponsaveis": {
      "kind": "qry",
      "trigger": "qryResponsaveis",
      "returns": [
        "participantes"
      ]
    },
    "qryListas": {
      "kind": "qry",
      "trigger": "qryListas",
      "returns": [
        "listas"
      ]
    },
    "cmdCriarTarefa": {
      "kind": "cmd",
      "trigger": "criarTarefa",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.create"
    },
    "cmdAdicionarItensChecklist": {
      "kind": "cmd",
      "trigger": "adicionarItensChecklist",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "ItemChecklist.create"
    },
    "cmdSalvarAlteracoes": {
      "kind": "cmd",
      "trigger": "salvarAlteracoes",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.update"
    },
    "cmdAjustarChecklist": {
      "kind": "cmd",
      "trigger": "ajustarChecklist",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "ItemChecklist.update"
    },
    "cmdIniciar": {
      "kind": "cmd",
      "trigger": "iniciar",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.iniciar"
    },
    "cmdEnviarParaRevisao": {
      "kind": "cmd",
      "trigger": "enviarParaRevisao",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.enviarParaRevisao"
    },
    "cmdAceitar": {
      "kind": "cmd",
      "trigger": "aceitar",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.aceitar"
    },
    "cmdDevolver": {
      "kind": "cmd",
      "trigger": "devolver",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.devolver"
    },
    "cmdRetomar": {
      "kind": "cmd",
      "trigger": "retomar",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.retomar"
    },
    "cmdCancelar": {
      "kind": "cmd",
      "trigger": "cancelar",
      "returns": [
        "tarefa",
        "historico"
      ],
      "writes": "Tarefa.cancelar"
    }
  },
  "states": {
    "tarefas": {
      "source": "qryMinhasTarefas.tarefas",
      "description": "the list of Tarefa em forma resumida, com lista, responsável, quem criou, quem age agora, progresso da checklist e marcações de vencimento e devolução.",
      "organisms": [
        "tarefasLista"
      ]
    },
    "quantidadeDependeDeMim": {
      "source": "qryMinhasTarefas.quantidadeDependeDeMim",
      "description": "the quantidadeDependeDeMim that qryMinhasTarefas returns",
      "organisms": [
        "tarefasLista"
      ]
    },
    "quantidadeResponsavel": {
      "source": "qryMinhasTarefas.quantidadeResponsavel",
      "description": "the quantidadeResponsavel that qryMinhasTarefas returns",
      "organisms": [
        "tarefasLista"
      ]
    },
    "quantidadeCriadas": {
      "source": "qryMinhasTarefas.quantidadeCriadas",
      "description": "the quantidadeCriadas that qryMinhasTarefas returns",
      "organisms": [
        "tarefasLista"
      ]
    },
    "quantidadeVenceHoje": {
      "source": "qryMinhasTarefas.quantidadeVenceHoje",
      "description": "the quantidadeVenceHoje that qryMinhasTarefas returns",
      "organisms": [
        "tarefasLista"
      ]
    },
    "quantidadeAtrasadas": {
      "source": "qryMinhasTarefas.quantidadeAtrasadas",
      "description": "the quantidadeAtrasadas that qryMinhasTarefas returns",
      "organisms": [
        "tarefasLista"
      ]
    },
    "tarefa": {
      "source": "qryTarefa.tarefa",
      "description": "Tarefa com todos os seus campos, nomes do responsável e de quem criou, lista, tarefa pai, marcos de devolução, retomada, conclusão e cancelamento, papel da pessoa da sessão e a checklist em ordem.",
      "organisms": [
        "tarefaAcoes",
        "tarefaDetalhe",
        "tarefaForm"
      ]
    },
    "historico": {
      "source": "qryTarefa.historico",
      "description": "the list of Marco do ciclo de uma tarefa: criação, início, envio para revisão, devolução com motivo, retomada, aceite, troca de responsável ou cancelamento, com momento e pessoa envolvida.",
      "organisms": [
        "tarefaHistorico"
      ]
    },
    "podeCriarTarefasEfetivo": {
      "source": "qryMinhasTarefas.podeCriarTarefasEfetivo",
      "description": "the podeCriarTarefasEfetivo that qryMinhasTarefas returns",
      "organisms": [
        "tarefaForm"
      ]
    },
    "participantes": {
      "source": "qryResponsaveis.participantes",
      "description": "the list of Participante ativo que pode ser escolhido como responsável, com sua situação e se aceita tarefas.",
      "organisms": [
        "tarefaForm"
      ]
    },
    "listas": {
      "source": "qryListas.listas",
      "description": "the list of Lista de tarefas identificada pelo nome.",
      "organisms": [
        "tarefaForm"
      ]
    },
    "selectedTarefa": {
      "source": "entry.params.tarefaId",
      "description": "the id of the Tarefa selected in tarefasLista",
      "organisms": [
        "tarefaDetalhe",
        "tarefasLista"
      ]
    }
  },
  "journeys": [
    {
      "step": "minhasTarefas/listarMinhas",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "minhasTarefas/verDetalhe",
      "organisms": [
        "tarefaDetalhe",
        "tarefaHistorico"
      ]
    },
    {
      "step": "criarTarefa/preencherTarefa",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "criarTarefa/adicionarChecklist",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "editarTarefa/localizarTarefaEdicao",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "editarTarefa/alterarCampos",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "editarTarefa/ajustarChecklist",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "executarTarefa/abrirTarefa",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "executarTarefa/verTarefa",
      "organisms": [
        "tarefaDetalhe"
      ]
    },
    {
      "step": "executarTarefa/iniciarTarefa",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "executarTarefa/marcarItem",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "executarTarefa/enviarRevisao",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "retomarTarefa/lerMotivo",
      "organisms": [
        "tarefaDetalhe"
      ]
    },
    {
      "step": "retomarTarefa/retomar",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "retomarTarefa/reenviarRevisao",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "revisarTarefa/abrirRevisao",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "revisarTarefa/conferirTarefa",
      "organisms": [
        "tarefaDetalhe",
        "tarefaHistorico"
      ]
    },
    {
      "step": "revisarTarefa/aceitarTarefa",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "revisarTarefa/devolverTarefa",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "cancelarTarefaCriada/localizarCriadaCancelar",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "cancelarTarefaCriada/cancelarCriada",
      "organisms": [
        "tarefaAcoes"
      ]
    },
    {
      "step": "reatribuirTarefaCriada/localizarCriada",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "reatribuirTarefaCriada/verResponsavelCriada",
      "organisms": [
        "tarefaDetalhe"
      ]
    },
    {
      "step": "reatribuirTarefaCriada/trocarResponsavelCriada",
      "organisms": [
        "tarefaForm"
      ]
    },
    {
      "step": "resumoDiario/lerResumo",
      "organisms": [
        "tarefasLista"
      ]
    },
    {
      "step": "resumoDiario/verVencendo",
      "organisms": [
        "tarefaDetalhe"
      ]
    }
  ],
  "rules": [
    "apenasCriadorRevisa",
    "apenasResponsavelExecuta",
    "avisarQuemAgeAgora",
    "cancelarApenasCriadorOuGestor",
    "criarTarefaExigePodeCriar",
    "devolucaoExigeMotivo",
    "edicaoNaoMudaSituacao",
    "escolhaResponsavelPeloNome",
    "itemChecklistSoQuemVeTarefa",
    "itemChecklistTarefaNaoEncerrada",
    "marcarItemNaoMudaSituacao",
    "membroVeResponsavelOuCriador",
    "moduloNaoGuardaComentarios",
    "participanteNaoConfiguradoAceitaECria",
    "participanteSemCadastroPessoal",
    "podeCriarTarefasExigido",
    "quemAgeAgoraPorSituacao",
    "reatribuirApenasCriadorOuGestor",
    "responsavelAceitaTarefas",
    "retomarSoAposDevolucao",
    "tarefaAbertaVencimento",
    "tarefaPaiDiferenteDaPropria"
  ],
  "access": {
    "actors": [
      "membroEquipe"
    ],
    "grants": [
      "membroTarefasProprias",
      "membroChecklistPropria",
      "membroEscolherResponsavel",
      "membroConsultarListas"
    ]
  }
} as const;
