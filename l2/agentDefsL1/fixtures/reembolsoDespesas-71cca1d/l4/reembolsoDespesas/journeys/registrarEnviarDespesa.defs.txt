/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/registrarEnviarDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarEnviarDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarEnviarDespesa",
  "business": {
    "actorRef": "colaborador",
    "title": "Registrar e enviar despesa",
    "goal": "Registrar uma despesa própria com seus dados e comprovante e enviá-la para aprovação.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "create",
        "title": "Registrar despesa",
        "description": "Informa data, categoria, valor, descrição e comprovante da despesa própria."
      },
      {
        "stepId": "enviarParaAprovacao",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "enviarParaAprovacao",
        "title": "Enviar para aprovação",
        "description": "Envia a despesa registrada para análise do gestor da equipe."
      }
    ],
    "outcome": {
      "statement": "A despesa própria fica enviada para aprovação do gestor.",
      "evidence": [
        "Despesa registrada com data, categoria, valor, descrição e comprovante.",
        "Situação da despesa indica que está aguardando aprovação."
      ]
    }
  },
  "businessHash": "sha256:a0e3aa2ade68ef1564ad4d885c94f36afad2366deda0d20ff15f031cfb0f24ea"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarEnviarDespesaJourneyType = typeof registrarEnviarDespesaJourney;

export default registrarEnviarDespesaJourney;
