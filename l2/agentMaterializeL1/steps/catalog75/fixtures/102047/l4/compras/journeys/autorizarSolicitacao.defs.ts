/// <mls fileReference="_102047_/l4/compras/journeys/autorizarSolicitacao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const autorizarSolicitacaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "autorizarSolicitacao",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Autorizar ou rejeitar solicitação",
    "goal": "Decidir sobre uma solicitação escolhendo uma opção pesquisada ou rejeitando com motivo.",
    "icon": "stamp",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarPendentes",
        "kind": "locate",
        "entity": "SolicitacaoCompra",
        "title": "Solicitações aguardando autorização",
        "description": "O gerente localiza as solicitações aguardando autorização.",
        "icon": "inbox"
      },
      {
        "stepId": "analisarSolicitacao",
        "kind": "inspect",
        "entity": "SolicitacaoCompra",
        "title": "Analisar solicitação",
        "description": "O gerente vê produto, quantidade, justificativa, data de necessidade e as opções pesquisadas.",
        "icon": "eye"
      },
      {
        "stepId": "decidirSolicitacao",
        "kind": "decide",
        "entity": "SolicitacaoCompra",
        "title": "Autorizar ou rejeitar",
        "description": "O gerente escolhe entre autorizar com uma opção ou rejeitar a solicitação.",
        "icon": "git-branch"
      },
      {
        "stepId": "autorizar",
        "kind": "act",
        "entity": "SolicitacaoCompra",
        "effect": "transition",
        "transitionRef": "autorizar",
        "title": "Autorizar com opção",
        "description": "O gerente autoriza escolhendo uma opção; o sistema gera o pedido de compra para o fornecedor escolhido com produto, quantidade e preço.",
        "icon": "check-circle",
        "decisionRef": "decidirSolicitacao"
      },
      {
        "stepId": "rejeitar",
        "kind": "act",
        "entity": "SolicitacaoCompra",
        "effect": "transition",
        "transitionRef": "rejeitar",
        "title": "Rejeitar com motivo",
        "description": "O gerente rejeita a solicitação informando o motivo.",
        "icon": "x-circle",
        "decisionRef": "decidirSolicitacao"
      }
    ],
    "outcome": {
      "statement": "A solicitação está autorizada com pedido gerado, ou rejeitada com motivo registrado.",
      "evidence": [
        "Situação da solicitação autorizada ou rejeitada",
        "Pedido de compra gerado para o fornecedor escolhido quando autorizada",
        "Motivo visível quando rejeitada"
      ]
    }
  },
  "businessHash": "sha256:27bcdae6b74665bed11ceabec1cd95db5c1efc99a19bf5aa9d5e82d71455197f"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AutorizarSolicitacaoJourneyType = typeof autorizarSolicitacaoJourney;

export default autorizarSolicitacaoJourney;
