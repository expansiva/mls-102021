/// <mls fileReference="_102047_/l4/repoHost/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "repoHost",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "consultarConteudoRepositorio",
      "inProcess": false
    },
    {
      "journeyId": "acompanharAvisosMudanca",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type RepoHostWorkflowsType = typeof repoHostWorkflows;

export default repoHostWorkflows;
