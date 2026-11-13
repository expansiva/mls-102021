/// <mls fileReference="_102047_/l4/compras/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "compras",
  "processes": [
    {
      "processId": "cicloSolicitacaoCompra",
      "title": "Ciclo da solicitação de compra",
      "description": "Da abertura da solicitação pelo comprador, passando pela pesquisa de opções por IA e pela autorização do gerente, até a geração do pedido e o recebimento pelo almoxarife com lembretes diários de entrega.",
      "trigger": {
        "kind": "manual",
        "actorRef": "comprador"
      },
      "tasks": [
        {
          "taskId": "abrirSolicitacao",
          "kind": "human",
          "actorRef": "comprador",
          "journeyRef": "abrirSolicitacao",
          "next": [
            "conferirCompletude"
          ],
          "description": "O comprador registra produto, quantidade, justificativa e data de necessidade e envia a solicitação.",
          "icon": "file-plus"
        },
        {
          "taskId": "conferirCompletude",
          "kind": "mechanical",
          "entityRef": "SolicitacaoCompra",
          "effect": "update",
          "next": [
            "pesquisarOpcoes"
          ],
          "description": "O sistema confere se a solicitação enviada está completa antes de seguir para a pesquisa.",
          "icon": "clipboard-check"
        },
        {
          "taskId": "pesquisarOpcoes",
          "kind": "llm",
          "entityRef": "OpcaoCotacao",
          "effect": "create",
          "next": [
            "autorizarSolicitacao"
          ],
          "description": "A IA pesquisa na web e nas compras e fornecedores registrados até três opções de fornecedor e preço, gravadas como estimativa com fonte e data, sem autorizar nem comprar nada.",
          "icon": "search"
        },
        {
          "taskId": "autorizarSolicitacao",
          "kind": "human",
          "actorRef": "gerenteCompras",
          "journeyRef": "autorizarSolicitacao",
          "next": [
            "gerarPedido"
          ],
          "description": "O gerente de compras analisa a solicitação com as opções e autoriza escolhendo uma opção ou rejeita com motivo, encerrando o ciclo.",
          "icon": "gavel"
        },
        {
          "taskId": "gerarPedido",
          "kind": "mechanical",
          "entityRef": "PedidoCompra",
          "effect": "create",
          "next": [
            "aguardarEntrega"
          ],
          "description": "Com a solicitação autorizada, o sistema gera o pedido de compra para o fornecedor escolhido com produto, quantidade e preço.",
          "icon": "file-text"
        },
        {
          "taskId": "aguardarEntrega",
          "kind": "wait",
          "next": [
            "registrarRecebimento"
          ],
          "description": "Enquanto o pedido não chega, o sistema verifica todo dia e lembra o almoxarife na data prevista de entrega e a cada dia de atraso.",
          "icon": "clock",
          "wake": {
            "mode": "periodic",
            "every": "P1D"
          }
        },
        {
          "taskId": "registrarRecebimento",
          "kind": "human",
          "actorRef": "almoxarife",
          "journeyRef": "registrarRecebimento",
          "next": [
            "aguardarEntrega"
          ],
          "description": "O almoxarife registra o recebimento total ou parcial, dando entrada no estoque; se parcial, o pedido volta a aguardar a entrega do saldo.",
          "icon": "package-check"
        }
      ],
      "room": "exclusive",
      "functions": [
        {
          "functionId": "abrirOcorrenciaSolicitacao",
          "description": "Chamada pela tela do comprador ao enviar a solicitação: valida que a solicitação existe e ainda não tem ocorrência, pede ao cm a mensagem de origem e a Task que referencia a solicitação, e retorna o id da ocorrência; repetida, devolve a ocorrência já aberta."
        },
        {
          "functionId": "conferirCompletudeSolicitacao",
          "description": "Chamada pela rotina do processo após o envio: verifica produto, quantidade, justificativa e data de necessidade, grava o resultado da conferência e, se incompleta, devolve a vez ao comprador pedindo ao cm que o notifique; repetida, retorna o mesmo resultado sem regravar."
        },
        {
          "functionId": "pesquisarOpcoesCotacao",
          "description": "Chamada pela rotina do processo após a conferência: aciona a IA para buscar até três opções na web e no histórico do módulo, grava cada opção com fornecedor, preço unitário, moeda, prazo, fonte e data da pesquisa como estimativa, passa a vez ao gerente e pede ao cm que o notifique; repetida, não duplica opções já gravadas."
        },
        {
          "functionId": "registrarDecisaoGerente",
          "description": "Chamada pela tela ou pelo cm em nome do gerente que respondeu em um canal: valida que a solicitação aguarda autorização e que a opção escolhida pertence a ela (ou que há motivo na rejeição), aplica a transição autorizar ou rejeitar, registra o progresso, notifica o comprador e, se autorizada, gera o pedido de compra; repetida, retorna a decisão já registrada sem gerar outro pedido."
        },
        {
          "functionId": "verificarEntregaDiaria",
          "description": "Chamada pelo cm quando a etapa de espera pede para ser acordada todo dia: compara a data prevista com a data atual e o saldo pendente do pedido, pede ao cm que lembre o almoxarife na data prevista e a cada dia de atraso, e retorna se deve continuar aguardando; repetida no mesmo dia, não envia lembrete duplicado."
        },
        {
          "functionId": "registrarAvancoRecebimento",
          "description": "Chamada pela tela do almoxarife ou pelo cm em seu nome: valida a quantidade recebida contra o saldo do pedido, registra o progresso da etapa, encerra a ocorrência se o pedido foi recebido por completo ou volta à espera se parcial, e notifica o comprador; repetida com o mesmo recebimento, não o conta duas vezes."
        },
        {
          "functionId": "resolverGerenteResponsavel",
          "description": "Chamada pela rotina ao passar a vez para autorização: retorna o gerente de compras que deve decidir a solicitação; repetida, retorna o mesmo gerente enquanto a etapa estiver aberta."
        },
        {
          "functionId": "resolverAlmoxarifeResponsavel",
          "description": "Chamada pela rotina ao gerar o pedido e a cada lembrete: retorna o almoxarife responsável pelo recebimento do pedido; repetida, retorna o mesmo almoxarife enquanto o pedido estiver em aberto."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarFornecedor",
      "inProcess": false
    },
    {
      "journeyId": "abrirSolicitacao",
      "inProcess": true,
      "processId": "cicloSolicitacaoCompra"
    },
    {
      "journeyId": "autorizarSolicitacao",
      "inProcess": true,
      "processId": "cicloSolicitacaoCompra"
    },
    {
      "journeyId": "registrarRecebimento",
      "inProcess": true,
      "processId": "cicloSolicitacaoCompra"
    },
    {
      "journeyId": "pesquisarCompras",
      "inProcess": false
    },
    {
      "journeyId": "pesquisarComprasGerente",
      "inProcess": false
    },
    {
      "journeyId": "acompanharPainel",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type ComprasWorkflowsType = typeof comprasWorkflows;

export default comprasWorkflows;
