/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/abrirComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const abrirComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "abrirComanda",
  "business": {
    "actorRef": "garcom",
    "title": "Abrir comanda para mesa",
    "goal": "Abrir uma comanda para uma mesa disponível e iniciar o atendimento.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarMesaDisponivel",
        "kind": "locate",
        "entity": "Mesa",
        "title": "Localizar mesa disponível",
        "description": "O garçom localiza a mesa disponível que receberá a comanda."
      },
      {
        "stepId": "criarComanda",
        "kind": "act",
        "entity": "Comanda",
        "effect": "create",
        "title": "Abrir nova comanda",
        "description": "O garçom abre a comanda para a mesa selecionada, deixando-a ocupada."
      }
    ],
    "outcome": {
      "statement": "A comanda fica aberta e vinculada à mesa selecionada.",
      "evidence": [
        "Número da comanda exibido para a mesa.",
        "Mesa indicada como ocupada."
      ]
    }
  },
  "businessHash": "sha256:70449b6121b60e0fd8427f44c3cfbe2e6b4082ddd4d322a70ce84cd0c4d17223"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AbrirComandaJourneyType = typeof abrirComandaJourney;

export default abrirComandaJourney;
