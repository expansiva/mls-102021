/// <mls fileReference="_102047_/l2/comandaRestaurante/web/shared/mesas.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "mesaId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "select:mesaForm",
        "persist": true
      }
    }
  },
  "forms": {
    "createMesa": {
      "organism": "mesaForm",
      "submit": "createMesa"
    },
    "updateMesa": {
      "organism": "mesaForm",
      "submit": "updateMesa"
    }
  },
  "requests": {
    "carregarMesas": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "mesas"
      ]
    },
    "criarMesa": {
      "kind": "cmd",
      "trigger": "createMesa",
      "returns": [
        "mesa"
      ],
      "writes": "Mesa.create"
    },
    "atualizarMesa": {
      "kind": "cmd",
      "trigger": "updateMesa",
      "returns": [
        "mesa"
      ],
      "writes": "Mesa.update"
    }
  },
  "states": {
    "mesas": {
      "source": "carregarMesas.mesas",
      "description": "Dados completos de uma mesa necessários para exibir a lista da casa, preencher a seleção no formulário e redesenhar a página após manutenção."
    },
    "selectedMesa": {
      "source": "entry.params.mesaId",
      "description": "Dados completos de uma mesa necessários para exibir a lista da casa, preencher a seleção no formulário e redesenhar a página após manutenção."
    }
  },
  "functions": {
    "carregarMesas": {
      "description": "Carrega as mesas da casa para o caixa consultar seus códigos, conferir a disponibilidade e selecionar uma mesa para manutenção.",
      "calls": "carregarMesas",
      "sets": "mesas"
    },
    "criarMesa": {
      "description": "Cadastra uma mesa para a operação do restaurante e devolve seu estado completo para redesenhar a página. (mesas: upsert)",
      "calls": "criarMesa",
      "updates": [
        "mesas"
      ]
    },
    "atualizarMesa": {
      "description": "Atualiza o código da mesa selecionada e devolve seu estado completo e corrente para redesenhar a página. (mesas: upsert)",
      "calls": "atualizarMesa",
      "updates": [
        "mesas"
      ]
    }
  },
  "journeys": [],
  "rules": {
    "carregarMesas": [],
    "criarMesa": [],
    "atualizarMesa": []
  },
  "access": {
    "actors": [
      "caixa"
    ],
    "grants": [
      "caixaFechamentoEcadastroOperacional"
    ]
  }
} as const;
