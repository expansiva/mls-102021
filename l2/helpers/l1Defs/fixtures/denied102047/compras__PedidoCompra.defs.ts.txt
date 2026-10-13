/// <mls fileReference="_102047_/l4/compras/ontology/PedidoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityPedidoCompra = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "PedidoCompra",
  "title": "Pedido de compra",
  "description": "Pedido aberto pelo comprador para um fornecedor, enviado, aprovado ou rejeitado pelo gerente quando acima do valor limite, e recebido total ou parcialmente.",
  "displayField": "numero",
  "relationships": {
    "fornecedor": {
      "relationshipId": "pedidoFornecedor",
      "to": "Fornecedor",
      "via": "PedidoCompra.fornecedorId",
      "cardinality": "N:1",
      "title": "Fornecedor do pedido",
      "mode": "fk",
      "required": true
    },
    "comprador": {
      "relationshipId": "pedidoComprador",
      "to": "Comprador",
      "via": "PedidoCompra.compradorId",
      "cardinality": "N:1",
      "title": "Comprador do pedido",
      "mode": "fk",
      "required": true
    },
    "itens": {
      "relationshipId": "itemPedidoPedido",
      "to": "ItemPedido",
      "via": "ItemPedido.pedidoCompraId",
      "cardinality": "1:N",
      "title": "Itens do pedido",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "recebimentos": {
      "relationshipId": "recebimentoPedido",
      "to": "Recebimento",
      "via": "Recebimento.pedidoCompraId",
      "cardinality": "1:N",
      "title": "Recebimentos do pedido",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um pedido de compra pelo id ao abrir a tela do pedido; usado por comprador, gerente de compras e almoxarife.",
    "locate.byColumn": "Lista pedidos filtrando por situação, fornecedor, comprador, data do pedido e previsão de entrega, como pendentes de aprovação, em aberto e atrasados; usado pelo gerente e pelo almoxarife.",
    "locate.byText": "Busca pedidos pelo número digitado na caixa de pesquisa; usado pelo almoxarife ao localizar o pedido que chegou.",
    "count": "Conta pedidos por situação e filtro para os indicadores de em aberto e atrasados do painel do gerente.",
    "listByForeignKey": "Lista os pedidos de um fornecedor ou de um comprador, e hidrata itens e recebimentos de um pedido; usado na tela do pedido.",
    "create": "O comprador abre um novo pedido em rascunho para um fornecedor.",
    "update": "O comprador altera observações e previsão de entrega enquanto o pedido é rascunho.",
    "transition": "Move o pedido entre rascunho, aguardando aprovação, enviado, rejeitado e recebido; comprador envia, gerente aprova ou rejeita e o recebimento move o resto.",
    "uniqueKey": "Garante que o número do pedido nunca se repete, por índice único sobre a coluna numero.",
    "transaction": "Grava o recebimento, a mudança de situação do pedido e a entrada no estoque juntos, tudo ou nada.",
    "read.mdmRecord": "Lê o cadastro mestre do fornecedor (razão social, CNPJ, contato) e do comprador para mostrar no pedido.",
    "sequence.next": "Emite o número sequencial do pedido de compra ao abri-lo, pela sequência do módulo compras.",
    "comment": "Registra notas sobre o pedido, como justificativa de aprovação ou combinados com o fornecedor; usado pelo comprador e pelo gerente.",
    "attach.document": "Anexa ao pedido a nota fiscal, a confirmação do fornecedor ou o canhoto de entrega; usado pelo comprador e pelo almoxarife.",
    "compras.calcularTotal": "Calcula o valor total do pedido a partir dos itens e o compara com o valor limite para decidir se exige aprovação do gerente."
  },
  "rules": [
    "pedidoExigeItem",
    "aprovacaoAcimaLimite",
    "rejeicaoExigeMotivo",
    "recebimentoSomenteEnviado",
    "recebimentoNaoExcedePedido",
    "numeroPedidoSequencial"
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
        "title": "Número do pedido",
        "description": "Número do pedido citado pelas pessoas, emitido pela sequência numérica do módulo ao abrir o pedido.",
        "maxLength": 30
      },
      "fornecedorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Fornecedor"
        ],
        "title": "Fornecedor",
        "description": "Fornecedor (empresa) para o qual o pedido é feito. Nome, CNPJ e contato são lidos do cadastro mestre."
      },
      "compradorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Comprador"
        ],
        "title": "Comprador",
        "description": "Comprador que abriu e enviou o pedido."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "rascunho",
            "title": "Rascunho",
            "description": "Pedido em montagem pelo comprador."
          },
          {
            "value": "aguardandoAprovacao",
            "title": "Aguardando aprovação",
            "description": "Enviado pelo comprador; aguarda decisão do gerente quando acima do valor limite."
          },
          {
            "value": "enviado",
            "title": "Enviado ao fornecedor",
            "description": "Liberado (abaixo do limite ou aprovado) e enviado ao fornecedor; aguarda a chegada."
          },
          {
            "value": "rejeitado",
            "title": "Rejeitado",
            "description": "Rejeitado pelo gerente de compras, com motivo."
          },
          {
            "value": "recebidoParcialmente",
            "title": "Recebido parcialmente",
            "description": "Parte das quantidades já chegou e deu entrada no estoque."
          },
          {
            "value": "recebido",
            "title": "Recebido",
            "description": "Todas as quantidades pedidas foram recebidas."
          }
        ],
        "title": "Situação",
        "description": "Situação do pedido no ciclo de compra: de rascunho até recebido."
      },
      "dataPedido": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data do pedido",
        "description": "Data em que o pedido foi aberto; base do total comprado por fornecedor no mês."
      },
      "previsaoEntrega": {
        "type": "date",
        "indexed": true,
        "title": "Previsão de entrega",
        "description": "Data prevista para a chegada; pedido em aberto após essa data é considerado atrasado."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados complementares do pedido.",
        "fields": {
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Observações do comprador para o fornecedor ou para a aprovação."
          },
          "enviadoEm": {
            "type": "timestamp",
            "title": "Enviado em",
            "description": "Momento em que o comprador enviou o pedido."
          },
          "decisao": {
            "type": "object",
            "title": "Decisão do gerente",
            "description": "Registro da decisão do gerente de compras sobre pedido acima do limite.",
            "fields": {
              "decididoEm": {
                "type": "timestamp",
                "title": "Decidido em",
                "description": "Momento da aprovação ou rejeição."
              },
              "motivoRejeicao": {
                "type": "text",
                "title": "Motivo da rejeição",
                "description": "Motivo informado pelo gerente ao rejeitar; obrigatório na rejeição."
              }
            }
          },
          "valorTotal": {
            "type": "money",
            "derived": true,
            "title": "Valor total",
            "description": "Soma, sobre os itens do pedido, de quantidade pedida vezes preço unitário."
          },
          "acimaDoLimite": {
            "type": "boolean",
            "derived": true,
            "title": "Acima do valor limite",
            "description": "Valor total do pedido maior que o valor limite de aprovação do gerente de compras."
          },
          "emAberto": {
            "type": "boolean",
            "derived": true,
            "title": "Em aberto",
            "description": "Pedido enviado ou recebido apenas parcialmente, ou seja, ainda com quantidade a receber."
          },
          "atrasado": {
            "type": "boolean",
            "derived": true,
            "title": "Atrasado",
            "description": "Pedido em aberto com previsão de entrega anterior a hoje."
          },
          "quantidadeRecebida": {
            "type": "number",
            "derived": true,
            "title": "Quantidade recebida",
            "description": "Soma das quantidades recebidas de todos os itens nos recebimentos do pedido."
          },
          "quantidadePendente": {
            "type": "number",
            "derived": true,
            "title": "Quantidade pendente",
            "description": "Quantidade total pedida nos itens menos a quantidade já recebida nos recebimentos."
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
      "state": "rascunho",
      "reachedBy": "actor"
    },
    {
      "state": "aguardandoAprovacao",
      "reachedBy": "actor"
    },
    {
      "state": "enviado",
      "reachedBy": "actor"
    },
    {
      "state": "rejeitado",
      "reachedBy": "actor"
    },
    {
      "state": "recebidoParcialmente",
      "reachedBy": "command"
    },
    {
      "state": "recebido",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "enviar",
      "from": [
        "rascunho"
      ],
      "to": "aguardandoAprovacao",
      "by": [
        "comprador"
      ],
      "description": "O comprador envia o pedido com ao menos um item; ele segue para a decisão de liberação conforme o valor limite.",
      "payload": [
        "details.observacoes",
        "previsaoEntrega"
      ],
      "ruleRefs": [
        "pedidoExigeItem",
        "aprovacaoAcimaLimite"
      ]
    },
    {
      "transitionId": "liberarAbaixoLimite",
      "from": [
        "aguardandoAprovacao"
      ],
      "to": "enviado",
      "by": [],
      "description": "Pedido cujo valor total não passa do limite é liberado automaticamente ao fornecedor, sem decisão do gerente.",
      "payload": [],
      "ruleRefs": [
        "aprovacaoAcimaLimite"
      ]
    },
    {
      "transitionId": "aprovar",
      "from": [
        "aguardandoAprovacao"
      ],
      "to": "enviado",
      "by": [
        "gerenteCompras"
      ],
      "description": "O gerente aprova o pedido acima do limite e ele segue ao fornecedor.",
      "payload": [],
      "ruleRefs": [
        "aprovacaoAcimaLimite"
      ]
    },
    {
      "transitionId": "rejeitar",
      "from": [
        "aguardandoAprovacao"
      ],
      "to": "rejeitado",
      "by": [
        "gerenteCompras"
      ],
      "description": "O gerente rejeita o pedido acima do limite, informando o motivo.",
      "payload": [
        "details.decisao.motivoRejeicao"
      ],
      "ruleRefs": [
        "aprovacaoAcimaLimite",
        "rejeicaoExigeMotivo"
      ]
    },
    {
      "transitionId": "receberParcial",
      "from": [
        "enviado",
        "recebidoParcialmente"
      ],
      "to": "recebidoParcialmente",
      "by": [],
      "description": "Um recebimento registrado pelo almoxarife deixa quantidade pendente; o pedido passa a recebido parcialmente.",
      "payload": [],
      "ruleRefs": [
        "recebimentoSomenteEnviado",
        "recebimentoNaoExcedePedido"
      ]
    },
    {
      "transitionId": "receberTotal",
      "from": [
        "enviado",
        "recebidoParcialmente"
      ],
      "to": "recebido",
      "by": [],
      "description": "Um recebimento registrado completa as quantidades pedidas de todos os itens; o pedido passa a recebido.",
      "payload": [],
      "ruleRefs": [
        "recebimentoSomenteEnviado",
        "recebimentoNaoExcedePedido"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityPedidoCompraType = typeof comprasEntityPedidoCompra;

export default comprasEntityPedidoCompra;
