/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "reembolsoDespesas",
  "journeys": [
    {
      "journeyId": "registrarEnviarDespesa",
      "actorRef": "colaborador",
      "title": "Registrar e enviar despesa"
    },
    {
      "journeyId": "consultarMinhasDespesas",
      "actorRef": "colaborador",
      "title": "Consultar minhas despesas"
    },
    {
      "journeyId": "corrigirReenviarDespesa",
      "actorRef": "colaborador",
      "title": "Corrigir e reenviar despesa"
    },
    {
      "journeyId": "analisarDecidirDespesa",
      "actorRef": "gestorEquipe",
      "title": "Analisar e decidir despesa"
    },
    {
      "journeyId": "consultarDespesasAprovadas",
      "actorRef": "financeiro",
      "title": "Consultar despesas aprovadas"
    },
    {
      "journeyId": "registrarPagamentoDespesa",
      "actorRef": "financeiro",
      "title": "Registrar pagamento de despesa"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type ReembolsoDespesasJourneyIndexType = typeof reembolsoDespesasJourneyIndex;

export default reembolsoDespesasJourneyIndex;
