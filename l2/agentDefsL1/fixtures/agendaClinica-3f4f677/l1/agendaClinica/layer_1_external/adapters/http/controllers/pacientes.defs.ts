/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "pacientes",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts"
  ],
  "data": {
    "pageId": "pacientes",
    "handlers": [
      {
        "route": "agendaClinica.pacientes.cmdCreatePaciente",
        "kind": "command",
        "usecaseId": "createPaciente",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListPaciente",
        "kind": "query",
        "usecaseId": "listPaciente",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      }
    ]
  }
} as const;

export default definition;
