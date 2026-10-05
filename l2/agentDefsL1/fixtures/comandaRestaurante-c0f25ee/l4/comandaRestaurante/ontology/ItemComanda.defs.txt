/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemComanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemComanda = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemComanda",
  "title": "Item da comanda",
  "description": "Lançamento de um item do cardápio em uma comanda, com quantidade, observação, preço registrado e possibilidade de cancelamento enquanto a comanda está aberta.",
  "displayField": "id",
  "relationships": {
    "comanda": {
      "relationshipId": "itemComandaComanda",
      "to": "Comanda",
      "via": "ItemComanda.comandaId",
      "cardinality": "N:1",
      "title": "Comanda do item",
      "description": "Cada item lançado pertence obrigatoriamente a uma comanda, que pode conter vários itens.",
      "mode": "fk",
      "required": "sempre"
    },
    "itemCardapio": {
      "relationshipId": "itemComandaItemCardapio",
      "to": "ItemCardapio",
      "via": "ItemComanda.itemCardapioId",
      "cardinality": "N:1",
      "title": "Item do cardápio lançado",
      "description": "Cada lançamento referencia obrigatoriamente o item do cardápio escolhido, que pode ser lançado em várias comandas.",
      "mode": "fk",
      "required": "sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê um item da comanda pelo identificador da linha para que o garçom confira o lançamento antes de cancelá-lo.",
    "locate.byColumn": "Localiza itens da comanda pelas colunas indexadas de comanda, item do cardápio ou situação para apoiar a conferência dos lançamentos.",
    "listByForeignKey": "Lista os itens vinculados a uma comanda pela chave estrangeira para exibir seus lançamentos e compor o total ao garçom e ao caixa.",
    "create": "Cria um lançamento de item com a quantidade, observação opcional e preço unitário registrado para o garçom em uma comanda aberta.",
    "transition": "Move o item lançado para cancelado pela transição cancelarItemComanda para o garçom corrigir um lançamento feito por engano em comanda aberta."
  },
  "rules": [
    "itemComandaOperacaoSomenteComandaAberta"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_itemcomanda",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "comandaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Comanda"
        ],
        "title": "Comanda",
        "description": "Comanda à qual este lançamento pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "itemCardapioId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "ItemCardapio"
        ],
        "title": "Item do cardápio",
        "description": "Item do cardápio escolhido para este lançamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "Address",
        "values": [
          {
            "value": "launched",
            "title": "Lançado",
            "description": "Item lançado e considerado no total da comanda."
          },
          {
            "value": "canceled",
            "title": "Cancelado",
            "description": "Item cancelado pelo garçom e desconsiderado no total da comanda."
          }
        ],
        "title": "Situação",
        "description": "Situação do item lançado na comanda.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados do lançamento",
        "description": "Dados registrados para o item lançado na comanda.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "quantidade": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade",
            "description": "Quantidade do item do cardápio lançada na comanda.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          },
          "observacao": {
            "type": "text",
            "of": "Address",
            "title": "Observação",
            "description": "Orientação ou observação informada para o preparo do item, quando necessária.",
            "maxLength": 500,
            "min": 0,
            "max": 0
          },
          "precoUnitario": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Preço unitário registrado",
            "description": "Preço unitário do item do cardápio no momento em que foi lançado.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "valorTotal": {
            "type": "money",
            "derived": true,
            "title": "Valor total do item",
            "description": "Quantidade lançada multiplicada pelo preço unitário registrado; o item cancelado é desconsiderado no total da comanda."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "launched",
      "reachedBy": "actor"
    },
    {
      "state": "canceled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarItemComanda",
      "from": [
        "launched"
      ],
      "to": "canceled",
      "by": [
        "garcom"
      ],
      "description": "Cancela um item lançado por engano enquanto a comanda permanece aberta.",
      "payload": [],
      "ruleRefs": [
        "itemComandaOperacaoSomenteComandaAberta"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComandaRestauranteEntityItemComandaType = typeof comandaRestauranteEntityItemComanda;

export default comandaRestauranteEntityItemComanda;
