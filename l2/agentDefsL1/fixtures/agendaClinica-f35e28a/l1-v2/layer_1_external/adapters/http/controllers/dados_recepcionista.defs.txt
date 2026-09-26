/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_recepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "dados_recepcionista",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createRecepcionista.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listRecepcionista.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/updateRecepcionista.defs.ts"
  ],
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
