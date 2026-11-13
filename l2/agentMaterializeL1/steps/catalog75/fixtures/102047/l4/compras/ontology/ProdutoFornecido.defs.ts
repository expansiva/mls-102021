/// <mls fileReference="_102047_/l4/compras/ontology/ProdutoFornecido.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityProdutoFornecido = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "ProdutoFornecido",
  "title": "Produto fornecido",
  "description": "Associação de um produto a um fornecedor com o preço combinado.",
  "displayField": "produtoId",
  "relationships": {
    "fornecedor": {
      "relationshipId": "produtoFornecidoFornecedor",
      "to": "Fornecedor",
      "via": "ProdutoFornecido.fornecedorId",
      "cardinality": "N:1",
      "title": "Fornecedor",
      "description": "O produto fornecido pertence a um fornecedor.",
      "mode": "fk",
      "required": true
    },
    "produto": {
      "relationshipId": "produtoFornecidoProduto",
      "to": "Produto",
      "via": "ProdutoFornecido.produtoId",
      "cardinality": "N:1",
      "title": "Produto",
      "description": "O produto fornecido aponta o produto do catálogo.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "O comprador associa um produto a um fornecedor com o preço combinado, ao cadastrar o fornecedor.",
    "update": "O comprador atualiza o preço combinado, a moeda ou o prazo de entrega de um produto fornecido.",
    "delete": "O comprador remove a associação quando o fornecedor deixa de fornecer o produto.",
    "read.byId": "Abre o produto fornecido pelo id na tela do fornecedor, para o comprador.",
    "listByForeignKey": "Lista os produtos de um fornecedor, ou os fornecedores de um produto, para o comprador e para a pesquisa de opções da solicitação.",
    "locate.byColumn": "Filtra produtos fornecidos por fornecedor e produto, paginado, para o comprador e o gerente de compras.",
    "uniqueKey": "O motor recusa uma segunda associação do mesmo produto ao mesmo fornecedor.",
    "read.mdmRecord": "Lê do cadastro mestre a razão social do fornecedor e o nome do produto para exibir na lista.",
    "count": "Conta quantos produtos cada fornecedor fornece, no cabeçalho da lista do comprador."
  },
  "rules": [
    "produtoFornecidoUnicoPorFornecedor",
    "precoCombinadoPositivo"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_produtofornecido",
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
      "fornecedorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Fornecedor"
        ],
        "title": "Fornecedor",
        "description": "Fornecedor que fornece o produto; a razão social e o CNPJ são lidos do cadastro mestre."
      },
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto do catálogo fornecido por este fornecedor; nome e unidade são lidos do cadastro mestre."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Condições combinadas com o fornecedor para este produto.",
        "fields": {
          "precoCombinado": {
            "type": "money",
            "required": true,
            "title": "Preço combinado",
            "description": "Preço unitário acordado com o fornecedor para este produto.",
            "min": 0
          },
          "moeda": {
            "type": "string",
            "required": true,
            "title": "Moeda",
            "description": "Código ISO 4217 da moeda do preço combinado (ex.: BRL).",
            "pattern": "^[A-Z]{3}$",
            "maxLength": 3
          },
          "prazoEntregaDias": {
            "type": "integer",
            "title": "Prazo de entrega (dias)",
            "description": "Prazo habitual de entrega combinado, em dias.",
            "min": 0
          },
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Condições adicionais combinadas com o fornecedor.",
            "maxLength": 2000
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "fornecedorId",
      "produtoId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityProdutoFornecidoType = typeof comprasEntityProdutoFornecido;

export default comprasEntityProdutoFornecido;
