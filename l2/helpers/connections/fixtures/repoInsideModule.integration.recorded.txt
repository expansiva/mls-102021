/// <mls fileReference="_102035_/l2/agentNewSolution5/steps/integration70/fixtures/repoInsideModule-integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

/** Case 1: the module declares the system it talks to and uses it itself (call and serve). */
export const repoInsideModuleIntegration = {
  "schemaVersion": "2026-11-19-ns5-integration-v4",
  "moduleName": "codeReview",
  "inbound": [],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "repoHost",
      "operationId": "listChanges",
      "direction": "call",
      "usedBy": ["reviewChanges.pickProject"],
      "description": "Reads the latest changes of the repository of the project."
    },
    {
      "connectionId": "repoHost",
      "operationId": "changePushed",
      "direction": "serve",
      "usedBy": ["Starts the review of the change that arrived."],
      "description": "The repository host tells the module that a change was pushed."
    }
  ],
  "externalSystems": [
    {
      "id": "repoHost",
      "title": "Repository host",
      "description": "Where the code of a project lives; the module reads its changes and is told when one is pushed.",
      "settings": [
        { "id": "repositoryAddress", "title": "Repository address", "description": "The repository the project lives in.", "secret": false },
        { "id": "accessKey", "title": "Access key", "description": "Lets the module read the repository.", "secret": true }
      ],
      "operations": [
        { "operationId": "listChanges", "direction": "call", "description": "The latest changes of the repository." },
        { "operationId": "changePushed", "direction": "serve", "description": "A change was pushed to the repository." }
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type RepoInsideModuleIntegrationType = typeof repoInsideModuleIntegration;
