/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "consultas",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.defs.ts"
  ],
  "data": {
    "pageId": "consultas",
    "handlers": [
      {
        "route": "agendaClinica.consultas.cmdCreateConsulta",
        "kind": "command",
        "usecaseId": "createConsulta",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.consultas.cmdRegistrarFalta",
        "kind": "command",
        "usecaseId": "registrarFalta",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.consultas.cmdUpdateConsulta",
        "kind": "command",
        "usecaseId": "updateConsulta",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.consultas.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.consultas.qryListPaciente",
        "kind": "query",
        "usecaseId": "listPaciente",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      },
      {
        "route": "agendaClinica.consultas.qryListProfissional",
        "kind": "query",
        "usecaseId": "listProfissional",
        "grantIds": [
          "recepcionistaGestaoAgenda"
        ]
      }
    ]
  }
} as const;

export default definition;
