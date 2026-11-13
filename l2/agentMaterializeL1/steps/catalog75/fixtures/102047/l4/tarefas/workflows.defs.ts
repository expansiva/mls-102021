/// <mls fileReference="_102047_/l4/tarefas/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "tarefas",
  "processes": [
    {
      "processId": "processoTarefa",
      "title": "Processo da tarefa",
      "description": "Cada tarefa é uma ocorrência: quem criou registra, o responsável executa e envia para revisão, quem criou aceita ou devolve com motivo e o responsável retoma; a cada mudança quem age agora é avisado.",
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
            "executar"
          ],
          "description": "Quem pode criar tarefas registra a tarefa e escolhe o responsável pelo nome, que é avisado e passa a agir."
        },
        {
          "taskId": "executar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "executarTarefa",
          "next": [
            "aguardarRevisao"
          ],
          "description": "O responsável inicia a tarefa, marca a checklist e envia para revisão de quem criou."
        },
        {
          "taskId": "aguardarRevisao",
          "kind": "wait",
          "next": [
            "revisar"
          ],
          "description": "A tarefa fica em revisão aguardando a decisão de quem criou.",
          "wake": {
            "mode": "none"
          }
        },
        {
          "taskId": "revisar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "revisarTarefa",
          "next": [
            "retomar"
          ],
          "description": "Quem criou aceita a entrega, encerrando a ocorrência como concluída, ou devolve com o motivo ao responsável, que é avisado."
        },
        {
          "taskId": "retomar",
          "kind": "human",
          "actorRef": "membroEquipe",
          "journeyRef": "retomarTarefa",
          "next": [
            "aguardarRevisao"
          ],
          "description": "O responsável lê o motivo, retoma, corrige e reenvia a tarefa para revisão de quem criou."
        }
      ],
      "room": "exclusive",
      "functions": [
        {
          "functionId": "abrirOcorrenciaTarefa",
          "description": "Chamada pela tela ao criar a tarefa: valida que quem cria pode criar tarefas e que o responsável aceita tarefas, pede ao cm a mensagem de origem e a Task que referencia a tarefa, define o responsável como quem age agora e pede ao cm que o avise; devolve o id da ocorrência e, se repetida para a mesma tarefa, devolve a ocorrência já aberta sem novo aviso."
        },
        {
          "functionId": "avancarEtapaTarefa",
          "description": "Chamada pela tela, pelo cm em nome de quem respondeu num canal ou ao ser acordado: valida que a pessoa é quem age agora e que a transição (iniciar, enviarParaRevisao, aceitar, devolver com motivo, retomar) é permitida na situação atual, aplica a transição, registra o progresso, passa a vez ao responsável ou a quem criou e pede ao cm que avise; devolve a nova situação e, se repetida com a tarefa já na situação de destino, não reaplica nem reavisa."
        },
        {
          "functionId": "definirQuemAgeAgora",
          "description": "Chamada pelas demais funções para decidir a pessoa da etapa: em a fazer, em andamento e devolvida é o responsável; em revisão é quem criou; concluída ou cancelada não tem ninguém; devolve o usuário sem efeito colateral."
        },
        {
          "functionId": "trocarResponsavelOcorrencia",
          "description": "Chamada pela tela quando quem criou ou o gestor reatribui: valida o papel de quem chama e que o novo responsável aceita tarefas, grava o novo responsável, recalcula quem age agora, atualiza a Task no cm e pede que o novo responsável seja avisado; repetida com o mesmo responsável não gera novo aviso."
        },
        {
          "functionId": "cancelarOcorrenciaTarefa",
          "description": "Chamada pela tela quando quem criou ou o gestor cancela: valida o papel e que a tarefa não está concluída ou cancelada, aplica a transição cancelar, encerra a Task no cm e pede que quem estava agindo seja avisado; repetida em tarefa já cancelada devolve o estado atual sem novo aviso."
        }
      ]
    },
    {
      "processId": "resumoDiarioTarefas",
      "title": "Resumo diário das 8h",
      "description": "Todo dia às 8h cada responsável recebe as suas tarefas abertas que vencem hoje ou estão atrasadas, uma ocorrência por pessoa.",
      "trigger": {
        "kind": "scheduled",
        "schedule": "Todo dia às 8h"
      },
      "tasks": [
        {
          "taskId": "avisarVencendo",
          "kind": "alert",
          "actorRef": "membroEquipe",
          "next": [],
          "description": "Ler as suas tarefas abertas que vencem hoje ou estão atrasadas e abri-las pela jornada resumoDiario."
        }
      ],
      "room": "person",
      "functions": [
        {
          "functionId": "listarResponsaveisResumo",
          "description": "Chamada pelo agendamento às 8h: encontra os responsáveis com tarefas abertas que vencem hoje ou estão atrasadas e devolve a lista de pessoas, sem escrever nada."
        },
        {
          "functionId": "abrirResumoDiario",
          "description": "Chamada pelo agendamento para cada responsável: se já existe um resumo não terminado para essa pessoa não abre outro e segue para as demais, senão pede ao cm a mensagem de origem e a Task com a lista das tarefas daquela pessoa e a avisa; uma falha numa pessoa nunca bloqueia as demais; repetida no mesmo dia devolve a ocorrência existente."
        },
        {
          "functionId": "concluirResumoDiario",
          "description": "Chamada pela tela ou pelo cm quando a pessoa leu o resumo: valida que a ocorrência é dela, marca o resumo como terminado e libera o próximo; repetida em resumo já terminado não faz nada."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "configurarParticipantes",
      "inProcess": false
    },
    {
      "journeyId": "manterListas",
      "inProcess": false
    },
    {
      "journeyId": "criarTarefa",
      "inProcess": true,
      "processId": "processoTarefa"
    },
    {
      "journeyId": "executarTarefa",
      "inProcess": true,
      "processId": "processoTarefa"
    },
    {
      "journeyId": "revisarTarefa",
      "inProcess": true,
      "processId": "processoTarefa"
    },
    {
      "journeyId": "retomarTarefa",
      "inProcess": true,
      "processId": "processoTarefa"
    },
    {
      "journeyId": "editarTarefa",
      "inProcess": false
    },
    {
      "journeyId": "reatribuirTarefa",
      "inProcess": false
    },
    {
      "journeyId": "reatribuirTarefaCriada",
      "inProcess": false
    },
    {
      "journeyId": "cancelarTarefa",
      "inProcess": false
    },
    {
      "journeyId": "cancelarTarefaCriada",
      "inProcess": false
    },
    {
      "journeyId": "minhasTarefas",
      "inProcess": false
    },
    {
      "journeyId": "resumoDiario",
      "inProcess": true,
      "processId": "resumoDiarioTarefas"
    },
    {
      "journeyId": "acompanharTarefas",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type TarefasWorkflowsType = typeof tarefasWorkflows;

export default tarefasWorkflows;
