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
        "stepId": "localizarMinhaConsulta",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza uma consulta vinculada ao próprio profissional."
      },
      {
        "stepId": "inspecionarMinhaConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Confere os dados da própria consulta antes de concluir o atendimento."
      },
      {
        "stepId": "registrarAtendimentoRealizado",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarAtendimento",
        "title": "x",
        "description": "Marca a consulta como atendida e registra a anotação do profissional sobre o atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como atendida com a anotação do profissional.",
      "evidence": [
        "Situação da consulta registrada como atendida.",
        "Anotação do atendimento disponível na consulta."
      ]
    }
  },
  "businessHash": "sha256:ed3afb283a60e389c01776d5c9f233e59e9467dd340e45b58264aa738dd0fe5e"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarAtendimentoJourneyType = typeof registrarAtendimentoJourney;

export default registrarAtendimentoJourney;
