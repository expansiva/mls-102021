/// <mls fileReference="_102047_/l4/comandaRestaurante/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "comandaRestaurante",
  "inbound": [],
  "outbound": [
    {
      "id": "comandaFechada",
      "kind": "event",
      "to": "financeiro",
      "event": "comandaFechada",
      "on": "Comanda.fecharComanda",
      "description": "Publica a comanda fechada, incluindo o pagamento registrado, para o módulo financeiro.",
      "entityRefs": [
        "Comanda"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ComandaRestauranteIntegrationType = typeof comandaRestauranteIntegration;

export default comandaRestauranteIntegration;
