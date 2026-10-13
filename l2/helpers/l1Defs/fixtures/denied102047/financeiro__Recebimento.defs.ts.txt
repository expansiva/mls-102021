/// <mls fileReference="_102047_/l4/financeiro/ontology/Recebimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityRecebimento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "Recebimento",
  "title": "Recebimento",
  "description": "Baixa total ou parcial de um título, em dinheiro, pix ou cartão via Stripe, registrada pelo caixa ou paga pelo pagador no portal; pode ser estornada apenas no mesmo dia.",
  "displayField": "numero",
  "relationships": {
    "titulo": {
      "relationshipId": "recebimentoTitulo",
      "to": "TituloReceber",
      "via": "Recebimento.tituloId",
      "cardinality": "N:1",
      "title": "Título baixado",
      "description": "Cada recebimento dá baixa, total ou parcial, em um título a receber.",
      "mode": "fk",
      "required": true
    },
    "pagador": {
      "relationshipId": "pagadorRecebimentos",
      "to": "Pagador",
      "via": "TituloReceber",
      "cardinality": "N:1",
      "title": "Pagador do recebimento",
      "description": "Pagador obtido pelo título baixado; usado no extrato e no portal.",
      "mode": "throughTable",
      "path": "Pagador <- TituloReceber.pagadorId <- Recebimento.tituloId",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Abre um recebimento pelo id para o caixa conferir valor, forma, título e data, e para o pagador ver o detalhe no portal.",
    "locate.byColumn": "Lista recebimentos por data, forma de pagamento, situação ou título, ordenados por data; o caixa localiza os de hoje para estornar.",
    "count": "Conta os recebimentos de um filtro, como os registrados hoje no caixa, para totalizar a lista.",
    "listByForeignKey": "Lista os recebimentos de um título ou de vários títulos de um pagador, alimentando o extrato do gerente financeiro e o portal do pagador.",
    "create": "Registra o recebimento total ou parcial feito pelo caixa ou o pagamento com cartão feito pelo pagador no portal.",
    "transition": "Move o recebimento de registrado para estornado quando o caixa estorna no mesmo dia.",
    "uniqueKey": "Garante que o número do recebimento não se repete.",
    "transaction": "Grava o recebimento e atualiza o saldo do título juntos, tudo ou nada, tanto na baixa quanto no estorno.",
    "read.mdmRecord": "Lê pelo título o registro mestre do pagador para mostrar o nome no recebimento e no extrato.",
    "sequence.next": "Emite o número do recebimento na criação, pela chave financeiro.Recebimento.",
    "attach.document": "Anexa ao recebimento o comprovante do pix ou do cartão quando o caixa precisa guardá-lo.",
    "comment": "Permite ao caixa e ao gerente financeiro deixar notas sobre um recebimento ou seu estorno.",
    "financeiro.pagarComStripe": "Cobra o cartão via Stripe, no caixa ou no portal do pagador, e só registra o recebimento após a confirmação do pagamento.",
    "financeiro.estornarStripe": "Ao estornar um recebimento em cartão, solicita o reembolso ao Stripe pelo identificador do pagamento."
  },
  "rules": [
    "numeroRecebimentoUnico",
    "valorRecebidoAteSaldo",
    "tituloEmAbertoParaReceber",
    "estornoSomenteMesmoDia",
    "pagadorPagaSomenteComCartao",
    "pagadorVeSomentePropriosRecebimentos",
    "cartaoExigeConfirmacaoStripe"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_recebimento",
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
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Número do recebimento",
        "description": "Número que o caixa e o pagador citam para identificar o recebimento, emitido pela sequência da plataforma na criação.",
        "maxLength": 20
      },
      "tituloId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "TituloReceber"
        ],
        "title": "Título",
        "description": "Título a receber ao qual este recebimento dá baixa total ou parcial; por ele se chega ao pagador e à origem."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "registrado",
            "title": "Registrado",
            "description": "Recebimento válido, abatendo o saldo do título."
          },
          {
            "value": "estornado",
            "title": "Estornado",
            "description": "Recebimento desfeito no mesmo dia; não abate mais o saldo do título."
          }
        ],
        "title": "Situação",
        "description": "Situação do recebimento: registrado ou estornado."
      },
      "dataRecebimento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data do recebimento",
        "description": "Dia em que o valor foi recebido; usada para localizar os recebimentos de hoje, permitir o estorno no mesmo dia e compor o extrato por período."
      },
      "formaPagamento": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "dinheiro",
            "title": "Dinheiro"
          },
          {
            "value": "pix",
            "title": "Pix"
          },
          {
            "value": "cartao",
            "title": "Cartão (Stripe)"
          }
        ],
        "title": "Forma de pagamento",
        "description": "Meio pelo qual o valor foi recebido; filtra o fechamento do caixa e o extrato."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do recebimento que são apenas exibidos.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor recebido",
            "description": "Valor abatido do saldo em aberto do título; menor que o saldo caracteriza baixa parcial.",
            "min": 0.01
          },
          "canal": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "caixa",
                "title": "Caixa"
              },
              {
                "value": "portal",
                "title": "Portal do pagador"
              }
            ],
            "title": "Canal",
            "description": "Onde o recebimento foi registrado: no caixa ou pelo pagador no portal."
          },
          "registradoEm": {
            "type": "timestamp",
            "required": true,
            "title": "Registrado em",
            "description": "Momento exato em que o recebimento foi registrado."
          },
          "stripe": {
            "type": "object",
            "title": "Pagamento Stripe",
            "description": "Referência da cobrança no Stripe quando a forma de pagamento é cartão.",
            "fields": {
              "paymentIntentId": {
                "type": "string",
                "required": true,
                "title": "Identificador do pagamento",
                "description": "Identificador da intenção de pagamento confirmada no Stripe, usado para conciliar e estornar.",
                "maxLength": 255
              },
              "bandeira": {
                "type": "string",
                "title": "Bandeira",
                "description": "Bandeira do cartão informada pelo Stripe.",
                "maxLength": 30
              },
              "ultimosDigitos": {
                "type": "string",
                "title": "Últimos dígitos",
                "description": "Quatro últimos dígitos do cartão, para conferência no extrato.",
                "pattern": "^\\d{4}$"
              }
            }
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Anotação livre do caixa sobre o recebimento.",
            "maxLength": 500
          },
          "estorno": {
            "type": "object",
            "title": "Estorno",
            "description": "Dados do estorno, preenchidos quando o caixa desfaz o recebimento.",
            "fields": {
              "motivo": {
                "type": "text",
                "required": true,
                "title": "Motivo do estorno",
                "description": "Por que o recebimento foi desfeito.",
                "maxLength": 500
              },
              "estornadoEm": {
                "type": "timestamp",
                "required": true,
                "title": "Estornado em",
                "description": "Momento em que o estorno foi registrado."
              }
            }
          },
          "estornavel": {
            "type": "boolean",
            "derived": true,
            "title": "Pode ser estornado",
            "description": "Recebimento registrado cuja data de recebimento é hoje."
          },
          "baixaParcial": {
            "type": "boolean",
            "derived": true,
            "title": "Baixa parcial",
            "description": "Recebimento registrado cujo valor ficou abaixo do saldo em aberto que o título tinha quando ele foi registrado, deixando saldo a receber."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "registrado",
      "reachedBy": "actor"
    },
    {
      "state": "estornado",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "estornar",
      "from": [
        "registrado"
      ],
      "to": "estornado",
      "by": [
        "caixa"
      ],
      "description": "O caixa estorna o recebimento no mesmo dia em que foi registrado; o valor volta ao saldo em aberto do título.",
      "payload": [
        "details.estorno.motivo"
      ],
      "ruleRefs": [
        "estornoSomenteMesmoDia"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityRecebimentoType = typeof financeiroEntityRecebimento;

export default financeiroEntityRecebimento;
