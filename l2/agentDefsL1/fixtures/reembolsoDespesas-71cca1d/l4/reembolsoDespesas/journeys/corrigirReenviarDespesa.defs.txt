/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/corrigirReenviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const corrigirReenviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "corrigirReenviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Corrigir e reenviar despesa",
    "goal": "Corrigir uma despesa rejeitada e reenviá-la uma única vez para aprovação.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaRejeitada",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa rejeitada",
        "description": "Localiza uma despesa própria que foi rejeitada e ainda pode ser reenviada."
      },
      {
        "stepId": "consultarMotivoRejeicao",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar motivo da rejeição",
        "description": "Consulta o motivo informado pelo gestor para a rejeição da despesa."
      },
      {
        "stepId": "corrigirDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "update",
        "title": "Corrigir despesa",
        "description": "Corrige os dados ou o comprovante da despesa rejeitada."
      },
      {
        "stepId": "reenviarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "reenviarParaAprovacao",
        "title": "Reenviar para aprovação",
        "description": "Reenvia uma única vez a despesa corrigida para nova análise do gestor."
      }
    ],
    "outcome": {
      "statement": "A despesa corrigida é reenviada para nova aprovação.",
      "evidence": [
        "Dados ou comprovante corrigidos na despesa.",
        "Situação da despesa indica que foi reenviada para aprovação."
      ]
    }
  },
  "businessHash": "sha256:b598347ecda0506d4018037a1f699fae1f542729c2239940c5c0ec8e16eff345"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CorrigirReenviarDespesaJourneyType = typeof corrigirReenviarDespesaJourney;

export default corrigirReenviarDespesaJourney;
