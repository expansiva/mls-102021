/// <mls fileReference="_102047_/l4/agendaClinica/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "agendaClinica",
  "inbound": [],
  "outbound": [
    {
      "id": "registrarFalta",
      "kind": "event",
      "to": "any",
      "event": "registrarFalta",
      "on": "Consulta.registrarFalta",
      "description": "Publica o registro de falta do paciente em uma consulta para módulos que precisem acompanhar essa ocorrência.",
      "entityRefs": [
        "Consulta"
      ]
    },
    {
      "id": "registrarAtendimento",
      "kind": "event",
      "to": "any",
      "event": "registrarAtendimento",
      "on": "Consulta.registrarAtendimento",
      "description": "Publica o registro de atendimento concluído para módulos que precisem acompanhar as consultas realizadas.",
      "entityRefs": [
        "Consulta"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type AgendaClinicaIntegrationType = typeof agendaClinicaIntegration;

export default agendaClinicaIntegration;
