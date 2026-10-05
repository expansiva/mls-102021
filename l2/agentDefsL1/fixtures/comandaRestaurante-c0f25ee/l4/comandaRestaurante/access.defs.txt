/// <mls fileReference="_102047_/l4/comandaRestaurante/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "comandaRestaurante",
  "actors": [
    {
      "actorId": "garcom",
      "kind": "internal",
      "origin": "named",
      "title": "Garçom",
      "description": "Abre comandas para mesas, lança itens e cancela itens lançados por engano enquanto a comanda está aberta.",
      "personEntity": ""
    },
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Fecha comandas, consulta o total, aplica descontos opcionais, registra a forma de pagamento e libera mesas.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "garcomAtendimentoComandas",
      "actorRef": "garcom",
      "title": "Atendimento de comandas",
      "description": "Permite ao garçom localizar mesas e itens do cardápio, abrir comandas e lançar ou cancelar itens durante o atendimento.",
      "entityRefs": [
        "Mesa",
        "ItemCardapio",
        "Comanda",
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange as mesas, os itens do cardápio e as comandas operados pelo restaurante."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O garçom vê a identificação e disponibilidade das mesas, os preços vigentes do cardápio, a situação e o subtotal das comandas e os dados dos itens necessários ao atendimento, sem acesso aos dados de pagamento e desconto.",
        "allowedFields": [
          "Mesa.code",
          "Mesa.details.disponivel",
          "ItemCardapio.name",
          "ItemCardapio.details.precoVigente",
          "Comanda.number",
          "Comanda.mesaId",
          "Comanda.status",
          "Comanda.details.subtotal",
          "ItemComanda.comandaId",
          "ItemComanda.itemCardapioId",
          "ItemComanda.status",
          "ItemComanda.details"
        ]
      }
    },
    {
      "grantId": "caixaFechamentoEcadastroOperacional",
      "actorRef": "caixa",
      "title": "Fechamento e cadastro operacional",
      "description": "Permite ao caixa consultar e fechar comandas, registrar desconto e pagamento, liberar mesas e manter as mesas e os itens do cardápio usados na operação.",
      "entityRefs": [
        "Mesa",
        "ItemCardapio",
        "Comanda",
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os registros operacionais do restaurante."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O caixa vê integralmente as mesas, o cardápio, as comandas e seus itens para conferir valores, registrar o fechamento e manter os cadastros operacionais."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ComandaRestauranteAccessType = typeof comandaRestauranteAccess;

export default comandaRestauranteAccess;
