/// <mls fileReference="_102047_/l4/reembolsoDespesas/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "reembolsoDespesas",
  "processes": [
    {
      "processId": "aprovarDespesaEnviada",
      "title": "Analisar despesa enviada",
      "description": "Encaminha uma despesa enviada pelo colaborador para análise e decisão do gestor da equipe.",
      "trigger": {
        "kind": "event",
        "event": "Despesa.enviarParaAprovacao"
      },
      "tasks": [
        {
          "taskId": "analisarDecidirDespesaEnviada",
          "kind": "human",
          "actorRef": "gestorEquipe",
          "journeyRef": "analisarDecidirDespesa",
          "next": [],
          "description": "O gestor da equipe analisa a despesa enviada e decide aprová-la ou rejeitá-la, informando o motivo da rejeição."
        }
      ]
    },
    {
      "processId": "aprovarDespesaReenviada",
      "title": "Analisar despesa reenviada",
      "description": "Encaminha uma despesa corrigida e reenviada pelo colaborador para nova análise do gestor da equipe.",
      "trigger": {
        "kind": "event",
        "event": "Despesa.reenviarParaAprovacao"
      },
      "tasks": [
        {
          "taskId": "analisarDecidirDespesaReenviada",
          "kind": "human",
          "actorRef": "gestorEquipe",
          "journeyRef": "analisarDecidirDespesa",
          "next": [],
          "description": "O gestor da equipe analisa novamente a despesa corrigida e decide aprová-la ou rejeitá-la, informando o motivo da rejeição."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "registrarEnviarDespesa",
      "inProcess": false
    },
    {
      "journeyId": "consultarMinhasDespesas",
      "inProcess": false
    },
    {
      "journeyId": "corrigirReenviarDespesa",
      "inProcess": false
    },
    {
      "journeyId": "analisarDecidirDespesa",
      "inProcess": true,
      "processId": "aprovarDespesaEnviada"
    },
    {
      "journeyId": "consultarDespesasAprovadas",
      "inProcess": false
    },
    {
      "journeyId": "registrarPagamentoDespesa",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ReembolsoDespesasWorkflowsType = typeof reembolsoDespesasWorkflows;

export default reembolsoDespesasWorkflows;
