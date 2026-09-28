/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarFalta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarFaltaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarFalta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar falta do paciente",
    "goal": "Registrar que o paciente não compareceu à consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaParaFalta",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta cujo paciente não compareceu."
      },
      {
        "stepId": "registrarFaltaDoPaciente",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarFalta",
        "title": "x",
        "description": "Marca a consulta como falta porque o paciente não compareceu."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como falta do paciente.",
      "evidence": [
        "Situação da consulta indicada como falta."
      ]
    }
  },
  "businessHash": "sha256:edcf233777fa29d26c5fbbf873bdca7c99fc7f92a0a074a7040495f718df06c4"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarFaltaJourneyType = typeof registrarFaltaJourney;

export default registrarFaltaJourney;
