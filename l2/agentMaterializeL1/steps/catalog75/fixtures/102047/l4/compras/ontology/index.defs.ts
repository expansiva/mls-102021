/// <mls fileReference="_102047_/l4/compras/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "businessDomain": "Compras: cadastro de fornecedores e produtos fornecidos com preço combinado, solicitações de compra com pesquisa de opções por IA, autorização pelo gerente, pedidos de compra, lembretes de entrega e recebimento com entrada no estoque.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "compras",
    "description": "Branch details.compras of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Fornecedor",
      "kind": "role",
      "subtype": "Company"
    },
    {
      "entityId": "ContatoFornecedor",
      "kind": "role",
      "subtype": "ContactChannel"
    },
    {
      "entityId": "Produto",
      "kind": "role",
      "subtype": "Product"
    },
    {
      "entityId": "Comprador",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "ProdutoFornecido",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "SolicitacaoCompra",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "OpcaoCotacao",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "PedidoCompra",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Recebimento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "PainelCompras",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "fornecedorContatos",
      "from": "Fornecedor",
      "to": "ContatoFornecedor",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "description": "O fornecedor possui seus canais de contato.",
      "catalogType": "HasContact"
    },
    {
      "relationshipId": "produtoFornecidoFornecedor",
      "from": "ProdutoFornecido",
      "to": "Fornecedor",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O produto fornecido pertence a um fornecedor.",
      "field": "ProdutoFornecido.fornecedorId"
    },
    {
      "relationshipId": "produtoFornecidoProduto",
      "from": "ProdutoFornecido",
      "to": "Produto",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O produto fornecido aponta o produto do catálogo.",
      "field": "ProdutoFornecido.produtoId"
    },
    {
      "relationshipId": "fornecedorProdutos",
      "from": "Fornecedor",
      "to": "Produto",
      "type": "manyToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Produtos que cada fornecedor fornece, lidos pelos produtos fornecidos.",
      "through": "ProdutoFornecido",
      "path": "Fornecedor <- ProdutoFornecido.fornecedorId -> ProdutoFornecido.produtoId -> Produto",
      "derived": true
    },
    {
      "relationshipId": "solicitacaoProduto",
      "from": "SolicitacaoCompra",
      "to": "Produto",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A solicitação pede um produto.",
      "field": "SolicitacaoCompra.produtoId"
    },
    {
      "relationshipId": "solicitacaoComprador",
      "from": "SolicitacaoCompra",
      "to": "Comprador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A solicitação foi aberta por um comprador.",
      "field": "SolicitacaoCompra.compradorId"
    },
    {
      "relationshipId": "opcaoSolicitacao",
      "from": "OpcaoCotacao",
      "to": "SolicitacaoCompra",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A opção pesquisada pertence a uma solicitação.",
      "field": "OpcaoCotacao.solicitacaoId"
    },
    {
      "relationshipId": "opcaoFornecedor",
      "from": "OpcaoCotacao",
      "to": "Fornecedor",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "A opção aponta o fornecedor quando ele já está registrado.",
      "field": "OpcaoCotacao.fornecedorId"
    },
    {
      "relationshipId": "opcaoPedidoAnterior",
      "from": "OpcaoCotacao",
      "to": "PedidoCompra",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "Quando a fonte é uma compra anterior, a opção aponta o pedido de origem.",
      "field": "OpcaoCotacao.pedidoOrigemId"
    },
    {
      "relationshipId": "solicitacaoOpcaoEscolhida",
      "from": "SolicitacaoCompra",
      "to": "OpcaoCotacao",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "A opção escolhida pelo gerente ao autorizar.",
      "field": "SolicitacaoCompra.opcaoEscolhidaId"
    },
    {
      "relationshipId": "pedidoSolicitacao",
      "from": "PedidoCompra",
      "to": "SolicitacaoCompra",
      "type": "oneToOne",
      "required": true,
      "mode": "fk",
      "description": "O pedido é gerado a partir de uma solicitação autorizada.",
      "field": "PedidoCompra.solicitacaoId"
    },
    {
      "relationshipId": "pedidoFornecedor",
      "from": "PedidoCompra",
      "to": "Fornecedor",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O pedido é feito ao fornecedor escolhido.",
      "field": "PedidoCompra.fornecedorId"
    },
    {
      "relationshipId": "pedidoProduto",
      "from": "PedidoCompra",
      "to": "Produto",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O pedido compra um produto.",
      "field": "PedidoCompra.produtoId"
    },
    {
      "relationshipId": "recebimentoPedido",
      "from": "Recebimento",
      "to": "PedidoCompra",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O recebimento registra a chegada de um pedido, total ou parcial.",
      "field": "Recebimento.pedidoCompraId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ComprasOntologyIndexType = typeof comprasOntologyIndex;

export default comprasOntologyIndex;
