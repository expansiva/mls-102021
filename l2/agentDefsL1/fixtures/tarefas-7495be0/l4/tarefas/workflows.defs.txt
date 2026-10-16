/// <mls fileReference="_102047_/l4/tarefas/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "tarefas",
  "processes": [
    {
      "processId": "cicloTarefa",
      "title": "Ciclo da tarefa",
      "description": "Cada tarefa é uma ocorrência que passa do criador ao responsável para execução, volta ao criador para revisão e, se devolvida, retorna ao responsável até ser concluída ou cancelada.",
      "trigger": {
        "kind": "manual",
        "actorRef": "membroEquipe"
      },
      "tasks": [
        {
          "taskId": "criar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "criarTarefa",
          "next": [
            "aguardarInicio"
          ],
          "description": "O criador registra a tarefa e o responsável passa a ser quem age agora e é avisado."
        },
        {
          "taskId": "aguardarInicio",
          "kind": "wait",
          "next": [
            "executar",
            "reatribuirCriador",
            "reatribuirGestor",
            "cancelarCriador",
            "cancelarGestor"
          ],
          "description": "Aguarda o responsável iniciar a tarefa, ou uma reatribuição ou cancelamento."
        },
        {
          "taskId": "executar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "executarTarefa",
          "next": [
            "revisar"
          ],
          "description": "O responsável inicia a tarefa e a envia para revisão, passando a vez ao criador."
        },
        {
          "taskId": "revisar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "revisarTarefa",
          "next": [
            "aguardarAjuste"
          ],
          "description": "O criador aceita a entrega, encerrando a tarefa como concluída, ou a devolve com o motivo ao responsável."
        },
        {
          "taskId": "aguardarAjuste",
          "kind": "wait",
          "next": [
            "retomar",
            "reatribuirCriador",
            "reatribuirGestor",
            "cancelarCriador",
            "cancelarGestor"
          ],
          "description": "Com a tarefa devolvida, aguarda o responsável retomar o ajuste, ou uma reatribuição ou cancelamento."
        },
        {
          "taskId": "retomar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "retomarTarefaDevolvida",
          "next": [
            "revisar"
          ],
          "description": "O responsável ajusta a tarefa devolvida e a reenvia para revisão do criador."
        },
        {
          "taskId": "reatribuirCriador",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "reatribuirTarefaCriador",
          "next": [
            "aguardarInicio"
          ],
          "description": "O criador troca o responsável, que passa a ser quem age agora e é avisado."
        },
        {
          "taskId": "reatribuirGestor",
          "kind": "human",
          "actorRef": "gestor",
          "journeyRef": "reatribuirTarefaGestor",
          "next": [
            "aguardarInicio"
          ],
          "description": "O gestor troca o responsável, que passa a ser quem age agora e é avisado."
        },
        {
          "taskId": "cancelarCriador",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "cancelarTarefaCriador",
          "next": [],
          "description": "O criador cancela a tarefa e a ocorrência é encerrada."
        },
        {
          "taskId": "cancelarGestor",
          "kind": "human",
          "actorRef": "gestor",
          "journeyRef": "cancelarTarefaGestor",
          "next": [],
          "description": "O gestor cancela a tarefa e a ocorrência é encerrada."
        }
      ],
      "functions": [
        {
          "functionId": "abrirOcorrenciaTarefa",
          "description": "Chamada pela tela de criação com uma chave de idempotência; valida lista, responsável e campos obrigatórios, grava a tarefa em a fazer, cria a mensagem de origem na thread do módulo e a Task com etapa, quem age agora (o responsável) e histórico, abre o task-room e avisa o responsável; devolve a tarefa e a Task; repetida com a mesma chave devolve a mesma tarefa sem criar outra."
        },
        {
          "functionId": "avancarEtapaTarefa",
          "description": "Chamada pelas telas de execução, revisão, retomada e cancelamento; valida que quem chama pode aplicar a transição (iniciar, enviarParaRevisao, aceitar, devolver com motivo, cancelar) na situação atual, aplica a transição, registra a etapa no histórico da Task, posta a mensagem da mudança no task-room, define e avisa quem age agora; devolve a Task atualizada; repetida sobre a mesma situação já aplicada não faz nada e devolve o estado atual."
        },
        {
          "functionId": "reatribuirQuemAge",
          "description": "Chamada pelas telas de reatribuição do criador ou do gestor; valida que quem chama é o criador ou o gestor e que o novo responsável é da equipe, grava o responsável, troca quem age agora na Task quando a vez é do responsável, registra no histórico, posta no task-room e avisa o novo responsável; devolve a Task; repetida com o mesmo responsável não gera novo aviso."
        },
        {
          "functionId": "resolverQuemAgeAgora",
          "description": "Chamada por avancarEtapaTarefa e reatribuirQuemAge; decide a pessoa da etapa: o responsável para iniciar, executar e retomar, o criador para revisar; devolve o identificador da pessoa sem gravar nada."
        }
      ]
    },
    {
      "processId": "avisoDiario",
      "title": "Aviso diário de vencimentos",
      "description": "Todo dia às 8h cada responsável recebe suas tarefas abertas que vencem hoje ou estão atrasadas, sem iniciar um novo aviso enquanto o do dia anterior não terminou.",
      "trigger": {
        "kind": "scheduled",
        "schedule": "Todo dia às 8h"
      },
      "tasks": [
        {
          "taskId": "gerarAvisos",
          "kind": "mechanical",
          "entityRef": "AvisoVencimento",
          "effect": "create",
          "next": [
            "avisarResponsavel"
          ],
          "description": "Gera para cada responsável o aviso com suas tarefas abertas que vencem hoje ou estão atrasadas."
        },
        {
          "taskId": "avisarResponsavel",
          "kind": "alert",
          "actorRef": "membroEquipe",
          "next": [],
          "description": "Cada responsável recebe o aviso diário e consulta suas tarefas que vencem hoje ou estão atrasadas pela jornada avisoDiarioVencimentos."
        }
      ],
      "functions": [
        {
          "functionId": "gerarAvisosDiarios",
          "description": "Chamada pelo agendamento das 8h; verifica se a execução do dia anterior terminou e, se não, não começa uma nova; seleciona as tarefas abertas com prazo hoje ou vencido, agrupa por responsável, grava um aviso por responsável e dia e notifica cada um; devolve a quantidade de avisos; repetida no mesmo dia não duplica avisos."
        },
        {
          "functionId": "resolverResponsaveisComVencimento",
          "description": "Chamada por gerarAvisosDiarios; devolve os responsáveis que têm tarefas abertas vencendo hoje ou atrasadas, com a lista de tarefas de cada um, sem gravar nada."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "criarTarefa",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "executarTarefa",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "revisarTarefa",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "retomarTarefaDevolvida",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "editarTarefa",
      "inProcess": false
    },
    {
      "journeyId": "cancelarTarefaCriador",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "reatribuirTarefaCriador",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "avisoDiarioVencimentos",
      "inProcess": true,
      "processId": "avisoDiario"
    },
    {
      "journeyId": "manterListas",
      "inProcess": false
    },
    {
      "journeyId": "acompanharTarefasEquipe",
      "inProcess": false
    },
    {
      "journeyId": "reatribuirTarefaGestor",
      "inProcess": true,
      "processId": "cicloTarefa"
    },
    {
      "journeyId": "cancelarTarefaGestor",
      "inProcess": true,
      "processId": "cicloTarefa"
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type TarefasWorkflowsType = typeof tarefasWorkflows;

export default tarefasWorkflows;
