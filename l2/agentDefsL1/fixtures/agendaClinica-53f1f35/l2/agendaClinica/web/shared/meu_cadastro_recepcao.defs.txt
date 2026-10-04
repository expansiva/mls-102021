/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/meu_cadastro_recepcao.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "docId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:ownReceptionistForm",
        "persist": false
      }
    }
  },
  "forms": {
    "createOwnReceptionist": {
      "organism": "ownReceptionistForm",
      "submit": "createOwnReceptionist"
    },
    "updateOwnReceptionist": {
      "organism": "ownReceptionistForm",
      "submit": "updateOwnReceptionist"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "recepcionista"
      ]
    },
    "createOwnReceptionist": {
      "kind": "cmd",
      "trigger": "createOwnReceptionist",
      "returns": [
        "recepcionista"
      ],
      "writes": "Recepcionista.create"
    },
    "updateOwnReceptionist": {
      "kind": "cmd",
      "trigger": "updateOwnReceptionist",
      "returns": [
        "recepcionista"
      ],
      "writes": "Recepcionista.update"
    }
  },
  "states": {
    "ownReceptionist": {
      "source": "load.recepcionista",
      "description": "Current receptionist profile."
    },
    "docId": {
      "source": "entry.params.docId",
      "description": "Prefilled receptionist document identifier."
    }
  },
  "functions": {
    "load": {
      "description": "Loads the receptionist profile.",
      "calls": "load",
      "sets": "ownReceptionist"
    },
    "createOwnReceptionist": {
      "description": "Creates the receptionist profile.",
      "calls": "createOwnReceptionist",
      "sets": "ownReceptionist",
      "updates": [
        "ownReceptionist"
      ]
    },
    "updateOwnReceptionist": {
      "description": "Updates the receptionist profile.",
      "calls": "updateOwnReceptionist",
      "sets": "ownReceptionist",
      "updates": [
        "ownReceptionist"
      ]
    }
  },
  "journeys": [],
  "rules": {
    "load": [],
    "createOwnReceptionist": [],
    "updateOwnReceptionist": []
  },
  "access": {
    "actors": [
      "recepcionista"
    ],
    "grants": [
      "consultarProprioCadastroRecepcao"
    ]
  }
} as const;
