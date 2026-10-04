/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/profissionais_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "profissionalId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:detalheProfissional",
        "persist": true
      },
      "search": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProfissionais",
        "persist": true
      },
      "page": {
        "type": "number",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaProfissionais",
        "persist": true
      }
    }
  },
  "forms": {},
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "profissionaisRecepcao"
      ]
    },
    "loadProfissionaisRecepcao": {
      "kind": "qry",
      "trigger": "loadProfissionaisRecepcao",
      "returns": [
        "profissionaisRecepcao"
      ]
    }
  },
  "states": {
    "profissionaisRecepcao": {
      "source": "load.profissionaisRecepcao",
      "description": "Profissionais disponíveis para localização e seleção."
    },
    "detalheProfissional": {
      "source": "entry.params.profissionalId",
      "description": "Profissional selecionado na lista."
    },
    "search": {
      "source": "entry.params.search",
      "description": "Termo de busca de profissionais."
    },
    "page": {
      "source": "entry.params.page",
      "description": "Página atual da lista de profissionais."
    }
  },
  "functions": {
    "load": {
      "description": "Carrega a primeira página de profissionais para recepção.",
      "calls": "load",
      "sets": "profissionaisRecepcao",
      "updates": []
    },
    "filterListaProfissionais": {
      "description": "Recarrega a lista de profissionais conforme a busca e a página.",
      "calls": "loadProfissionaisRecepcao",
      "sets": "profissionaisRecepcao",
      "updates": []
    },
    "loadMoreListaProfissionais": {
      "description": "Anexa a próxima página de profissionais à lista.",
      "calls": "loadProfissionaisRecepcao",
      "sets": "profissionaisRecepcao",
      "updates": []
    },
    "irParaConsultas": {
      "description": "Navega para as consultas do profissional selecionado.",
      "navigate": "consultas_recepcao",
      "carries": {
        "profissionalId": "detalheProfissional.id"
      }
    }
  },
  "journeys": [
    {
      "step": "agendarConsulta/localizarPaciente",
      "organisms": [],
      "functions": [],
      "continuesIn": "consultas_recepcao"
    },
    {
      "step": "agendarConsulta/localizarProfissional",
      "organisms": [
        "listaProfissionais",
        "detalheProfissional"
      ],
      "functions": [
        "load",
        "filterListaProfissionais",
        "loadMoreListaProfissionais",
        "irParaConsultas"
      ]
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
    }
  ],
  "rules": {
    "load": [],
    "loadProfissionaisRecepcao": []
  },
  "access": {
    "actors": [
      "recepcionista"
    ],
    "grants": [
      "consultarProfissionaisParaAgenda"
    ]
  }
} as const;
