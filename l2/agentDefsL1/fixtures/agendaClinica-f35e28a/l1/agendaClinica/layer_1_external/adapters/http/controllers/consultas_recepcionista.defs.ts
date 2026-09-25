/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_recepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "consultas_recepcionista",
  "moduleName": "agendaClinica",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/httpController/consultas_recepcionista",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_recepcionista.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_recepcionista.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/confirmarConsulta",
      "102047/agendaClinica/usecase/createConsulta",
      "102047/agendaClinica/usecase/listConsulta",
      "102047/agendaClinica/usecase/listPaciente",
      "102047/agendaClinica/usecase/listProfissional",
      "102047/agendaClinica/usecase/registrarFalta"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.consultas_recepcionista.cmdConfirmarConsulta",
      "agendaClinica.consultas_recepcionista.cmdCreateConsulta",
      "agendaClinica.consultas_recepcionista.cmdRegistrarFalta",
      "agendaClinica.consultas_recepcionista.qryListConsulta",
      "agendaClinica.consultas_recepcionista.qryListPaciente",
      "agendaClinica.consultas_recepcionista.qryListProfissional"
    ]
  }
] as const;
