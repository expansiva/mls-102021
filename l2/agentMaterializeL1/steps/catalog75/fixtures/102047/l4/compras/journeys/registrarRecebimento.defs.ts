/// <mls fileReference="_102047_/l4/compras/journeys/registrarRecebimento.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarRecebimentoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarRecebimento",
  "business": {
    "actorRef": "almoxarife",
    "title": "Registrar recebimento do pedido",
    "goal": "Registrar a chegada total ou parcial de um pedido e dar entrada no estoque.",
    "icon": "package-check",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "abrirLembrete",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "Abrir pedido lembrado",
        "description": "O almoxarife abre o pedido a partir do lembrete de entrega prevista ou de atraso.",
        "icon": "bell"
      },
      {
        "stepId": "conferirPedido",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "Conferir pedido",
        "description": "O almoxarife confere fornecedor, produto, quantidade pedida e já recebida.",
        "icon": "clipboard-list"
      },
      {
        "stepId": "lancarRecebimento",
        "kind": "act",
        "entity": "Recebimento",
        "effect": "create",
        "title": "Lançar recebimento",
        "description": "O almoxarife registra a quantidade recebida, total ou parcial, o que dá entrada no estoque e atualiza a situação do pedido.",
        "icon": "package-check"
      }
    ],
    "outcome": {
      "statement": "O recebimento está registrado e o estoque dos produtos recebidos foi atualizado.",
      "evidence": [
        "Recebimento listado no pedido com quantidade e data",
        "Pedido na situação recebido parcialmente ou recebido",
        "Entrada no estoque do produto"
      ]
    }
  },
  "businessHash": "sha256:826520cb1e7d9b78879effb80969800b975ce51a6d616b4523c5784c6be945af"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarRecebimentoJourneyType = typeof registrarRecebimentoJourney;

export default registrarRecebimentoJourney;
