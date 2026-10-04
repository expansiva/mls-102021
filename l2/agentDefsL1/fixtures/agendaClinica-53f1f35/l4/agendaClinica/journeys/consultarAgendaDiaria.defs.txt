/// <mls fileReference="_102047_/l4/agendaClinica/journeys/consultarAgendaDiaria.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarAgendaDiariaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarAgendaDiaria",
  "business": {
    "actorRef": "profissional",
    "title": "Consultar agenda diária",
    "goal": "Visualizar somente as consultas próprias previstas para o dia.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarAgendaDoDia",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar agenda do dia",
        "description": "O profissional visualiza as consultas do dia vinculadas à sua própria agenda."
      },
      {
        "stepId": "consultarDetalhesConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Consultar detalhes da consulta",
        "description": "O profissional consulta os dados necessários de uma consulta da sua agenda diária."
      }
    ],
    "outcome": {
      "statement": "O profissional visualiza sua agenda diária e os detalhes das próprias consultas.",
      "evidence": [
        "A lista apresenta apenas consultas vinculadas ao profissional que acessou o módulo.",
        "Cada consulta da agenda exibe seu horário e paciente."
      ]
    }
  },
  "businessHash": "sha256:829a4a1e5d301c858b7f841216f408fac011de2e533d756c9a98ec989d14c760"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarAgendaDiariaJourneyType = typeof consultarAgendaDiariaJourney;

export default consultarAgendaDiariaJourney;
