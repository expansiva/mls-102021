/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/consultas_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "profissionalId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:Profissional",
        "persist": true
      },
      "consultaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:acoesConsulta",
        "persist": true
      },
      "pacienteId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaConsultas",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaConsultas",
        "persist": true
      }
    }
  },
  "forms": {
    "registrarAgendamento": {
      "organism": "formularioConsulta",
      "submit": "registrarAgendamento"
    },
    "registrarConfirmacao": {
      "organism": "formularioConsulta",
      "submit": "registrarConfirmacao"
    },
    "registrarFalta": {
      "organism": "formularioConsulta",
      "submit": "registrarFalta"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "consultasRecepcao",
        "pacientes",
        "profissionaisRecepcao"
      ]
    },
    "loadConsultasRecepcao": {
      "kind": "qry",
      "trigger": "loadConsultasRecepcao",
      "returns": [
        "consultasRecepcao"
      ]
    },
    "loadConsulta": {
      "kind": "qry",
      "trigger": "loadConsulta",
      "returns": [
        "consulta"
      ]
    },
    "registrarAgendamento": {
      "kind": "cmd",
      "trigger": "registrarAgendamento",
      "returns": [
        "consulta"
      ],
      "writes": "Consulta.create"
    },
    "registrarConfirmacao": {
      "kind": "cmd",
      "trigger": "registrarConfirmacao",
      "returns": [
        "consulta"
      ],
      "writes": "Consulta.confirmarConsulta"
    },
    "registrarFalta": {
      "kind": "cmd",
      "trigger": "registrarFalta",
      "returns": [
        "consulta"
      ],
      "writes": "Consulta.registrarFalta"
    }
  },
  "states": {
    "consultasRecepcao": {
      "source": "load.consultasRecepcao",
      "description": "Lista paginada de consultas da recepção."
    },
    "pacientes": {
      "source": "load.pacientes",
      "description": "Pacientes disponíveis para identificação e agendamento."
    },
    "profissionaisRecepcao": {
      "source": "load.profissionaisRecepcao",
      "description": "Profissionais disponíveis para a agenda."
    },
    "profissionalSelecionado": {
      "source": "entry.params.profissionalId",
      "description": "Profissional selecionado pelo identificador de entrada."
    },
    "consultaSelecionada": {
      "source": "entry.params.consultaId",
      "description": "Consulta selecionada pelo identificador de entrada."
    },
    "pacienteFiltro": {
      "source": "entry.params.pacienteId",
      "description": "Paciente usado para filtrar a lista de consultas."
    },
    "paginaConsultas": {
      "source": "entry.params.page",
      "description": "Página solicitada da lista de consultas."
    },
    "consultaDetalhada": {
      "source": "loadConsulta.consulta",
      "description": "Consulta carregada para consulta detalhada e ações."
    },
    "dadosAgendamento": {
      "source": "registrarAgendamento.input",
      "description": "Dados informados para registrar o agendamento."
    },
    "consultaAgendada": {
      "source": "registrarAgendamento.consulta",
      "description": "Consulta criada pelo agendamento."
    },
    "consultaConfirmada": {
      "source": "registrarConfirmacao.consulta",
      "description": "Consulta atualizada pela confirmação."
    },
    "consultaFaltante": {
      "source": "registrarFalta.consulta",
      "description": "Consulta atualizada com o registro de falta."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega consultas, pacientes e profissionais da recepção.",
      "calls": "load",
      "sets": "consultasRecepcao",
      "updates": [
        "pacientes",
        "profissionaisRecepcao"
      ]
    },
    "filterListaConsultas": {
      "description": "Recarrega a primeira página de consultas conforme os filtros.",
      "calls": "loadConsultasRecepcao",
      "sets": "consultasRecepcao"
    },
    "loadMoreListaConsultas": {
      "description": "Acrescenta a próxima página de consultas à lista.",
      "calls": "loadConsultasRecepcao",
      "sets": "consultasRecepcao"
    },
    "registrarAgendamento": {
      "description": "Registra uma nova consulta agendada.",
      "calls": "registrarAgendamento",
      "sets": "consultaAgendada",
      "updates": [
        "consultasRecepcao",
        "consultaSelecionada",
        "consultaDetalhada"
      ]
    },
    "registrarConfirmacao": {
      "description": "Confirma a consulta selecionada.",
      "calls": "registrarConfirmacao",
      "sets": "consultaConfirmada",
      "updates": [
        "consultasRecepcao",
        "consultaSelecionada",
        "consultaDetalhada"
      ]
    },
    "registrarFalta": {
      "description": "Registra a falta do paciente na consulta selecionada.",
      "calls": "registrarFalta",
      "sets": "consultaFaltante",
      "updates": [
        "consultasRecepcao",
        "consultaSelecionada",
        "consultaDetalhada"
      ]
    },
    "carregarConsulta": {
      "description": "Carrega a consulta selecionada para visualização detalhada.",
      "calls": "loadConsulta",
      "sets": "consultaDetalhada"
    }
  },
  "journeys": [
    {
      "step": "agendarConsulta/localizarPaciente",
      "organisms": [
        "formularioConsulta"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "agendarConsulta/localizarProfissional",
      "organisms": [
        "formularioConsulta"
      ],
      "functions": [
        "load"
      ]
    },
    {
      "step": "agendarConsulta/verificarHorarioDisponivel",
      "organisms": [
        "listaConsultas",
        "formularioConsulta"
      ],
      "functions": [
        "filterListaConsultas"
      ]
    },
    {
      "step": "agendarConsulta/registrarAgendamento",
      "organisms": [
        "formularioConsulta"
      ],
      "functions": [
        "registrarAgendamento"
      ]
    },
    {
      "step": "confirmarConsulta/localizarConsultaParaConfirmacao",
      "organisms": [
        "listaConsultas",
        "detalheConsulta"
      ],
      "functions": [
        "carregarConsulta"
      ]
    },
    {
      "step": "confirmarConsulta/consultarContatoPaciente",
      "organisms": [
        "detalheConsulta"
      ],
      "functions": [
        "carregarConsulta"
      ]
    },
    {
      "step": "confirmarConsulta/registrarConfirmacao",
      "organisms": [
        "acoesConsulta"
      ],
      "functions": [
        "registrarConfirmacao"
      ]
    },
    {
      "step": "registrarFalta/localizarConsultaDoPaciente",
      "organisms": [
        "listaConsultas",
        "detalheConsulta"
      ],
      "functions": [
        "carregarConsulta"
      ]
    },
    {
      "step": "registrarFalta/conferirConsultaAgendada",
      "organisms": [
        "detalheConsulta",
        "acoesConsulta"
      ],
      "functions": [
        "carregarConsulta"
      ]
    },
    {
      "step": "registrarFalta/marcarFaltaPaciente",
      "organisms": [
        "acoesConsulta"
      ],
      "functions": [
        "registrarFalta"
      ]
    }
  ],
  "rules": {
    "load": [
      "profissionalHorarioUnico"
    ],
    "loadConsultasRecepcao": [
      "profissionalHorarioUnico"
    ],
    "loadConsulta": [
      "transicoesConsultaValidas"
    ],
    "registrarAgendamento": [
      "profissionalHorarioUnico"
    ],
    "registrarConfirmacao": [
      "transicoesConsultaValidas"
    ],
    "registrarFalta": [
      "transicoesConsultaValidas"
    ]
  },
  "access": {
    "actors": [
      "recepcionista"
    ],
    "grants": [
      "cadastrarPacientes",
      "consultarCanaisDosPacientes",
      "organizarAgenda",
      "consultarProfissionaisParaAgenda"
    ]
  }
} as const;
