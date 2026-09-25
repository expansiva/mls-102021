/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "dados_profissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts"
  ],
  "data": {
    "pageId": "dados_profissional",
    "handlers": [
      {
        "route": "agendaClinica.dados_profissional.cmdCreateProfissional",
        "kind": "command",
        "usecaseId": "createProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
        "kind": "command",
        "usecaseId": "updateProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_profissional.qryListProfissional",
        "kind": "query",
        "usecaseId": "listProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      }
    ]
  }
} as const;

export default definition;
