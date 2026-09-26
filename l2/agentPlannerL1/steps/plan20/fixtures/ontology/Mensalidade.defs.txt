/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Mensalidade.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMensalidade = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Mensalidade",
  "title": "Mensalidade",
  "description": "Cobrança mensal gerada para uma matrícula ativa, com valor, vencimento e situação de pagamento.",
  "displayField": "id",
  "relationships": {
    "matricula": {
      "relationshipId": "mensalidadeMatricula",
      "to": "Matricula",
      "via": "Mensalidade.matriculaId",
      "cardinality": "N:1",
      "title": "Matrícula da mensalidade",
      "description": "Cada mensalidade pertence à matrícula para a qual foi gerada.",
      "mode": "fk",
      "required": "Sempre, ao gerar a mensalidade.",
      "role": "cobrança da matrícula"
    },
    "pagamentos": {
      "relationshipId": "pagamentoMensalidade",
      "to": "Pagamento",
      "via": "Pagamento.mensalidadeId",
      "cardinality": "1:N",
      "title": "Pagamentos da mensalidade",
      "description": "Pagamentos registrados para quitar total ou parcialmente esta mensalidade.",
      "mode": "fk",
      "direction": "to",
      "required": "Quando houver pagamento registrado para esta mensalidade.",
      "role": "quitação"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma mensalidade pelo identificador da linha para a recepção ou a gerência conferir a cobrança selecionada.",
    "locate.byColumn": "Lista mensalidades por matrícula, competência ou vencimento, com paginação, para a recepção e a gerência localizarem cobranças.",
    "count": "Conta mensalidades conforme os filtros de matrícula, competência ou vencimento para exibir totais nas consultas da gerência.",
    "listByForeignKey": "Lista as mensalidades vinculadas a uma matrícula pelo campo matriculaId para a recepção e a gerência consultarem o histórico de cobranças.",
    "create": "Cria a mensalidade de uma matrícula ativa para a competência mensal, com valor do plano e vencimento, durante a geração feita pela gerência.",
    "uniqueKey": "Impede uma segunda mensalidade para a mesma matrícula e competência pelo índice único, protegendo a geração mensal da gerência.",
    "transaction": "Grava em uma única transação as mensalidades geradas para as matrículas ativas do mês pela gerência."
  },
  "rules": [
    "mensalidadeUnicaPorMatriculaECompetencia",
    "mensalidadeGeradaParaMatriculaAtiva",
    "situacaoMensalidadeDerivada"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_mensalidade",
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
      "matriculaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Matricula"
        ],
        "title": "Matrícula",
        "description": "Matrícula ativa para a qual esta mensalidade foi gerada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "competencia": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Competência",
        "description": "Mês de referência da cobrança mensal.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "vencimento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Vencimento",
        "description": "Data em que a mensalidade deve ser paga, definida a partir do dia de vencimento do plano.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados da mensalidade",
        "description": "Informações próprias da cobrança mensal que não são usadas como filtro ou ordenação.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "valorCobranca": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor da cobrança",
            "description": "Valor da mensalidade gerada conforme o plano vigente na matrícula.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "totalPago": {
            "type": "money",
            "derived": true,
            "title": "Total pago",
            "description": "Soma dos pagamentos registrados para esta mensalidade."
          },
          "saldoDevedor": {
            "type": "money",
            "derived": true,
            "title": "Saldo devedor",
            "description": "Valor da cobrança menos a soma dos pagamentos registrados para esta mensalidade, nunca inferior a zero."
          },
          "situacao": {
            "type": "string",
            "derived": true,
            "title": "Situação",
            "description": "Paga quando os pagamentos registrados alcançam o valor da cobrança; vencida quando ainda há saldo devedor e o vencimento é anterior a hoje; em aberto nos demais casos."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "matriculaId",
      "competencia"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityMensalidadeType = typeof mensalidadesAcademiaEntityMensalidade;

export default mensalidadesAcademiaEntityMensalidade;
