/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/cancelarItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cancelarItemComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cancelarItemComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Cancelar item lançado",
    "goal": "Cancelar um item lançado por engano em uma comanda que ainda está aberta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaCorrecao",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda aberta",
        "description": "O garçom usa a comanda em contexto ou localiza a comanda aberta da mesa."
      },
      {
        "stepId": "conferirItemLancado",
        "kind": "inspect",
        "entity": "ItemComanda",
        "title": "Conferir item lançado",
        "description": "O garçom confere o item lançado que precisa ser corrigido."
      },
      {
        "stepId": "cancelarItemErrado",
        "kind": "act",
        "entity": "ItemComanda",
        "effect": "transition",
        "transitionRef": "cancelarItemComanda",
        "title": "Cancelar item errado",
        "description": "O garçom cancela o item lançado por engano enquanto a comanda permanece aberta."
      }
    ],
    "outcome": {
      "statement": "O item incorreto deixa de compor a cobrança da comanda.",
      "evidence": [
        "Item exibido como cancelado na comanda.",
        "Total da comanda é recalculado."
      ]
    }
  },
  "businessHash": "sha256:17b94229c4958e856978d9212f49f6fe4c42ee2603f66b2924ca4e9778e66326"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CancelarItemComandaJourneyType = typeof cancelarItemComandaJourney;

export default cancelarItemComandaJourney;
