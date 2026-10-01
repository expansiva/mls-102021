/// <mls fileReference="_102047_/l4/controleEstoque/ontology/MovimentacaoEstoque.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityMovimentacaoEstoque = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "MovimentacaoEstoque",
  "title": "Movimentação de estoque",
  "description": "Registro imutável de entrada ou saída de unidades de um produto, usado para calcular seu saldo atual.",
  "displayField": "id",
  "relationships": {
    "produto": {
      "relationshipId": "movimentacaoEstoqueProduto",
      "to": "Produto",
      "via": "MovimentacaoEstoque.produtoId",
      "cardinality": "N:1",
      "title": "Produto movimentado",
      "description": "Cada movimentação registra uma entrada ou saída de unidades para um único produto.",
      "mode": "fk",
      "required": "Sempre",
      "role": "produto"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma movimentação pelo identificador da linha, usando a busca por id na tela de acompanhamento do estoquista.",
    "locate.byColumn": "Lista movimentações por produto e por data e hora de registro, com ordenação e paginação para o estoquista acompanhar o histórico.",
    "count": "Conta as movimentações correspondentes ao produto ou período consultado, usando os filtros da lista para o cabeçalho do estoquista.",
    "listByForeignKey": "Lista as movimentações vinculadas a um produto por produtoId, para o estoquista consultar o histórico daquele produto.",
    "create": "Grava uma nova movimentação de entrada ou saída com produto, data, tipo e quantidade informados pelo estoquista.",
    "transaction": "Confirma a gravação da movimentação e a atualização do saldo do produto na mesma transação, quando o estoquista registra a operação.",
    "read.mdmRecord": "Lê o registro mestre apontado por produtoId para exibir o nome e os dados cadastrais do produto ao estoquista.",
    "controleEstoque.registrarMovimentacao": "Registra uma entrada ou saída e aplica seu efeito ao saldo atual do produto, validando a operação para o estoquista."
  },
  "rules": [
    "movimentacaoEstoqueImutavel",
    "quantidadeMovimentadaPositiva",
    "registroMovimentacaoAtualizaSaldo"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "controleEstoque_movimentacaoestoque",
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
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto mestre ao qual a entrada ou saída de estoque se refere.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "movimentadoEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data e hora da movimentação",
        "description": "Data e hora em que a entrada ou saída foi registrada, usada para ordenar e consultar o histórico do produto.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados da movimentação",
        "description": "Dados imutáveis que caracterizam a entrada ou saída registrada para o produto.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "tipo": {
            "type": "enum",
            "required": true,
            "of": "Address",
            "values": [
              {
                "value": "entrada",
                "title": "Entrada",
                "description": "Adiciona unidades ao saldo do produto."
              },
              {
                "value": "saida",
                "title": "Saída",
                "description": "Retira unidades do saldo do produto."
              }
            ],
            "title": "Tipo de movimentação",
            "description": "Indica se as unidades foram adicionadas ao estoque ou retiradas dele.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "quantidade": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade",
            "description": "Quantidade positiva de unidades que entra ou sai do estoque.",
            "maxLength": 0,
            "min": 1,
            "max": 0
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ControleEstoqueEntityMovimentacaoEstoqueType = typeof controleEstoqueEntityMovimentacaoEstoque;

export default controleEstoqueEntityMovimentacaoEstoque;
