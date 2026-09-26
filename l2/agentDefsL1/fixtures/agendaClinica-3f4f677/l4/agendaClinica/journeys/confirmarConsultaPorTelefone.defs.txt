/// <mls fileReference="_102047_/l4/agendaClinica/journeys/confirmarConsultaPorTelefone.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const confirmarConsultaPorTelefoneJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "confirmarConsultaPorTelefone",
  "business": {
    "actorRef": "recepcionista",
    "title": "Confirmar consulta por telefone",
    "goal": "Registrar a confirmação telefônica de uma consulta agendada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsulta",
        "kind": "locate",
        "entity": "Consulta",
        "title": "x",
        "description": "Localiza a consulta a ser confirmada por telefone."
      },
      {
        "stepId": "inspecionarConsulta",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "x",
        "description": "Confere os dados do paciente, do profissional, da data e do horário da consulta."
      },
      {
        "stepId": "registrarConfirmacaoTelefonica",
        "kind": "act",
        "entity": "Consulta",
        "effect": "update",
        "title": "x",
        "description": "Registra que a consulta foi confirmada por telefone."
      }
    ],
    "outcome": {
      "statement": "A confirmação telefônica da consulta fica registrada.",
      "evidence": [
        "Consulta identificada como confirmada por telefone."
      ]
    }
  },
  "businessHash": "sha256:b73e6cb1f83886eff63121b4fd39eeec68cba3201fa34429b8a891c9a1e9cb64"
} as const satisfies Ns5JourneyArtifact;

export type ConfirmarConsultaPorTelefoneJourneyType = typeof confirmarConsultaPorTelefoneJourney;

export default confirmarConsultaPorTelefoneJourney;
