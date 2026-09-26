/// <mls fileReference="_102047_/l4/agendaClinica/journeys/agendarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const agendarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "agendarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Agendar consulta",
    "goal": "Marcar uma consulta para um paciente com um profissional em data e horário disponíveis.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarPacienteParaAgendamento",
        "kind": "locate",
        "entity": "Paciente",
        "title": "x",
        "description": "Localiza o paciente que receberá a consulta."
      },
      {
        "stepId": "localizarProfissional",
        "kind": "locate",
        "entity": "Profissional",
        "title": "x",
        "description": "Localiza o médico ou terapeuta que realizará a consulta."
      },
      {
        "stepId": "consultarDisponibilidade",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Consulta os horários já ocupados do profissional na data pretendida."
      },
      {
        "stepId": "criarConsulta",
        "kind": "act",
        "entity": "Consulta",
        "effect": "create",
        "title": "x",
        "description": "Registra a consulta para o paciente e o profissional selecionados, com data e hora. O agendamento somente é concluído se não houver outra consulta do mesmo profissional no mesmo horário."
      }
    ],
    "outcome": {
      "statement": "A consulta fica marcada em um horário disponível do profissional.",
      "evidence": [
        "Consulta criada com paciente, profissional, data e hora.",
        "Não há outra consulta do profissional no mesmo horário."
      ]
    }
  },
  "businessHash": "sha256:92c7882e6189d1b4c7692c0e14545635cf3bd5f909a1437cbbf2b35545383c77"
} as const satisfies Ns5JourneyArtifact;

export type AgendarConsultaJourneyType = typeof agendarConsultaJourney;

export default agendarConsultaJourney;
