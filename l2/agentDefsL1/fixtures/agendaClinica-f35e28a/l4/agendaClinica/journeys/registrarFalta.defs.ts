/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarFalta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarFaltaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarFalta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar falta do paciente",
    "goal": "Registrar que o paciente não compareceu à consulta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaParaFalta",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta para a qual o paciente não compareceu."
      },
      {
        "stepId": "registrarFaltaPaciente",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarFalta",
        "title": "x",
        "description": "Marca a consulta como falta porque o paciente não compareceu."
      }
    ],
    "outcome": {
      "statement": "A ausência do paciente fica registrada na consulta.",
      "evidence": [
        "Situação da consulta registrada como falta."
      ]
    }
  },
  "businessHash": "sha256:cd0542f6fc78ba5c17f445e7ecdc1c2199191e0aaa07a35f79089c3ea61bac3f"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarFaltaJourneyType = typeof registrarFaltaJourney;

export default registrarFaltaJourney;
