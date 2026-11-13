/// <mls fileReference="_102047_/l4/compras/journeys/pesquisarComprasGerente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const pesquisarComprasGerenteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "pesquisarComprasGerente",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Pesquisar solicitações e pedidos",
    "goal": "Consultar solicitações e pedidos por produto, fornecedor, situação e período.",
    "icon": "search",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "filtrarSolicitacoesGerente",
        "kind": "locate",
        "entity": "SolicitacaoCompra",
        "title": "Filtrar solicitações",
        "description": "O gerente filtra solicitações por produto, fornecedor, situação e período.",
        "icon": "filter"
      },
      {
        "stepId": "filtrarPedidosGerente",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "Filtrar pedidos",
        "description": "O gerente filtra pedidos por produto, fornecedor, situação e período.",
        "icon": "filter"
      },
      {
        "stepId": "verPedidoGerente",
        "kind": "inspect",
        "entity": "PedidoCompra",
        "title": "Ver detalhes do pedido",
        "description": "O gerente consulta os detalhes e recebimentos de um pedido.",
        "icon": "eye"
      }
    ],
    "outcome": {
      "statement": "O gerente encontrou as solicitações e pedidos procurados.",
      "evidence": [
        "Lista filtrada exibida",
        "Detalhe do pedido aberto"
      ]
    }
  },
  "businessHash": "sha256:10b0a3624292427a1a4ede607b9c4975c4d14d53cd1875e6349656c2b3c21624"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type PesquisarComprasGerenteJourneyType = typeof pesquisarComprasGerenteJourney;

export default pesquisarComprasGerenteJourney;
