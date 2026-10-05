/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Mesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityMesa = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "Mesa",
  "title": "Mesa",
  "description": "Mesa operada pelo restaurante para receber comandas; sua disponibilidade é calculada pelas comandas abertas vinculadas.",
  "displayField": "code",
  "relationships": {
    "comandas": {
      "relationshipId": "comandaMesa",
      "to": "Comanda",
      "via": "Comanda.mesaId",
      "cardinality": "1:N",
      "title": "Comandas da mesa",
      "description": "Comandas abertas e já fechadas para esta mesa ao longo do atendimento.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma mesa pelo identificador da linha no repositório para exibir seus dados a quem já a selecionou.",
    "locate.byColumn": "Lista mesas por código, com paginação e ordenação, para o garçom e o caixa localizarem uma mesa.",
    "count": "Conta as mesas que atendem aos filtros de código para apoiar as listas operadas pelo garçom e pelo caixa.",
    "create": "Cadastra uma mesa com código único no repositório para a operação do restaurante.",
    "update": "Atualiza os dados próprios de uma mesa no repositório para sua manutenção operacional.",
    "delete": "Remove fisicamente uma mesa do repositório durante a manutenção autorizada da configuração do restaurante.",
    "uniqueKey": "Impede o cadastro de duas mesas com o mesmo código por meio do índice único da tabela.",
    "listByForeignKey": "Lista as comandas vinculadas a uma mesa pelo vínculo com Comanda para consulta do atendimento.",
    "comandaRestaurante.locateAvailableTables": "Lista as mesas sem comanda aberta vinculada, calculando a disponibilidade, para o garçom escolher onde abrir uma comanda."
  },
  "rules": [
    "mesaDisponivelParaAbrirComanda"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_mesa",
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
      "code": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Código da mesa",
        "description": "Identificação curta da mesa usada pelo garçom e pelo caixa para localizá-la.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes da mesa",
        "description": "Dados próprios da mesa que não precisam de índice.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "disponivel": {
            "type": "boolean",
            "derived": true,
            "title": "Disponível",
            "description": "A mesa está disponível quando não possui nenhuma comanda aberta vinculada."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "code"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComandaRestauranteEntityMesaType = typeof comandaRestauranteEntityMesa;

export default comandaRestauranteEntityMesa;
