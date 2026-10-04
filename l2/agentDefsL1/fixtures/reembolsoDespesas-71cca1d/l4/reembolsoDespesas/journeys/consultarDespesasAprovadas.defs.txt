/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/consultarDespesasAprovadas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarDespesasAprovadasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarDespesasAprovadas",
  "business": {
    "actorRef": "financeiro",
    "title": "Consultar despesas aprovadas",
    "goal": "Consultar todas as despesas aprovadas que aguardam pagamento.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesasAprovadas",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesas aprovadas",
        "description": "Localiza todas as despesas aprovadas disponíveis para pagamento."
      },
      {
        "stepId": "consultarDespesaAprovada",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar despesa aprovada",
        "description": "Consulta os dados e o comprovante de uma despesa aprovada."
      }
    ],
    "outcome": {
      "statement": "O financeiro visualiza as despesas aprovadas para pagamento.",
      "evidence": [
        "Lista contendo despesas aprovadas.",
        "Dados e comprovante da despesa aprovada visíveis."
      ]
    }
  },
  "businessHash": "sha256:3aedfc89452190a404e201cd02041f2811d056e95e92c72aec7a19fc63d1fd37"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarDespesasAprovadasJourneyType = typeof consultarDespesasAprovadasJourney;

export default consultarDespesasAprovadasJourney;
