/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "consultas_profissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts"
  ],
  "data": {
    "pageId": "consultas_profissional",
    "handlers": [
      {
        "route": "agendaClinica.consultas_profissional.cmdRegistrarAtendimento",
        "kind": "command",
        "usecaseId": "registrarAtendimento",
        "grantIds": [
          "profissionalAgendaDiaria"
        ]
      },
      {
        "route": "agendaClinica.consultas_profissional.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "profissionalAgendaDiaria"
        ]
      }
    ]
  }
} as const;

export default definition;
