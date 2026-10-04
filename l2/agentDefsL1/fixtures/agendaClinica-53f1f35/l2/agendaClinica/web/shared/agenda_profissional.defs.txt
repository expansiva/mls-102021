/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/agenda_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "consultaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheConsulta",
        "persist": true
      },
      "pacienteId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:consultasDoDia",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:consultasDoDia",
        "persist": true
      }
    }
  },
  "forms": {
    "registrarAtendimento": {
      "organism": "registroAtendimento",
      "submit": "registrarAtendimento"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "agendaProfissional",
        "pacientes"
      ]
    },
    "loadAgendaProfissional": {
      "kind": "qry",
      "trigger": "loadAgendaProfissional",
      "returns": [
        "agendaProfissional"
      ]
    },
    "registrarAtendimento": {
      "kind": "cmd",
      "trigger": "registrarAtendimento",
      "returns": [
        "consulta"
      ],
      "writes": "Consulta.registrarAtendimento"
    }
  },
  "states": {
    "agendaProfissional": {
      "source": "load.agendaProfissional",
      "description": "Consultas da agenda profissional do dia."
    },
    "pacientes": {
      "source": "load.pacientes",
      "description": "Pacientes vinculados às consultas carregadas."
    },
    "consultaSelecionada": {
      "source": "entry.params.consultaId",
      "description": "Consulta selecionada na agenda."
    },
    "pacienteId": {
      "source": "entry.params.pacienteId",
      "description": "Identificador do paciente usado no filtro da agenda."
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página atual da agenda."
    },
    "atendimentoEmEdicao": {
      "source": "registrarAtendimento.input",
      "description": "Anotação de atendimento em edição para a consulta selecionada."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega a agenda profissional e os pacientes vinculados.",
      "calls": "load",
      "sets": "agendaProfissional",
      "updates": [
        "pacientes"
      ]
    },
    "filterConsultasDoDia": {
      "description": "Recarrega a primeira página das consultas do dia conforme os filtros.",
      "calls": "loadAgendaProfissional",
      "sets": "agendaProfissional"
    },
    "loadMoreConsultasDoDia": {
      "description": "Acrescenta a próxima página de consultas do dia.",
      "calls": "loadAgendaProfissional",
      "sets": "agendaProfissional"
    },
    "registrarAtendimento": {
      "description": "Registra o atendimento da consulta selecionada.",
      "calls": "registrarAtendimento",
      "sets": "consultaSelecionada",
      "updates": [
        "agendaProfissional"
      ]
    }
  },
  "journeys": [
    {
      "step": "consultarAgendaDiaria/consultarDetalhesConsulta",
      "organisms": [
        "consultasDoDia",
        "detalheConsulta"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "consultarAgendaDiaria/localizarAgendaDoDia",
      "organisms": [
        "consultasDoDia"
      ],
      "functions": [
        "filterConsultasDoDia",
        "loadMoreConsultasDoDia"
      ]
    },
    {
      "step": "registrarConsultaAtendida/localizarConsultaDaAgenda",
      "organisms": [
        "consultasDoDia"
      ],
      "functions": [
        "filterConsultasDoDia"
      ]
    },
    {
      "step": "registrarConsultaAtendida/registrarAtendimento",
      "organisms": [
        "registroAtendimento"
      ],
      "functions": [
        "registrarAtendimento"
      ]
    },
    {
      "step": "registrarConsultaAtendida/revisarConsultaSelecionada",
      "organisms": [
        "detalheConsulta",
        "acoesAgenda"
      ],
      "functions": []
    }
  ],
  "rules": {
    "load": [],
    "loadAgendaProfissional": [],
    "registrarAtendimento": [
      "transicoesConsultaValidas",
      "atendimentoExigeAnotacao"
    ]
  },
  "access": {
    "actors": [
      "profissional"
    ],
    "grants": [
      "consultarPropriaAgenda",
      "consultarPacientesDaPropriaAgenda"
    ]
  }
} as const;
