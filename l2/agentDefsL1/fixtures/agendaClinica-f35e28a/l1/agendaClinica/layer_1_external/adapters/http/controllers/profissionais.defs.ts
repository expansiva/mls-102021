/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/profissionais.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "profissionais",
  "moduleName": "agendaClinica",
  "data": {
    "pageId": "profissionais",
    "handlers": [
      {
        "route": "agendaClinica.profissionais.cmdCreateConsulta",
        "kind": "command",
        "usecaseId": "createConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListConsulta",
        "kind": "query",
        "usecaseId": "listConsulta",
        "grantIds": [
          "recepcionistaAgendaConsultas"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListPaciente",
        "kind": "query",
        "usecaseId": "listPaciente",
        "grantIds": [
          "recepcionistaCadastroPacientes"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListProfissional",
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
    "id": "102047/agendaClinica/httpController/profissionais",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/profissionais.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/profissionais.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/createConsulta",
      "102047/agendaClinica/usecase/listConsulta",
      "102047/agendaClinica/usecase/listPaciente",
      "102047/agendaClinica/usecase/listProfissional"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.profissionais.cmdCreateConsulta",
      "agendaClinica.profissionais.qryListConsulta",
      "agendaClinica.profissionais.qryListPaciente",
      "agendaClinica.profissionais.qryListProfissional"
    ]
  }
] as const;
