/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/integration/outbound.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "integrationOutbound",
  "artifactId": "outbound",
  "moduleName": "agendaClinica",
  "status": "blocked",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts"
  ],
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
