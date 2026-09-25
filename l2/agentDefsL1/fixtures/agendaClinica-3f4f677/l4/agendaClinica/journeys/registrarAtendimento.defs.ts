/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarAtendimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarAtendimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarAtendimento",
  "business": {
    "actorRef": "profissional",
    "title": "Registrar atendimento",
    "goal": "Marcar uma consulta própria como atendida e registrar uma anotação do atendimento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaPropria",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza uma consulta atribuída ao próprio profissional."
      },
      {
        "stepId": "inspecionarConsultaPropria",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Confere os dados da consulta antes de registrar o atendimento."
      },
      {
        "stepId": "registrarConsultaAtendida",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarAtendimento",
        "title": "x",
        "description": "Marca a consulta como atendida e registra a anotação do atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica marcada como atendida com a anotação registrada.",
      "evidence": [
        "Situação da consulta indicada como atendida.",
        "Anotação do atendimento disponível na consulta."
      ]
    }
  },
  "businessHash": "sha256:061e5a0843885cf0879a4ed9e55e1569542b953462c7489873d78f4ab5023830"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarAtendimentoJourneyType = typeof registrarAtendimentoJourney;

export default registrarAtendimentoJourney;
