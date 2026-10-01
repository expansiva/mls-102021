/// <mls fileReference="_102047_/l4/controleEstoque/journeys/tratarAvisoSaldoBaixo.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tratarAvisoSaldoBaixoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "tratarAvisoSaldoBaixo",
  "business": {
    "actorRef": "estoquista",
    "title": "Verificar aviso de saldo baixo",
    "goal": "Verificar um aviso recebido sobre produto com saldo abaixo da quantidade mínima.",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "consultarProdutoAvisado",
        "kind": "inspect",
        "entity": "Produto",
        "title": "Consultar produto avisado",
        "description": "Consulta o saldo atual e a quantidade mínima do produto indicado no aviso."
      }
    ],
    "outcome": {
      "statement": "O estoquista confirma o produto com saldo abaixo do mínimo e pode providenciar sua reposição.",
      "evidence": [
        "Saldo atual e quantidade mínima do produto exibidos.",
        "Aviso de saldo abaixo do mínimo associado ao produto."
      ]
    }
  },
  "businessHash": "sha256:a9891a7f6b13b69ed088e5322408fcd0787bc4038ae476e4e8305ee1eb1ff279"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type TratarAvisoSaldoBaixoJourneyType = typeof tratarAvisoSaldoBaixoJourney;

export default tratarAvisoSaldoBaixoJourney;
