/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "pacientes",
  "moduleName": "agendaClinica",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/httpController/pacientes",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/createConsulta",
      "102047/agendaClinica/usecase/createPaciente",
      "102047/agendaClinica/usecase/listConsulta",
      "102047/agendaClinica/usecase/listPaciente",
      "102047/agendaClinica/usecase/listProfissional"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.pacientes.cmdCreateConsulta",
      "agendaClinica.pacientes.cmdCreatePaciente",
      "agendaClinica.pacientes.qryListConsulta",
      "agendaClinica.pacientes.qryListPaciente",
      "agendaClinica.pacientes.qryListProfissional"
    ]
  }
] as const;
