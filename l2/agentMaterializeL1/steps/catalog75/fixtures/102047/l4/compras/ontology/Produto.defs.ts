/// <mls fileReference="_102047_/l4/compras/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityProduto = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Produto",
  "title": "Produto",
  "description": "Item do catálogo da organização que é comprado; registro mestre compartilhado com o controle de estoque.",
  "displayField": "details.identification.name",
  "relationships": {
    "produtosFornecidos": {
      "relationshipId": "produtoFornecidoProduto",
      "to": "ProdutoFornecido",
      "via": "ProdutoFornecido.produtoId",
      "cardinality": "1:N",
      "title": "Fornecimentos do produto",
      "description": "Linhas que dizem quais fornecedores fornecem este produto e a que preço combinado.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "fornecedores": {
      "relationshipId": "fornecedorProdutos",
      "to": "Fornecedor",
      "via": "ProdutoFornecido",
      "cardinality": "N:N",
      "title": "Fornecedores do produto",
      "description": "Fornecedores que fornecem este produto, lidos pelos produtos fornecidos.",
      "mode": "throughTable",
      "path": "Fornecedor <- ProdutoFornecido.fornecedorId -> ProdutoFornecido.produtoId -> Produto",
      "derived": true,
      "direction": "to"
    },
    "solicitacoes": {
      "relationshipId": "solicitacaoProduto",
      "to": "SolicitacaoCompra",
      "via": "SolicitacaoCompra.produtoId",
      "cardinality": "1:N",
      "title": "Solicitações de compra",
      "description": "Solicitações de compra que pedem este produto.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "pedidos": {
      "relationshipId": "pedidoProduto",
      "to": "PedidoCompra",
      "via": "PedidoCompra.produtoId",
      "cardinality": "1:N",
      "title": "Pedidos de compra",
      "description": "Pedidos de compra emitidos para este produto.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o produto pelo mdmId para preencher solicitações, opções de cotação, pedidos e recebimentos; usado por todas as telas do módulo.",
    "locate.byName": "Encontra o produto pelo nome digitado quando o comprador abre uma solicitação ou cadastra o que um fornecedor fornece, e quando comprador e gerente pesquisam por produto.",
    "locate.byTag": "Lista os produtos marcados com compras.Produto pelo índice de tags; usado pelo comprador para escolher entre os produtos já usados nas compras.",
    "register.createOrAttach": "O comprador cadastra um produto ausente no catálogo ou anexa o papel compras.Produto a um produto existente do estoque.",
    "edit.platformFields": "O comprador corrige nome, código, categoria, marca e unidade de medida do produto no cadastro mestre.",
    "edit.moduleNamespace": "Grava o namespace compras do produto; hoje vazio, mantido pelo comprador.",
    "inactivate": "O comprador inativa um produto que não se compra mais, sem apagá-lo, e pode reativá-lo.",
    "listLinks": "Mostra na tela do produto os fornecedores que o fornecem, as solicitações e os pedidos; usado por comprador e gerente.",
    "comment": "Comprador e gerente deixam observações sobre o produto, como especificações para a cotação.",
    "attach.document": "O comprador anexa fichas técnicas ou fotos do produto para orientar fornecedores e a pesquisa de opções.",
    "tag": "O comprador marca produtos com rótulos livres do módulo, como compra recorrente.",
    "audit": "Mostra quem alterou o cadastro do produto e quando, pelo módulo de auditoria da plataforma."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "produtoInativoNaoSolicitado"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Product",
  "roleTag": "compras.Produto",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro mestre do produto comprado pela organização, compartilhado com o controle de estoque.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Product",
                    "title": "Produto"
                  }
                ],
                "description": "Sempre Product: o registro é um item do catálogo.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual comprador, gerente e almoxarife reconhecem o produto nas solicitações, cotações e pedidos; é o texto usado na pesquisa por produto.",
                "title": "Nome do produto"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação no cadastro",
                "description": "Ativo ou inativo no cadastro mestre; produto inativo não deve ser escolhido em nova solicitação."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País (ISO 3166-1 alfa-2) a que o cadastro do produto pertence.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis do registro nos módulos; inclui compras.Produto quando o produto é usado nas compras.",
                "title": "Papéis"
              }
            },
            "description": "Colunas de índice da plataforma que identificam o produto."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Outros nomes ou descrições pelos quais o produto é conhecido, úteis para reconhecê-lo em ofertas de fornecedores e na pesquisa de cotações.",
                "title": "Outros nomes"
              },
              "notes": {
                "type": "string",
                "maxLength": 1000,
                "title": "Observações",
                "description": "Observações gerais sobre o produto."
              }
            },
            "description": "Dados comuns da plataforma que o módulo lê."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "sku": {
                "type": "string",
                "description": "Código interno do produto, exibido em solicitações e pedidos.",
                "title": "Código interno (SKU)"
              },
              "category": {
                "type": "string",
                "title": "Categoria",
                "description": "Categoria do produto, para orientar a pesquisa de fornecedores."
              },
              "brand": {
                "type": "string",
                "title": "Marca",
                "description": "Marca do produto, quando relevante para a cotação."
              },
              "unitOfMeasure": {
                "type": "string",
                "description": "Unidade em que a quantidade é solicitada, cotada, pedida e recebida (unidade, caixa, kg, litro).",
                "title": "Unidade de medida"
              },
              "isInventoried": {
                "type": "boolean",
                "description": "Verdadeiro quando o recebimento do produto dá entrada no estoque.",
                "title": "Controla estoque"
              }
            },
            "description": "Dados do item de catálogo que a compra e o recebimento usam."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo de compras apenas lê."
          },
          "compras": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityProdutoType = typeof comprasEntityProduto;

export default comprasEntityProduto;
