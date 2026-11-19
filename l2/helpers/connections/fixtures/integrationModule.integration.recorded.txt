/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/fixtures/integrationModule-integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

/** Case 2: the integration module declares the system and serves what arrives; it has no call of its own. */
export const integrationModuleIntegration = {
  "schemaVersion": "2026-11-19-ns5-integration-v4",
  "moduleName": "integrations",
  "inbound": [],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "zipLookup",
      "operationId": "addressFound",
      "direction": "serve",
      "usedBy": ["Records the address that the lookup service sent."],
      "description": "The lookup service sends the address of a zip code."
    }
  ],
  "externalSystems": [
    {
      "id": "zipLookup",
      "title": "Zip code lookup",
      "description": "A public service that gives the address of a zip code; other modules ask the integration module for it.",
      "settings": [],
      "operations": [
        { "operationId": "findAddress", "direction": "call", "description": "The address of one zip code." },
        { "operationId": "addressFound", "direction": "serve", "description": "The service sends an address it found." }
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type IntegrationModuleIntegrationType = typeof integrationModuleIntegration;
