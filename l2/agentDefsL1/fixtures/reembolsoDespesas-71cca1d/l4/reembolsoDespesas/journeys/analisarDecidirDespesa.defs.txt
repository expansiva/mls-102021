/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/analisarDecidirDespesa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const analisarDecidirDespesaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "analisarDecidirDespesa",
  "business": {
    "actorRef": "gestorEquipe",
    "title": "Analisar e decidir despesa",
    "goal": "Analisar uma despesa da equipe e aprová-la ou rejeitá-la com o motivo.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesasPendentes",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesas pendentes",
        "description": "Localiza as despesas da própria equipe que aguardam aprovação."
      },
      {
        "stepId": "analisarDespesa",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Analisar despesa",
        "description": "Consulta os dados e o comprovante da despesa da equipe."
      },
      {
        "stepId": "decidirDespesa",
        "kind": "decide",
        "entity": "Despesa",
        "title": "Decidir aprovação",
        "description": "Escolhe aprovar a despesa ou rejeitá-la, informando o motivo quando a decisão for rejeitar."
      }
    ],
    "outcome": {
      "statement": "A despesa é aprovada para pagamento ou rejeitada com um motivo.",
      "evidence": [
        "Situação da despesa indica aprovação ou rejeição.",
        "Motivo de rejeição registrado quando a despesa é rejeitada."
      ]
    }
  },
  "businessHash": "sha256:7d98885cdbe90911f0fc5b1e8d608ef2cb493dae838d4d5f00ac16fa36da7590"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AnalisarDecidirDespesaJourneyType = typeof analisarDecidirDespesaJourney;

export default analisarDecidirDespesaJourney;
