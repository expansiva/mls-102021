/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/Comanda.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityComanda = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "Comanda",
  "title": "Comanda",
  "description": "Registro do atendimento aberto para uma mesa, reunindo os itens válidos, o desconto e os dados de pagamento no fechamento.",
  "displayField": "number",
  "relationships": {
    "mesa": {
      "relationshipId": "comandaMesa",
      "to": "Mesa",
      "via": "Comanda.mesaId",
      "cardinality": "N:1",
      "title": "Mesa da comanda",
      "description": "Cada comanda é aberta obrigatoriamente para uma mesa, e uma mesa pode receber várias comandas ao longo do tempo.",
      "mode": "fk",
      "required": "Sempre, ao abrir uma comanda.",
      "role": "mesa atendida"
    },
    "itens": {
      "relationshipId": "itemComandaComanda",
      "to": "ItemComanda",
      "via": "ItemComanda.comandaId",
      "cardinality": "1:N",
      "title": "Itens lançados",
      "description": "Uma comanda pode reunir vários itens lançados; cada item pertence obrigatoriamente a uma única comanda.",
      "mode": "fk",
      "direction": "to",
      "required": "Quando houver itens lançados na comanda.",
      "role": "itens da comanda"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma comanda pelo identificador da linha no repositório, para o garçom ou caixa que já a tem em contexto.",
    "locate.byColumn": "Lista comandas por mesa ou situação indexada, com ordenação e paginação, para o garçom localizar uma comanda aberta e o caixa localizar a comanda a fechar.",
    "count": "Conta as comandas que correspondem aos filtros de mesa ou situação, para as telas de atendimento e fechamento exibirem seus totais.",
    "listByForeignKey": "Lista as comandas vinculadas a uma mesa pelo campo de mesa, para consultar os atendimentos daquela mesa.",
    "create": "Cria uma comanda aberta para a mesa disponível selecionada, para o garçom iniciar o atendimento.",
    "transition": "Move a comanda de aberta para fechada com as regras de pagamento e desconto, para o caixa concluir a cobrança.",
    "uniqueKey": "Recusa uma segunda comanda com o mesmo número sequencial pela chave única da tabela, para preservar a identificação da cobrança.",
    "transaction": "Grava de forma atômica a abertura ou o fechamento da comanda e a atualização da disponibilidade da mesa, para o garçom e o caixa não deixarem atendimento e mesa inconsistentes.",
    "sequence.next": "Emite o próximo número sequencial da comanda pela sequência da plataforma, para identificar a comanda criada pelo garçom."
  },
  "rules": [
    "mesaDisponivelParaAbrirComanda",
    "umaComandaAbertaPorMesa",
    "itensSomenteEmComandaAberta",
    "pagamentoObrigatorioNoFechamento",
    "descontoNaoExcedeSubtotal",
    "fechamentoLiberaMesa"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "comandaRestaurante_comanda",
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
      "number": {
        "type": "integer",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Número da comanda",
        "description": "Número sequencial usado pelo garçom e pelo caixa para identificar a comanda.",
        "maxLength": 0,
        "min": 1,
        "max": 0
      },
      "mesaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Mesa"
        ],
        "title": "Mesa",
        "description": "Mesa para a qual a comanda foi aberta.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "open",
            "title": "Aberta",
            "description": "A comanda aceita lançamento e cancelamento de itens pelo garçom."
          },
          {
            "value": "closed",
            "title": "Fechada",
            "description": "A cobrança e a forma de pagamento foram registradas pelo caixa."
          }
        ],
        "title": "Situação",
        "description": "Indica se a comanda ainda está em atendimento ou se já foi fechada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da comanda",
        "description": "Dados informados no fechamento da comanda que não precisam de busca ou ordenação.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "discountAmount": {
            "type": "money",
            "of": "ContactSummary",
            "title": "Desconto",
            "description": "Valor do desconto opcional aplicado pelo caixa ao fechar a comanda.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "paymentMethod": {
            "type": "enum",
            "of": "ContactSummary",
            "values": [
              {
                "value": "cash",
                "title": "Dinheiro",
                "description": "Pagamento recebido em dinheiro."
              },
              {
                "value": "debitCard",
                "title": "Cartão de débito",
                "description": "Pagamento realizado com cartão de débito."
              },
              {
                "value": "creditCard",
                "title": "Cartão de crédito",
                "description": "Pagamento realizado com cartão de crédito."
              },
              {
                "value": "pix",
                "title": "Pix",
                "description": "Pagamento realizado por Pix."
              }
            ],
            "title": "Forma de pagamento",
            "description": "Forma de pagamento registrada pelo caixa no fechamento da comanda.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "subtotal": {
            "type": "money",
            "derived": true,
            "title": "Subtotal dos itens",
            "description": "Soma dos valores dos itens válidos lançados nesta comanda, considerando a quantidade e o preço registrado em cada item."
          },
          "totalComanda": {
            "type": "money",
            "derived": true,
            "title": "Total da comanda",
            "description": "Valor a cobrar, calculado pelos itens válidos da comanda menos o desconto aplicado pelo caixa."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "number"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "closed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "fecharComanda",
      "from": [
        "open"
      ],
      "to": "closed",
      "by": [
        "caixa"
      ],
      "description": "O caixa registra o desconto opcional e a forma de pagamento, fecha a comanda e libera a mesa para novo atendimento.",
      "payload": [
        "details.discountAmount",
        "details.paymentMethod"
      ],
      "ruleRefs": [
        "pagamentoObrigatorioNoFechamento",
        "descontoNaoExcedeSubtotal",
        "fechamentoLiberaMesa"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComandaRestauranteEntityComandaType = typeof comandaRestauranteEntityComanda;

export default comandaRestauranteEntityComanda;
