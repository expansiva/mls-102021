/// <mls fileReference="_102047_/l2/tarefas/web/shared/participantes.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "busca": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listaParticipantes",
        "persist": true,
        "required": false
      },
      "participanteId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:formParticipante",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "listarParticipantes": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "participantes"
      ]
    },
    "buscarUsuarios": {
      "kind": "qry",
      "trigger": "buscarUsuarios",
      "returns": [
        "usuarios"
      ]
    },
    "incluirParticipante": {
      "kind": "cmd",
      "trigger": "incluirParticipante",
      "returns": [
        "participante"
      ],
      "writes": "Participante.create"
    },
    "salvarMarcas": {
      "kind": "cmd",
      "trigger": "salvarMarcas",
      "returns": [
        "participante"
      ],
      "writes": "Participante.update"
    }
  },
  "states": {
    "participantes": {
      "source": "listarParticipantes.participantes",
      "description": "the list of Usuário da organização que participa do módulo de tarefas, com sua situação, papéis, as marcas do gestor e as marcas efetivas de aceitar e criar tarefas.",
      "organisms": [
        "listaParticipantes"
      ]
    },
    "usuarios": {
      "source": "buscarUsuarios.usuarios",
      "description": "the list of Usuário ativo da organização que ainda não participa do módulo de tarefas, identificado apenas pelo nome lido da plataforma.",
      "organisms": [
        "formParticipante"
      ]
    },
    "selectedParticipante": {
      "source": "entry.params.participanteId",
      "description": "the id of the Participante selected in listaParticipantes",
      "organisms": [
        "formParticipante",
        "listaParticipantes"
      ]
    }
  },
  "journeys": [
    {
      "step": "configurarParticipantes/localizarUsuario",
      "organisms": [
        "formParticipante",
        "listaParticipantes"
      ]
    },
    {
      "step": "configurarParticipantes/incluirParticipante",
      "organisms": [
        "formParticipante"
      ]
    },
    {
      "step": "configurarParticipantes/marcarPermissoes",
      "organisms": [
        "listaParticipantes",
        "formParticipante"
      ]
    }
  ],
  "rules": [
    "escolhaGestorNuncaSobrescrita",
    "gestorPorAcessoPlataforma",
    "participanteNaoConfiguradoAceitaECria",
    "participanteSemCadastroPessoal"
  ],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorParticipantes"
    ]
  }
} as const;
