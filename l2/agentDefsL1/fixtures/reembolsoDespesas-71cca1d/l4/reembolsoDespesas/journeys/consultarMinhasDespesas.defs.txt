/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/consultarMinhasDespesas.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarMinhasDespesasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarMinhasDespesas",
  "business": {
    "actorRef": "colaborador",
    "title": "Consultar minhas despesas",
    "goal": "Acompanhar as despesas que registrou e suas situações.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMinhasDespesas",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar minhas despesas",
        "description": "Localiza somente as despesas vinculadas ao próprio colaborador."
      },
      {
        "stepId": "consultarDespesa",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar despesa",
        "description": "Consulta os dados, comprovante e situação de uma despesa própria."
      }
    ],
    "outcome": {
      "statement": "O colaborador visualiza suas despesas e a situação de cada uma.",
      "evidence": [
        "Lista contendo apenas despesas do próprio colaborador.",
        "Dados e situação da despesa selecionada visíveis."
      ]
    }
  },
  "businessHash": "sha256:daffa971697fb75ea0fdca9dc7b5286ee0431bd87f52d78482cc787e2a84352e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarMinhasDespesasJourneyType = typeof consultarMinhasDespesasJourney;

export default consultarMinhasDespesasJourney;
