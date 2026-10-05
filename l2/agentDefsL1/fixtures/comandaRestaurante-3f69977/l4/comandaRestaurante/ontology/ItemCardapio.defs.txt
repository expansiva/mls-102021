/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemCardapio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemCardapio = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemCardapio",
  "title": "Item do cardápio",
  "description": "Item disponível no cardápio do restaurante, com nome e preço vigente para lançamento em comandas.",
  "displayField": "name",
  "relationships": {
    "itensComanda": {
      "relationshipId": "itemComandaItemCardapio",
      "to": "ItemComanda",
      "via": "ItemComanda.itemCardapioId",
      "cardinality": "1:N",
      "title": "Lançamentos deste item",
      "description": "Um item do cardápio pode estar referenciado em vários lançamentos de item de comanda; cada lançamento referencia obrigatoriamente um item do cardápio.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "item referenciado"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um item do cardápio pelo identificador já conhecido · usa findOne por id no repositório de ItemCardapio · o garçom consulta o item selecionado antes de lançá-lo na comanda.",
    "locate.byColumn": "Lista itens do cardápio pelo nome indexado, com ordenação e paginação · usa findMany com filtro de igualdade na coluna name · a equipe autorizada localiza itens cadastrados.",
    "locate.byText": "Pesquisa itens do cardápio por trecho do nome · usa ILIKE na coluna name · o garçom encontra o item a lançar na comanda.",
    "count": "Conta os itens do cardápio que correspondem à consulta · usa count com o mesmo filtro da listagem · a equipe autorizada acompanha o total de itens encontrados.",
    "create": "Cadastra um novo item com nome e preço vigente · usa insert no repositório de ItemCardapio · a equipe interna autorizada mantém o cardápio.",
    "update": "Altera o nome ou o preço vigente de um item do cardápio · usa update parcial por id no repositório de ItemCardapio · a equipe interna autorizada mantém o cardápio.",
    "delete": "Remove fisicamente um item do cardápio que não deve mais ser mantido · usa delete por id no repositório de ItemCardapio · a equipe interna autorizada administra cadastros indevidos."
  },
  "rules": [],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_itemcardapio",
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
      "name": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Nome",
        "description": "Nome pelo qual o item é apresentado no cardápio e localizado pela equipe.",
        "maxLength": 120,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes do item",
        "description": "Informações do item do cardápio que não são usadas como índice de consulta.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "precoVigente": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Preço vigente",
            "description": "Preço atualmente cobrado pelo item quando ele é lançado em uma comanda.",
            "maxLength": 0,
            "min": 0,
            "max": 99999999
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComandaRestauranteEntityItemCardapioType = typeof comandaRestauranteEntityItemCardapio;

export default comandaRestauranteEntityItemCardapio;
