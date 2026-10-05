/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/lancarItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const lancarItemComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "lancarItemComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Lançar item na comanda",
    "goal": "Adicionar um item do cardápio à comanda aberta com quantidade e observação quando necessário.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaAberta",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda aberta",
        "description": "O garçom usa a comanda em contexto ou localiza a comanda aberta da mesa."
      },
      {
        "stepId": "consultarItemCardapio",
        "kind": "inspect",
        "entity": "ItemCardapio",
        "title": "Consultar item do cardápio",
        "description": "O garçom consulta o item e o preço vigente no cardápio."
      },
      {
        "stepId": "adicionarItemComanda",
        "kind": "act",
        "entity": "ItemComanda",
        "effect": "create",
        "title": "Adicionar item pedido",
        "description": "O garçom lança o item escolhido na comanda, informando a quantidade e a observação quando houver."
      }
    ],
    "outcome": {
      "statement": "O item solicitado é incluído na comanda aberta.",
      "evidence": [
        "Item, quantidade e observação aparecem na comanda.",
        "Total da comanda é atualizado."
      ]
    }
  },
  "businessHash": "sha256:f3080160af8d92e774e8a6f3aec2b783132adf9ffd0f15bc4886f68a5b10531f"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type LancarItemComandaJourneyType = typeof lancarItemComandaJourney;

export default lancarItemComandaJourney;
