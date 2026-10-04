/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarPagamentoDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoDespesa",
  "business": {
    "actorRef": "financeiro",
    "title": "Registrar pagamento de despesa",
    "goal": "Registrar a data de pagamento de uma despesa aprovada.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaAprovada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa aprovada",
        "description": "Localiza uma despesa aprovada que aguarda pagamento."
      },
      {
        "stepId": "registrarDataPagamento",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "registrarPagamento",
        "title": "Registrar pagamento",
        "description": "Registra a data em que a despesa aprovada foi paga."
      }
    ],
    "outcome": {
      "statement": "O pagamento da despesa aprovada fica registrado.",
      "evidence": [
        "Data de pagamento registrada na despesa.",
        "Situação da despesa indica que foi paga."
      ]
    }
  },
  "businessHash": "sha256:752c4b9fb9b6da1691b082ab5c9dfcabe34e3f1b17e23e880867b4e7b867051e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarPagamentoDespesaJourneyType = typeof registrarPagamentoDespesaJourney;

export default registrarPagamentoDespesaJourney;
