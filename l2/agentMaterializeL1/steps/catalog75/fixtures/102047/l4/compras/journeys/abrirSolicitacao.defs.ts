/// <mls fileReference="_102047_/l4/compras/journeys/abrirSolicitacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const abrirSolicitacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirSolicitacao",
  "business": {
    "actorRef": "comprador",
    "title": "Abrir solicitação de compra",
    "goal": "Registrar a necessidade de compra e enviá-la para pesquisa e autorização.",
    "icon": "file-plus",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "criarSolicitacao",
        "kind": "act",
        "entity": "SolicitacaoCompra",
        "effect": "create",
        "title": "Nova solicitação",
        "description": "O comprador informa produto, quantidade, justificativa e data de necessidade.",
        "icon": "file-plus"
      },
      {
        "stepId": "enviarSolicitacao",
        "kind": "act",
        "entity": "SolicitacaoCompra",
        "effect": "transition",
        "transitionRef": "enviar",
        "title": "Enviar solicitação",
        "description": "O comprador envia a solicitação; o sistema confere se está completa e dispara a pesquisa de opções por IA.",
        "icon": "send"
      },
      {
        "stepId": "verOpcoesPesquisadas",
        "kind": "inspect",
        "entity": "OpcaoCotacao",
        "title": "Ver opções estimadas",
        "description": "O comprador consulta até três opções de fornecedor e preço pesquisadas, marcadas como estimativa com fonte e data.",
        "icon": "list"
      },
      {
        "stepId": "encaminharGerente",
        "kind": "handoff",
        "entity": "SolicitacaoCompra",
        "title": "Aguardar autorização",
        "description": "A solicitação com as opções segue para análise do gerente de compras.",
        "handoffTo": "gerenteCompras",
        "icon": "user-check"
      }
    ],
    "outcome": {
      "statement": "A solicitação foi enviada completa e recebeu opções estimadas para autorização.",
      "evidence": [
        "Solicitação na situação aguardando autorização",
        "Até três opções com fornecedor, preço, moeda, prazo, fonte e data da pesquisa"
      ]
    }
  },
  "businessHash": "sha256:418222f0963af5720f514edb3ed5fbeddc0efb05611a97be71b91781dea1d969"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AbrirSolicitacaoJourneyType = typeof abrirSolicitacaoJourney;

export default abrirSolicitacaoJourney;
