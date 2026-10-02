/// <mls fileReference="_102047_/l4/agendaClinica/journeys/agendarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

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
        "stepId": "localizarPaciente",
        "kind": "locate",
        "entity": "Paciente",
        "title": "Localizar paciente",
        "description": "A recepcionista localiza o paciente que receberá a consulta."
      },
      {
        "stepId": "localizarProfissional",
        "kind": "locate",
        "entity": "Profissional",
        "title": "Localizar profissional",
        "description": "A recepcionista localiza o profissional que realizará o atendimento."
      },
      {
        "stepId": "verificarHorarioDisponivel",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Verificar horário disponível",
        "description": "A recepcionista consulta a agenda do profissional para escolher uma data e horário sem outra consulta marcada."
      },
      {
        "stepId": "registrarAgendamento",
        "kind": "act",
        "entity": "Consulta",
        "effect": "create",
        "title": "Registrar agendamento",
        "description": "A recepcionista cria a consulta do paciente com o profissional, na data e horário selecionados."
      }
    ],
    "outcome": {
      "statement": "A consulta fica agendada para o paciente e o profissional.",
      "evidence": [
        "A consulta aparece na agenda do profissional na data e horário marcados.",
        "Não há outra consulta do mesmo profissional no mesmo horário."
      ]
    }
  },
  "businessHash": "sha256:53699b58fdde7bef9defa7a02a363bbbd9a05da3fff27a8c12c77ab1519f201e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AgendarConsultaJourneyType = typeof agendarConsultaJourney;

export default agendarConsultaJourney;
