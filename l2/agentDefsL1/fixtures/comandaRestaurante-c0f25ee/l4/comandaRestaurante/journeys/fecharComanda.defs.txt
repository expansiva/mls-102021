/// <mls fileReference="_102047_/l4/comandaRestaurante/journeys/fecharComanda.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const fecharComandaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "fecharComanda",
  "business": {
    "actorRef": "caixa",
    "title": "Fechar comanda e liberar mesa",
    "goal": "Conferir a cobrança, registrar o pagamento e encerrar a comanda para liberar a mesa.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarComandaParaFechamento",
        "kind": "locate",
        "entity": "Comanda",
        "title": "Localizar comanda aberta",
        "description": "O caixa usa a comanda em contexto ou localiza a comanda aberta da mesa."
      },
      {
        "stepId": "conferirTotalComanda",
        "kind": "inspect",
        "entity": "Comanda",
        "title": "Conferir total da comanda",
        "description": "O caixa consulta os itens válidos e o total calculado da comanda."
      },
      {
        "stepId": "fecharComandaPaga",
        "kind": "act",
        "entity": "Comanda",
        "effect": "transition",
        "transitionRef": "fecharComanda",
        "title": "Registrar pagamento e fechar",
        "description": "O caixa aplica desconto opcional, registra a forma de pagamento, fecha a comanda e libera a mesa."
      }
    ],
    "outcome": {
      "statement": "A comanda é encerrada com o pagamento registrado e a mesa fica disponível.",
      "evidence": [
        "Comanda exibida como fechada.",
        "Forma de pagamento e desconto aplicado, se houver, ficam registrados.",
        "Mesa indicada como disponível."
      ]
    }
  },
  "businessHash": "sha256:c330f8cd291e0b959531f52135ab3eddc86c458d4b345cfefe63b5c8ae647a91"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type FecharComandaJourneyType = typeof fecharComandaJourney;

export default fecharComandaJourney;
