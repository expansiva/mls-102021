/// <mls fileReference="_102047_/l4/comandaRestaurante/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "comandaRestaurante",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "abrirComanda",
      "inProcess": false
    },
    {
      "journeyId": "lancarItemComanda",
      "inProcess": false
    },
    {
      "journeyId": "cancelarItemComanda",
      "inProcess": false
    },
    {
      "journeyId": "fecharComanda",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ComandaRestauranteWorkflowsType = typeof comandaRestauranteWorkflows;

export default comandaRestauranteWorkflows;
