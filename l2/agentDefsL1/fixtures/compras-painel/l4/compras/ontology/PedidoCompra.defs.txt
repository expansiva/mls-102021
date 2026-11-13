/// <mls fileReference="_102047_/l4/compras/ontology/PedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityPedidoCompra = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "PedidoCompra",
  "title": "Pedido de compra",
  "description": "Pedido gerado ao autorizar a solicitação, para o fornecedor escolhido, com produto, quantidade, preço e data prevista de entrega; acompanhado até o recebimento.",
  "displayField": "numero",
  "relationships": {
    "solicitacao": {
      "relationshipId": "pedidoSolicitacao",
      "to": "SolicitacaoCompra",
      "via": "PedidoCompra.solicitacaoId",
      "cardinality": "1:1",
      "title": "Solicitação de origem",
      "description": "O pedido é gerado a partir de uma solicitação autorizada.",
      "mode": "fk",
      "required": true
    },
    "fornecedor": {
      "relationshipId": "pedidoFornecedor",
      "to": "Fornecedor",
      "via": "PedidoCompra.fornecedorId",
      "cardinality": "N:1",
      "title": "Fornecedor do pedido",
      "description": "O pedido é feito ao fornecedor escolhido.",
      "mode": "fk",
      "required": true
    },
    "produto": {
      "relationshipId": "pedidoProduto",
      "to": "Produto",
      "via": "PedidoCompra.produtoId",
      "cardinality": "N:1",
      "title": "Produto do pedido",
      "description": "O pedido compra um produto.",
      "mode": "fk",
      "required": true
    },
    "recebimentos": {
      "relationshipId": "recebimentoPedido",
      "to": "Recebimento",
      "via": "Recebimento.pedidoCompraId",
      "cardinality": "1:N",
      "title": "Recebimentos do pedido",
      "description": "Recebimentos totais ou parciais registrados para o pedido.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "opcoesBaseadas": {
      "relationshipId": "opcaoPedidoAnterior",
      "to": "OpcaoCotacao",
      "via": "OpcaoCotacao.pedidoOrigemId",
      "cardinality": "1:N",
      "title": "Opções de cotação baseadas neste pedido",
      "description": "Opções pesquisadas cuja fonte é esta compra anterior.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Abre o pedido pelo id a partir do lembrete, da lista ou do painel, para o almoxarife conferir e para comprador e gerente consultarem detalhes e recebimentos.",
    "locate.byColumn": "Lista pedidos filtrados por produto, fornecedor, situação e período de emissão ou de entrega prevista, usada pelo comprador e pelo gerente na pesquisa e pelo gerente na lista de atrasados.",
    "locate.byText": "Encontra o pedido pelo número digitado na caixa de busca, para comprador, gerente e almoxarife.",
    "count": "Conta pedidos em aberto e atrasados para os indicadores do painel do gerente e o total das listas.",
    "listByForeignKey": "Lista os pedidos de um fornecedor ou de um produto e localiza o pedido de uma solicitação, usada nas telas de fornecedor, produto e solicitação e pela pesquisa por IA de compras anteriores.",
    "create": "Grava o pedido gerado pelo processo do ciclo da solicitação quando o gerente autoriza escolhendo uma opção, com fornecedor, produto, quantidade, preço e data prevista.",
    "transition": "Move o pedido para parcialmente recebido ou recebido quando o almoxarife registra o recebimento, conforme a soma recebida.",
    "uniqueKey": "Recusa um segundo pedido com o mesmo número ou para a mesma solicitação, garantido pelo motor na gravação.",
    "transaction": "Grava o recebimento, a entrada no estoque e a nova situação do pedido de uma só vez, ou nada.",
    "read.mdmRecord": "Lê o registro mestre do fornecedor e do produto para mostrar razão social e nome do produto nas listas e no detalhe do pedido.",
    "sequence.next": "Emite o número sequencial do pedido na sua geração, pela chave compras.PedidoCompra.",
    "comment": "Permite ao comprador, ao gerente e ao almoxarife deixar notas sobre o pedido, como contatos com o fornecedor sobre atraso.",
    "compras.lembrarEntrega": "Verificação diária que localiza pedidos não totalmente recebidos com entrega prevista para hoje ou atrasados e envia lembrete ao almoxarife, uma vez por dia."
  },
  "rules": [
    "numeroPedidoSequencial",
    "pedidoSomenteDeSolicitacaoAutorizada",
    "pedidoUsaOpcaoEscolhida",
    "umPedidoPorSolicitacao",
    "recebimentoNaoExcedePedido",
    "recebimentoAtualizaSituacaoPedido",
    "lembreteEntregaEAtraso"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_pedidocompra",
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
        "derived": true,
        "title": "Número do pedido",
        "description": "Número sequencial do pedido de compra, emitido pela plataforma na geração do pedido; é o número que se informa ao fornecedor e que se busca nas listas."
      },
      "solicitacaoId": {
        "type": "record",
        "required": true,
        "unique": true,
        "indexed": true,
        "to": [
          "SolicitacaoCompra"
        ],
        "title": "Solicitação de compra",
        "description": "Solicitação autorizada que deu origem a este pedido; cada solicitação gera no máximo um pedido."
      },
      "fornecedorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Fornecedor"
        ],
        "title": "Fornecedor",
        "description": "Fornecedor da opção escolhida pelo gerente na autorização; usado para filtrar pedidos e somar o total comprado por fornecedor."
      },
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto comprado, o mesmo da solicitação; usado para filtrar pedidos por produto e dar entrada no estoque no recebimento."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "emAberto",
            "title": "Em aberto",
            "description": "Pedido gerado, aguardando a chegada da mercadoria."
          },
          {
            "value": "parcialmenteRecebido",
            "title": "Parcialmente recebido",
            "description": "Chegou parte da quantidade pedida; o saldo ainda é aguardado."
          },
          {
            "value": "recebido",
            "title": "Recebido",
            "description": "Toda a quantidade pedida foi recebida."
          }
        ],
        "title": "Situação",
        "description": "Situação do pedido quanto ao recebimento, usada nos filtros e no painel."
      },
      "dataEmissao": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Data de emissão",
        "description": "Momento em que o sistema gerou o pedido após a autorização; usado na pesquisa por período e no total comprado no mês."
      },
      "dataPrevistaEntrega": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data prevista de entrega",
        "description": "Data em que o fornecedor deve entregar, calculada a partir do prazo de entrega da opção escolhida; a verificação diária lembra o almoxarife nesta data e a cada dia de atraso."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes do pedido",
        "description": "Condições comerciais e informações de acompanhamento do pedido.",
        "fields": {
          "quantidade": {
            "type": "number",
            "required": true,
            "title": "Quantidade pedida",
            "description": "Quantidade do produto pedida ao fornecedor, a mesma da solicitação autorizada.",
            "min": 0
          },
          "precoUnitario": {
            "type": "money",
            "required": true,
            "title": "Preço unitário",
            "description": "Preço unitário da opção escolhida pelo gerente na autorização.",
            "min": 0
          },
          "moeda": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "BRL",
                "title": "Real (BRL)"
              },
              {
                "value": "USD",
                "title": "Dólar americano (USD)"
              },
              {
                "value": "EUR",
                "title": "Euro (EUR)"
              }
            ],
            "title": "Moeda",
            "description": "Moeda do preço unitário, conforme a opção escolhida."
          },
          "prazoEntregaDias": {
            "type": "integer",
            "title": "Prazo de entrega (dias)",
            "description": "Prazo de entrega em dias informado na opção escolhida, base da data prevista de entrega.",
            "min": 0
          },
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Observações para o fornecedor ou para o recebimento.",
            "maxLength": 2000
          },
          "ultimoLembreteEm": {
            "type": "date",
            "derived": true,
            "title": "Último lembrete enviado",
            "description": "Dia do último lembrete de entrega ou de atraso enviado ao almoxarife pela verificação diária, para não repetir o lembrete no mesmo dia."
          },
          "valorTotal": {
            "type": "money",
            "derived": true,
            "title": "Valor total",
            "description": "Quantidade pedida multiplicada pelo preço unitário combinado no pedido."
          },
          "quantidadeRecebida": {
            "type": "number",
            "derived": true,
            "title": "Quantidade recebida",
            "description": "Soma das quantidades registradas nos recebimentos deste pedido."
          },
          "saldoAReceber": {
            "type": "number",
            "derived": true,
            "title": "Saldo a receber",
            "description": "Quantidade pedida menos a soma do que já foi recebido neste pedido."
          },
          "atrasado": {
            "type": "boolean",
            "derived": true,
            "title": "Atrasado",
            "description": "Pedido em aberto ou parcialmente recebido cuja data prevista de entrega é anterior a hoje."
          },
          "diasAtraso": {
            "type": "integer",
            "derived": true,
            "title": "Dias de atraso",
            "description": "Número de dias entre a data prevista de entrega e hoje, enquanto o pedido ainda não foi totalmente recebido; zero quando não está atrasado."
          },
          "entregaPrevistaHoje": {
            "type": "boolean",
            "derived": true,
            "title": "Entrega prevista para hoje",
            "description": "Pedido ainda não totalmente recebido cuja data prevista de entrega é hoje."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ],
    [
      "solicitacaoId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "emAberto",
      "reachedBy": "command"
    },
    {
      "state": "parcialmenteRecebido",
      "reachedBy": "actor"
    },
    {
      "state": "recebido",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "registrarRecebimentoParcial",
      "from": [
        "emAberto",
        "parcialmenteRecebido"
      ],
      "to": "parcialmenteRecebido",
      "by": [
        "almoxarife"
      ],
      "description": "Ao registrar um recebimento que ainda não completa a quantidade pedida, o pedido passa a parcialmente recebido.",
      "payload": [],
      "ruleRefs": [
        "recebimentoNaoExcedePedido",
        "recebimentoAtualizaSituacaoPedido"
      ]
    },
    {
      "transitionId": "concluirRecebimento",
      "from": [
        "emAberto",
        "parcialmenteRecebido"
      ],
      "to": "recebido",
      "by": [
        "almoxarife"
      ],
      "description": "Ao registrar o recebimento que completa a quantidade pedida, o pedido passa a recebido e deixa de gerar lembretes.",
      "payload": [],
      "ruleRefs": [
        "recebimentoNaoExcedePedido",
        "recebimentoAtualizaSituacaoPedido"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityPedidoCompraType = typeof comprasEntityPedidoCompra;

export default comprasEntityPedidoCompra;
