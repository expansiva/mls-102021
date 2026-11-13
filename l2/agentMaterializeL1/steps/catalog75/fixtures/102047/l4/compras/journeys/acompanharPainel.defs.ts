/// <mls fileReference="_102047_/l4/compras/journeys/acompanharPainel.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharPainelJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharPainel",
  "business": {
    "actorRef": "gerenteCompras",
    "title": "Acompanhar painel de compras",
    "goal": "Ver pendências de autorização, pedidos em aberto e atrasados e o total comprado por fornecedor no mês.",
    "icon": "layout-dashboard",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "verPainel",
        "kind": "inspect",
        "entity": "PainelCompras",
        "title": "Ver painel",
        "description": "O gerente vê solicitações aguardando autorização, pedidos em aberto e atrasados e o total comprado por fornecedor no mês.",
        "icon": "layout-dashboard"
      },
      {
        "stepId": "abrirAtrasados",
        "kind": "locate",
        "entity": "PedidoCompra",
        "title": "Abrir pedidos atrasados",
        "description": "O gerente abre a lista de pedidos atrasados a partir do painel.",
        "icon": "clock"
      }
    ],
    "outcome": {
      "statement": "O gerente conhece a situação das compras do mês.",
      "evidence": [
        "Contadores de solicitações pendentes, pedidos em aberto e atrasados",
        "Total comprado por fornecedor no mês"
      ]
    }
  },
  "businessHash": "sha256:b6b7cab3ea513af927e344cc63dca981e3ecbf204ef31b0efcd9f0b60a23368e"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharPainelJourneyType = typeof acompanharPainelJourney;

export default acompanharPainelJourney;
