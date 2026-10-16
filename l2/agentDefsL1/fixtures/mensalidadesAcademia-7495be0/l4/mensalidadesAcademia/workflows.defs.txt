/// <mls fileReference="_102047_/l4/mensalidadesAcademia/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "mensalidadesAcademia",
  "processes": [
    {
      "processId": "geracaoMensalMensalidades",
      "title": "Geração mensal das mensalidades",
      "description": "Todo mês a gerência gera as mensalidades do mês para todos os alunos ativos, uma por aluno, com o valor do plano e o vencimento.",
      "trigger": {
        "kind": "scheduled",
        "schedule": "todo mês"
      },
      "tasks": [
        {
          "taskId": "lembrarGeracaoMensalidades",
          "kind": "alert",
          "actorRef": "gerencia",
          "next": [],
          "description": "A gerência gera as mensalidades do mês para todos os alunos ativos, uma por aluno, com valor do plano e vencimento, pela jornada gerarMensalidadesMes."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarPlano",
      "inProcess": false
    },
    {
      "journeyId": "matricularAluno",
      "inProcess": false
    },
    {
      "journeyId": "gerarMensalidadesMes",
      "inProcess": true,
      "processId": "geracaoMensalMensalidades"
    },
    {
      "journeyId": "registrarPagamento",
      "inProcess": false
    },
    {
      "journeyId": "verificarAcessoAluno",
      "inProcess": false
    },
    {
      "journeyId": "acompanharPainel",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type MensalidadesAcademiaWorkflowsType = typeof mensalidadesAcademiaWorkflows;

export default mensalidadesAcademiaWorkflows;
