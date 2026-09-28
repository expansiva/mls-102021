/// <mls fileReference="_102047_/l4/agendaClinica/journeys/consultarAgendaDiaria.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const consultarAgendaDiariaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarAgendaDiaria",
  "business": {
    "actorRef": "profissional",
    "title": "Consultar agenda diária",
    "goal": "Ver as próprias consultas do dia.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarConsultasDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza as consultas do dia atribuídas ao próprio profissional."
      },
      {
        "stepId": "inspecionarAgendaDiaria",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Consulta os dados das próprias consultas agendadas para o dia."
      }
    ],
    "outcome": {
      "statement": "O profissional visualiza sua agenda diária.",
      "evidence": [
        "Lista das consultas do dia atribuídas ao profissional."
      ]
    }
  },
  "businessHash": "sha256:b2e7e9e057958fdba74e485548382294dcfd94153b56e3b311a58177458852e1"
} as const satisfies Ns5JourneyArtifact;

export type ConsultarAgendaDiariaJourneyType = typeof consultarAgendaDiariaJourney;

export default consultarAgendaDiariaJourney;
