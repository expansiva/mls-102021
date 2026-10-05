/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "businessDomain": "Gestão de comandas de restaurante",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "comandaRestaurante",
    "description": "Branch details.comandaRestaurante of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Mesa",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "ItemCardapio",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "Comanda",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ItemComanda",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "comandaMesa",
      "from": "Comanda",
      "to": "Mesa",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada comanda é aberta obrigatoriamente para uma mesa, e uma mesa pode receber várias comandas ao longo do tempo.",
      "field": "Comanda.mesaId"
    },
    {
      "relationshipId": "itemComandaComanda",
      "from": "ItemComanda",
      "to": "Comanda",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada item lançado pertence obrigatoriamente a uma comanda, que pode conter vários itens.",
      "field": "ItemComanda.comandaId"
    },
    {
      "relationshipId": "itemComandaItemCardapio",
      "from": "ItemComanda",
      "to": "ItemCardapio",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada lançamento referencia obrigatoriamente o item do cardápio escolhido, que pode ser lançado em várias comandas.",
      "field": "ItemComanda.itemCardapioId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ComandaRestauranteOntologyIndexType = typeof comandaRestauranteOntologyIndex;

export default comandaRestauranteOntologyIndex;
