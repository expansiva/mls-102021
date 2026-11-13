/// <mls fileReference="_102047_/l2/tarefas/web/shared/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "carregarInicio": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "pendencias",
        "alertas",
        "indicadores",
        "permissoes"
      ]
    },
    "iniciarTarefa": {
      "kind": "cmd",
      "trigger": "iniciarTarefa",
      "returns": [
        "tarefa",
        "indicadores"
      ],
      "writes": "Tarefa.iniciar"
    },
    "enviarRevisao": {
      "kind": "cmd",
      "trigger": "enviarRevisao",
      "returns": [
        "tarefa",
        "indicadores"
      ],
      "writes": "Tarefa.enviarParaRevisao"
    },
    "aceitarTarefa": {
      "kind": "cmd",
      "trigger": "aceitarTarefa",
      "returns": [
        "tarefa",
        "indicadores"
      ],
      "writes": "Tarefa.aceitar"
    },
    "devolverTarefa": {
      "kind": "cmd",
      "trigger": "devolverTarefa",
      "returns": [
        "tarefa",
        "indicadores"
      ],
      "writes": "Tarefa.devolver"
    },
    "retomarTarefa": {
      "kind": "cmd",
      "trigger": "retomarTarefa",
      "returns": [
        "tarefa",
        "indicadores"
      ],
      "writes": "Tarefa.retomar"
    }
  },
  "states": {
    "pendencias": {
      "source": "carregarInicio.pendencias",
      "description": "the list of Tarefa que depende de uma pessoa agora, com situação, prazo, prioridade, lista, responsável, quem criou, progresso da checklist e motivo da devolução.",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    "alertas": {
      "source": "carregarInicio.alertas",
      "description": "the list of Tarefa aberta que vence hoje ou está atrasada, com título, prazo e situação.",
      "organisms": [
        "alertasPrazo"
      ]
    },
    "indicadores": {
      "source": "carregarInicio.indicadores",
      "description": "Contadores das tarefas de uma pessoa: abertas, que vencem hoje, atrasadas e devolvidas aguardando retomada.",
      "organisms": [
        "indicadoresTarefas"
      ]
    },
    "permissoes": {
      "source": "carregarInicio.permissoes",
      "description": "Participante com seu nome e se aceita e pode criar tarefas (efetivo).",
      "organisms": [
        "minhasPermissoes"
      ]
    }
  },
  "journeys": [
    {
      "step": "executarTarefa/abrirTarefa",
      "organisms": [
        "pendenciasAgora"
      ],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "executarTarefa/verTarefa",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "executarTarefa/iniciarTarefa",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "executarTarefa/marcarItem",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "executarTarefa/enviarRevisao",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "retomarTarefa/lerMotivo",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "retomarTarefa/retomar",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "retomarTarefa/reenviarRevisao",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "revisarTarefa/abrirRevisao",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "revisarTarefa/conferirTarefa",
      "organisms": [],
      "continuesIn": "minhas_tarefas"
    },
    {
      "step": "revisarTarefa/aceitarTarefa",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "revisarTarefa/devolverTarefa",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "step": "resumoDiario/lerResumo",
      "organisms": [
        "alertasPrazo",
        "indicadoresTarefas"
      ]
    },
    {
      "step": "resumoDiario/verVencendo",
      "organisms": [
        "alertasPrazo"
      ],
      "continuesIn": "minhas_tarefas"
    }
  ],
  "rules": [
    "apenasCriadorRevisa",
    "apenasResponsavelExecuta",
    "avisarQuemAgeAgora",
    "avisoNaoSobrepostoPorPessoa",
    "devolucaoExigeMotivo",
    "membroVeResponsavelOuCriador",
    "participanteNaoConfiguradoAceitaECria",
    "quemAgeAgoraPorSituacao",
    "resumoDiarioOitoHoras",
    "retomarSoAposDevolucao",
    "tarefaAbertaVencimento"
  ],
  "access": {
    "actors": [
      "membroEquipe"
    ],
    "grants": [
      "membroTarefasProprias",
      "membroEscolherResponsavel",
      "membroConsultarListas"
    ]
  }
} as const;
