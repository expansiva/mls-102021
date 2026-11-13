/// <mls fileReference="_102047_/l2/tarefas/web/shared/listas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "texto": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:listasCadastradas",
        "persist": true,
        "required": false
      },
      "listaTarefasId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:formularioLista",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "qryListasTarefas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "listas"
      ]
    },
    "cmdCriarLista": {
      "kind": "cmd",
      "trigger": "criarLista",
      "returns": [
        "lista"
      ],
      "writes": "ListaTarefas.create"
    },
    "cmdSalvarLista": {
      "kind": "cmd",
      "trigger": "salvarLista",
      "returns": [
        "lista"
      ],
      "writes": "ListaTarefas.update"
    }
  },
  "states": {
    "listas": {
      "source": "qryListasTarefas.listas",
      "description": "the list of Lista de tarefas que agrupa tarefas por projeto ou área, com nome, descrição e quantidade de tarefas abertas.",
      "organisms": [
        "formularioLista",
        "listasCadastradas"
      ]
    },
    "selectedListaTarefas": {
      "source": "entry.params.listaTarefasId",
      "description": "the id of the ListaTarefas selected in listasCadastradas",
      "organisms": [
        "formularioLista",
        "listasCadastradas"
      ]
    }
  },
  "journeys": [
    {
      "step": "manterListas/localizarLista",
      "organisms": [
        "listasCadastradas"
      ]
    },
    {
      "step": "manterListas/criarLista",
      "organisms": [
        "formularioLista"
      ]
    },
    {
      "step": "manterListas/editarLista",
      "organisms": [
        "listasCadastradas",
        "formularioLista"
      ]
    }
  ],
  "rules": [
    "nomeListaUnico",
    "somenteGestorMantemListas",
    "tarefaAbertaVencimento"
  ],
  "access": {
    "actors": [
      "gestor"
    ],
    "grants": [
      "gestorListas"
    ]
  }
} as const;
