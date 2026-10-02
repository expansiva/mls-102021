/// <mls fileReference="_102047_/l2/agendaClinica/web/shared/meu_cadastro_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "docId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:professionalForm",
        "persist": false
      }
    }
  },
  "forms": {
    "persistProfessionalCreate": {
      "organism": "professionalForm",
      "submit": "persistProfessionalCreate"
    },
    "persistProfessionalUpdate": {
      "organism": "professionalForm",
      "submit": "persistProfessionalUpdate"
    }
  },
  "requests": {
    "load": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "profissionaisRecepcao"
      ]
    },
    "persistProfessionalCreate": {
      "kind": "cmd",
      "trigger": "persistProfessionalCreate",
      "returns": [
        "profissional"
      ],
      "writes": "Profissional.create"
    },
    "persistProfessionalUpdate": {
      "kind": "cmd",
      "trigger": "persistProfessionalUpdate",
      "returns": [
        "profissional"
      ],
      "writes": "Profissional.update"
    }
  },
  "states": {
    "professionalDocumentId": {
      "source": "entry.params.docId",
      "description": "Professional document identifier prefill."
    },
    "professional": {
      "source": "load.profissionaisRecepcao",
      "description": "Professional profile details."
    }
  },
  "functions": {
    "load": {
      "description": "Load the professional profile.",
      "calls": "load",
      "sets": "professional",
      "updates": []
    },
    "persistProfessionalCreate": {
      "description": "Create the professional profile.",
      "calls": "persistProfessionalCreate",
      "sets": "professional",
      "updates": []
    },
    "persistProfessionalUpdate": {
      "description": "Update the professional profile.",
      "calls": "persistProfessionalUpdate",
      "sets": "professional",
      "updates": []
    },
    "openOwnAgenda": {
      "description": "Open the professional agenda.",
      "navigate": "agenda_profissional"
    }
  },
  "journeys": [],
  "rules": {
    "load": [],
    "persistProfessionalCreate": [],
    "persistProfessionalUpdate": []
  },
  "access": {
    "actors": [
      "profissional"
    ],
    "grants": [
      "consultarProprioCadastroProfissional"
    ]
  }
} as const;
