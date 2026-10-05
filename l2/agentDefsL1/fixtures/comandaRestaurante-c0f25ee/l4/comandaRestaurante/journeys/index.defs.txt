/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "comandaRestaurante",
  "journeys": [
    {
      "journeyId": "abrirComanda",
      "actorRef": "garcom",
      "title": "Abrir comanda para mesa"
    },
    {
      "journeyId": "lancarItemComanda",
      "actorRef": "garcom",
      "title": "Lançar item na comanda"
    },
    {
      "journeyId": "cancelarItemComanda",
      "actorRef": "garcom",
      "title": "Cancelar item lançado"
    },
    {
      "journeyId": "fecharComanda",
      "actorRef": "caixa",
      "title": "Fechar comanda e liberar mesa"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type ComandaRestauranteJourneyIndexType = typeof comandaRestauranteJourneyIndex;

export default comandaRestauranteJourneyIndex;
