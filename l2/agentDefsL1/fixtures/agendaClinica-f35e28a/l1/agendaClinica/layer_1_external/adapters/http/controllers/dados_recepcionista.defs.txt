/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_recepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "dados_recepcionista",
  "moduleName": "agendaClinica",
  "data": {
    "pageId": "dados_recepcionista",
    "handlers": [
      {
        "route": "agendaClinica.dados_recepcionista.cmdCreateProfissional",
        "kind": "command",
        "usecaseId": "createProfissional",
        "grantIds": [
          "recepcionistaLocalizarProfissionais"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdCreateRecepcionista",
        "kind": "command",
        "usecaseId": "createRecepcionista",
        "grantIds": [
          "recepcionistaProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
        "kind": "command",
        "usecaseId": "updateProfissional",
        "grantIds": [
          "recepcionistaLocalizarProfissionais"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdUpdateRecepcionista",
        "kind": "command",
        "usecaseId": "updateRecepcionista",
        "grantIds": [
          "recepcionistaProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.qryListProfissional",
        "kind": "query",
        "usecaseId": "listProfissional",
        "grantIds": [
          "recepcionistaLocalizarProfissionais"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.qryListRecepcionista",
        "kind": "query",
        "usecaseId": "listRecepcionista",
        "grantIds": [
          "recepcionistaProprioCadastro"
        ]
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/httpController/dados_recepcionista",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_recepcionista.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_recepcionista.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createRecepcionista.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listRecepcionista.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/updateRecepcionista.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/createProfissional",
      "102047/agendaClinica/usecase/createRecepcionista",
      "102047/agendaClinica/usecase/listProfissional",
      "102047/agendaClinica/usecase/listRecepcionista",
      "102047/agendaClinica/usecase/updateProfissional",
      "102047/agendaClinica/usecase/updateRecepcionista"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.dados_recepcionista.cmdCreateProfissional",
      "agendaClinica.dados_recepcionista.cmdCreateRecepcionista",
      "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
      "agendaClinica.dados_recepcionista.cmdUpdateRecepcionista",
      "agendaClinica.dados_recepcionista.qryListProfissional",
      "agendaClinica.dados_recepcionista.qryListRecepcionista"
    ]
  }
] as const;
