/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "consultas_profissional",
  "moduleName": "agendaClinica",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/httpController/consultas_profissional",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_profissional.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas_profissional.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/listConsulta",
      "102047/agendaClinica/usecase/registrarAtendimento"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.consultas_profissional.cmdRegistrarAtendimento",
      "agendaClinica.consultas_profissional.qryListConsulta"
    ]
  }
] as const;
