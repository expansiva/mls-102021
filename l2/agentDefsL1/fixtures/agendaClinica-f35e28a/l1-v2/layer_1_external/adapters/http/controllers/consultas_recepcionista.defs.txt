/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_recepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "consultas_recepcionista",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts"
  ],
  "data": {
    "pageId": "consultas_recepcionista",
    "handlers": [
      {
        "route": "agendaClinica.consultas_recepcionista.cmdConfirmarConsulta",
        "kind": "command",
        "usecaseId": "confirmarConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.consultas_recepcionista.cmdCreateConsulta",
        "kind": "command",
        "usecaseId": "createConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.consultas_recepcionista.cmdRegistrarFalta",
        "kind": "command",
        "usecaseId": "registrarFalta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.consultas_recepcionista.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.consultas_recepcionista.qryListPaciente",
        "kind": "query",
        "usecaseId": "listPaciente",
        "grantIds": [
          "recepcionistaCadastroPacientes"
        ]
      },
      {
        "route": "agendaClinica.consultas_recepcionista.qryListProfissional",
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
