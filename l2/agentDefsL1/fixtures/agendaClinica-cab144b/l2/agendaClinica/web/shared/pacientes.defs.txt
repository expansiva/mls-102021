/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "pacienteId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:patientDetail",
        "persist": true
      },
      "search": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:patientList",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:patientList",
        "persist": true
      },
      "docId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:patientForm",
        "persist": false
      }
    }
  },
  "forms": {
    "submitPatientCreate": {
      "organism": "patientForm",
      "submit": "submitPatientCreate"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "pacientes"
      ]
    },
    "loadPacientes": {
      "kind": "qry",
      "trigger": "loadPacientes",
      "returns": [
        "pacientes"
      ]
    },
    "loadPaciente": {
      "kind": "qry",
      "trigger": "loadPaciente",
      "returns": [
        "paciente"
      ]
    },
    "submitPatientCreate": {
      "kind": "cmd",
      "trigger": "submitPatientCreate",
      "returns": [
        "paciente"
      ],
      "writes": "Paciente.create"
    }
  },
  "states": {
    "pacientes": {
      "source": "load.pacientes",
      "description": "Lista paginada de pacientes."
    },
    "termoBusca": {
      "source": "entry.params.search",
      "description": "Termo de busca de pacientes."
    },
    "paginaPacientes": {
      "source": "entry.params.page",
      "description": "Página solicitada da lista de pacientes."
    },
    "pacienteSelecionado": {
      "source": "entry.params.pacienteId",
      "description": "Paciente selecionado pelo identificador."
    },
    "documentoPreenchido": {
      "source": "entry.params.docId",
      "description": "Documento para preenchimento inicial do cadastro."
    },
    "dadosPaciente": {
      "source": "submitPatientCreate.input",
      "description": "Dados informados para cadastro do paciente."
    },
    "pacienteDetalhe": {
      "source": "loadPaciente.paciente",
      "description": "Dados detalhados do paciente selecionado."
    },
    "pacienteCriado": {
      "source": "submitPatientCreate.paciente",
      "description": "Paciente criado."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega a primeira página de pacientes.",
      "calls": "load",
      "sets": "pacientes"
    },
    "filterPatientList": {
      "description": "Recarrega a lista de pacientes conforme busca e página.",
      "calls": "loadPacientes",
      "sets": "pacientes"
    },
    "loadMorePatientList": {
      "description": "Acrescenta a próxima página de pacientes.",
      "calls": "loadPacientes",
      "sets": "pacientes"
    },
    "submitPatientCreate": {
      "description": "Cadastra o paciente informado.",
      "calls": "submitPatientCreate",
      "sets": "pacienteCriado",
      "updates": [
        "pacientes"
      ]
    },
    "loadPaciente": {
      "description": "Carrega os dados detalhados do paciente selecionado.",
      "calls": "loadPaciente",
      "sets": "pacienteDetalhe"
    },
    "openConsultas": {
      "description": "Abre as consultas do paciente selecionado.",
      "navigate": "consultas_recepcao",
      "carries": {
        "pacienteId": "pacienteSelecionado.id"
      }
    }
  },
  "journeys": [
    {
      "step": "agendarConsulta/localizarPaciente",
      "organisms": [
        "patientList",
        "patientActions"
      ],
      "functions": [
        "openConsultas"
      ]
    },
    {
      "step": "agendarConsulta/localizarProfissional",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "agendarConsulta/registrarAgendamento",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "agendarConsulta/verificarHorarioDisponivel",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "cadastrarPaciente/informarDadosPaciente",
      "organisms": [
        "patientForm",
        "patientActions"
      ],
      "functions": [
        "submitPatientCreate"
      ]
    },
    {
      "step": "confirmarConsulta/consultarContatoPaciente",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "confirmarConsulta/localizarConsultaParaConfirmacao",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "confirmarConsulta/registrarConfirmacao",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    }
  ],
  "rules": {
    "load": [],
    "loadPacientes": [],
    "loadPaciente": [],
    "submitPatientCreate": []
  },
  "access": {
    "actors": [
      "recepcionista"
    ],
    "grants": [
      "cadastrarPacientes",
      "consultarCanaisDosPacientes"
    ]
  }
} as const;
