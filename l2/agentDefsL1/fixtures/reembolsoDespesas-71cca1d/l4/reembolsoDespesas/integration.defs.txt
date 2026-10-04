/// <mls fileReference="_102047_/l4/reembolsoDespesas/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "reembolsoDespesas",
  "inbound": [],
  "outbound": [
    {
      "id": "aprovarDespesa",
      "kind": "event",
      "to": "financeiro",
      "event": "aprovarDespesa",
      "on": "Despesa.aprovarDespesa",
      "description": "Publica a despesa aprovada para que o módulo financeiro possa tratá-la.",
      "entityRefs": [
        "Despesa"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ReembolsoDespesasIntegrationType = typeof reembolsoDespesasIntegration;

export default reembolsoDespesasIntegration;
