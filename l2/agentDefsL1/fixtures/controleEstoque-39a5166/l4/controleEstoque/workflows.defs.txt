/// <mls fileReference="_102047_/l4/controleEstoque/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "controleEstoque",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarProduto",
      "inProcess": false
    },
    {
      "journeyId": "registrarMovimentacaoEstoque",
      "inProcess": false
    },
    {
      "journeyId": "acompanharSaldos",
      "inProcess": false
    },
    {
      "journeyId": "tratarAvisoSaldoBaixo",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ControleEstoqueWorkflowsType = typeof controleEstoqueWorkflows;

export default controleEstoqueWorkflows;
