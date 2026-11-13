/// <mls fileReference="_102047_/l4/compras/journeys/pesquisarCompras.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const pesquisarComprasJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "pesquisarCompras",
  "business": {
    "actorRef": "comprador",
    "title": "Pesquisar solicitações e pedidos",
    "goal": "Consultar solicitações e pedidos por produto, fornecedor, situação e período.",
    "icon": "search",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "filtrarSolicitacoes",
        "kind": "locate",
        "entity": "SolicitacaoCompra",
        "title": "Filtrar solicitações",
        "description": "O comprador filtra solicitações por produto, fornecedor, situação e período.",
        "icon": "filter"
      },
      {
        "stepId": "filtrarPedidos",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "Filtrar pedidos",
        "description": "O comprador filtra pedidos por produto, fornecedor, situação e período.",
        "icon": "filter"
      },
      {
        "stepId": "verPedido",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "Ver detalhes do pedido",
        "description": "O comprador consulta os detalhes e recebimentos de um pedido.",
        "icon": "eye"
      }
    ],
    "outcome": {
      "statement": "O comprador encontrou as solicitações e pedidos procurados.",
      "evidence": [
        "Lista filtrada exibida com situação e período",
        "Detalhe do pedido aberto"
      ]
    }
  },
  "businessHash": "sha256:c66a6235af98adde2a22bc192c2bbdba508dacfb1ea6577baf8a23b00428b190"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type PesquisarComprasJourneyType = typeof pesquisarComprasJourney;

export default pesquisarComprasJourney;
