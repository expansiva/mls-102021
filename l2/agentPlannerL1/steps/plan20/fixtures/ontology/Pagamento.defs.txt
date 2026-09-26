/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Pagamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPagamento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Pagamento",
  "title": "Pagamento",
  "description": "Registro de um pagamento recebido para regularizar uma mensalidade.",
  "displayField": "id",
  "relationships": {
    "mensalidade": {
      "relationshipId": "pagamentoMensalidade",
      "to": "Mensalidade",
      "via": "Pagamento.mensalidadeId",
      "cardinality": "N:1",
      "title": "Mensalidade paga",
      "description": "Cada pagamento registrado pertence à mensalidade que está sendo regularizada.",
      "mode": "fk",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê um pagamento pelo identificador da linha para a recepção conferir o recebimento registrado.",
    "locate.byColumn": "Lista pagamentos por mensalidade ou por data de pagamento, com ordenação e paginação, para a recepção consultar recebimentos.",
    "count": "Conta os pagamentos que correspondem aos filtros de mensalidade ou data para a conferência da recepção.",
    "listByForeignKey": "Lista os pagamentos vinculados a uma mensalidade pelo campo mensalidadeId para exibir os recebimentos que a regularizam.",
    "create": "Registra um pagamento com data, valor e forma de pagamento para a recepção regularizar uma mensalidade.",
    "transaction": "Grava o pagamento e atualiza a situação da mensalidade e a regularidade do aluno de forma atômica durante o registro pela recepção."
  },
  "rules": [
    "paymentAmountPositive",
    "paymentUpdatesMonthlyFee",
    "paymentRegularizesStudentWhenApplicable"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_pagamento",
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
      "mensalidadeId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Mensalidade"
        ],
        "title": "Mensalidade",
        "description": "Mensalidade que está sendo regularizada por este pagamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataPagamento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data do pagamento",
        "description": "Data em que a academia recebeu o pagamento da mensalidade.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados do pagamento",
        "description": "Informações registradas pela recepção sobre o valor e a forma de recebimento.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Valor pago",
            "description": "Valor efetivamente recebido para a mensalidade.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "formaPagamento": {
            "type": "enum",
            "required": true,
            "of": "ContactSummary",
            "values": [
              {
                "value": "cash",
                "title": "Dinheiro",
                "description": "Pagamento recebido em dinheiro."
              },
              {
                "value": "pix",
                "title": "Pix",
                "description": "Pagamento recebido por Pix."
              },
              {
                "value": "debitCard",
                "title": "Cartão de débito",
                "description": "Pagamento recebido por cartão de débito."
              },
              {
                "value": "creditCard",
                "title": "Cartão de crédito",
                "description": "Pagamento recebido por cartão de crédito."
              },
              {
                "value": "bankTransfer",
                "title": "Transferência bancária",
                "description": "Pagamento recebido por transferência bancária."
              }
            ],
            "title": "Forma de pagamento",
            "description": "Meio pelo qual o aluno realizou o pagamento.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityPagamentoType = typeof mensalidadesAcademiaEntityPagamento;

export default mensalidadesAcademiaEntityPagamento;
