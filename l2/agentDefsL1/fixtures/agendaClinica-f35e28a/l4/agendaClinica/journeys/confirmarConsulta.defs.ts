/// <mls fileReference="_102047_/l4/agendaClinica/journeys/confirmarConsulta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const confirmarConsultaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "confirmarConsulta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Confirmar consulta por telefone",
    "goal": "Registrar a confirmação telefônica de uma consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaParaConfirmacao",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta que será confirmada por telefone."
      },
      {
        "stepId": "inspecionarConsultaParaConfirmacao",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Confere os dados da consulta antes de registrar o contato."
      },
      {
        "stepId": "registrarConfirmacao",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "confirmarConsulta",
        "title": "x",
        "description": "Registra que a consulta foi confirmada por telefone."
      }
    ],
    "outcome": {
      "statement": "A consulta passa a constar como confirmada.",
      "evidence": [
        "Situação da consulta registrada como confirmada.",
        "Registro da confirmação telefônica disponível na consulta."
      ]
    }
  },
  "businessHash": "sha256:7a8c0ba995c336953b9ae3dc14ad1cb4842ecf689b66ea733a72fa1c8fa1fdb6"
} as const satisfies Ns5JourneyArtifact;

export type ConfirmarConsultaJourneyType = typeof confirmarConsultaJourney;

export default confirmarConsultaJourney;
