/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/fixtures/usesSiblingSystem-integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

/** Case 3: the module uses the system its sibling `integrations` declares. It declares none, so it stays v3. */
export const usesSiblingSystemIntegration = {
  "schemaVersion": "2026-11-17-ns5-integration-v3",
  "moduleName": "customers",
  "inbound": [],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "zipLookup",
      "operationId": "findAddress",
      "direction": "call",
      "usedBy": ["registerCustomer.typeZipCode"],
      "description": "Fills the address of the customer from the zip code."
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type UsesSiblingSystemIntegrationType = typeof usesSiblingSystemIntegration;
