/// <mls fileReference="_102047_/l4/agendaClinica/journeys/confirmarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const confirmarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "confirmarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Confirmar consulta",
    "goal": "Registrar a confirmação telefônica de uma consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaParaConfirmacao",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta agendada",
        "description": "A recepcionista abre a consulta em contexto ou a localiza entre os agendamentos."
      },
      {
        "stepId": "consultarContatoPaciente",
        "kind": "inspect",
        "entity": "Paciente",
        "title": "Consultar contato do paciente",
        "description": "A recepcionista consulta o contato do paciente para realizar a confirmação telefônica."
      },
      {
        "stepId": "registrarConfirmacao",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "confirmarConsulta",
        "title": "Registrar confirmação telefônica",
        "description": "A recepcionista registra que o paciente confirmou a consulta por telefone."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como confirmada.",
      "evidence": [
        "O status da consulta indica confirmação.",
        "A confirmação pode ser consultada pela recepcionista."
      ]
    }
  },
  "businessHash": "sha256:04879968a3228fd919657496671af914ac4a1a58cb69b263d53792675d69245b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfirmarConsultaJourneyType = typeof confirmarConsultaJourney;

export default confirmarConsultaJourney;
