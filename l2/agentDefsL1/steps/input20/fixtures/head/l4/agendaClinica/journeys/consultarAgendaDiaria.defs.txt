/// <mls fileReference="_102047_/l4/agendaClinica/journeys/consultarAgendaDiaria.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarAgendaDiariaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarAgendaDiaria",
  "business": {
    "actorRef": "profissional",
    "title": "Consultar agenda diária",
    "goal": "Visualizar apenas as próprias consultas do dia.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMinhasConsultasDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza as consultas do dia vinculadas ao próprio profissional."
      },
      {
        "stepId": "inspecionarAgendaDiaria",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Consulta os horários e os dados necessários das próprias consultas do dia."
      }
    ],
    "outcome": {
      "statement": "O profissional visualiza sua agenda diária sem acesso às agendas dos demais profissionais.",
      "evidence": [
        "Lista de consultas do dia vinculadas ao profissional autenticado."
      ]
    }
  },
  "businessHash": "sha256:bc8e664418886361b0408161bcf6aa7e1ac00567d16857b3f86e448fac84ebf0"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarAgendaDiariaJourneyType = typeof consultarAgendaDiariaJourney;

export default consultarAgendaDiariaJourney;
