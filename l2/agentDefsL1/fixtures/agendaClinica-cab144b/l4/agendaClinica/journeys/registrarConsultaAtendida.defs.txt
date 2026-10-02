/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarConsultaAtendida.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarConsultaAtendidaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarConsultaAtendida",
  "business": {
    "actorRef": "profissional",
    "title": "Registrar consulta atendida",
    "goal": "Concluir uma consulta realizada e registrar uma anotação do atendimento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaDaAgenda",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta da agenda",
        "description": "O profissional abre a consulta em contexto ou a localiza na própria agenda diária."
      },
      {
        "stepId": "revisarConsultaSelecionada",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Revisar consulta selecionada",
        "description": "O profissional confere os dados da consulta antes de concluir o atendimento."
      },
      {
        "stepId": "registrarAtendimento",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarAtendimento",
        "title": "Registrar atendimento realizado",
        "description": "O profissional marca a consulta como atendida e registra sua anotação do atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica concluída como atendida com a anotação do profissional.",
      "evidence": [
        "O status da consulta indica atendimento realizado.",
        "A anotação do atendimento está disponível na consulta."
      ]
    }
  },
  "businessHash": "sha256:dd531f687409b68d8b9e08376d5af5b528fc3b32b973ebd59d4e73338baddd61"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarConsultaAtendidaJourneyType = typeof registrarConsultaAtendidaJourney;

export default registrarConsultaAtendidaJourney;
