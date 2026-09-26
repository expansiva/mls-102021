/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/integration/outbound.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "integrationOutbound",
  "artifactId": "outbound",
  "moduleName": "agendaClinica",
  "data": {
    "integrationId": "outbound",
    "events": [
      {
        "eventId": "atendimentoRegistrado",
        "on": "Consulta.registrarAtendimento",
        "entityId": "Consulta",
        "mechanism": "",
        "consumer": "registrarAtendimento"
      },
      {
        "eventId": "consultaConfirmada",
        "on": "Consulta.confirmarConsulta",
        "entityId": "Consulta",
        "mechanism": "",
        "consumer": "confirmarConsulta"
      },
      {
        "eventId": "faltaPacienteRegistrada",
        "on": "Consulta.registrarFalta",
        "entityId": "Consulta",
        "mechanism": "",
        "consumer": "registrarFalta"
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/integrationOutbound/outbound",
    "type": "integrationOutbound",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/integration/outbound.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/integration/outbound.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/confirmarConsulta",
      "102047/agendaClinica/usecase/registrarAtendimento",
      "102047/agendaClinica/usecase/registrarFalta"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/integrationOutbound.md"
    ]
  }
] as const;
