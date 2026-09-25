/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "pacientes",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts"
  ],
  "data": {
    "pageId": "pacientes",
    "handlers": [
      {
        "route": "agendaClinica.pacientes.cmdCreateConsulta",
        "kind": "command",
        "usecaseId": "createConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.pacientes.cmdCreatePaciente",
        "kind": "command",
        "usecaseId": "createPaciente",
        "grantIds": [
          "recepcionistaCadastroPacientes"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListPaciente",
        "kind": "query",
        "usecaseId": "listPaciente",
        "grantIds": [
          "recepcionistaCadastroPacientes"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListProfissional",
        "kind": "query",
        "usecaseId": "listProfissional",
        "grantIds": [
          "recepcionistaLocalizarProfissionais"
        ]
      }
    ]
  }
} as const;

export default definition;
