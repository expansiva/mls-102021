/// <mls fileReference="_102047_/l4/agendaClinica/journeys/agendarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const agendarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "agendarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Agendar consulta",
    "goal": "Marcar uma consulta de um paciente com um profissional em data e horário disponíveis.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPaciente",
        "kind": "locate",
        "entity": "Paciente",
        "title": "x",
        "description": "Localiza o paciente que receberá o atendimento."
      },
      {
        "stepId": "localizarProfissional",
        "kind": "locate",
        "entity": "Profissional",
        "title": "x",
        "description": "Localiza o profissional que realizará a consulta."
      },
      {
        "stepId": "criarConsulta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "create",
        "title": "x",
        "description": "Agenda a consulta para o paciente e o profissional selecionados, informando data e horário; o horário do profissional precisa estar disponível."
      }
    ],
    "outcome": {
      "statement": "A consulta fica agendada para o paciente, profissional, data e horário definidos.",
      "evidence": [
        "Consulta criada com paciente, profissional, data e horário.",
        "Horário passa a constar na agenda do profissional."
      ]
    }
  },
  "businessHash": "sha256:4acb7113f492c8dfb7dc1ac5c3298cb918796926c713056f807c402573811920"
} as const satisfies Ns5JourneyArtifact;

export type AgendarConsultaJourneyType = typeof agendarConsultaJourney;

export default agendarConsultaJourney;
