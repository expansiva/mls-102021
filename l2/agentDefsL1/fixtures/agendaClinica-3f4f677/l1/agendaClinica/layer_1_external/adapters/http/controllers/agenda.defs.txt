/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "agenda",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts"
  ],
  "data": {
    "pageId": "agenda",
    "handlers": [
      {
        "route": "agendaClinica.agenda.cmdRegistrarAtendimento",
        "kind": "command",
        "usecaseId": "registrarAtendimento",
        "grantIds": [
          "profissionalAgendaPropria"
        ]
      },
      {
        "route": "agendaClinica.agenda.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "profissionalAgendaPropria"
        ]
      }
    ]
  }
} as const;

export default definition;
