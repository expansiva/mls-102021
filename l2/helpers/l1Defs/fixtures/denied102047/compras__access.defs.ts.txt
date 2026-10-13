/// <mls fileReference="_102047_/l4/compras/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "compras",
  "actors": [
    {
      "actorId": "comprador",
      "kind": "internal",
      "origin": "named",
      "title": "Comprador",
      "description": "Cadastra fornecedores e os produtos que cada um fornece com preço combinado, abre pedidos de compra com produtos, quantidades e preços e os envia ao fornecedor.",
      "personEntity": "Comprador"
    },
    {
      "actorId": "gerenteCompras",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente de compras",
      "description": "Aprova ou rejeita pedidos de compra acima do valor limite e acompanha o painel de pedidos em aberto, atrasados e o total comprado por fornecedor no mês.",
      "personEntity": ""
    },
    {
      "actorId": "almoxarife",
      "kind": "internal",
      "origin": "named",
      "title": "Almoxarife",
      "description": "Registra o recebimento total ou parcial dos pedidos que chegam, o que dá entrada no estoque dos produtos recebidos.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "compradorFornecedores",
      "actorRef": "comprador",
      "title": "Cadastro de fornecedores",
      "description": "O comprador busca, cadastra e mantém os fornecedores da organização e seus canais de contato.",
      "entityRefs": [
        "Fornecedor",
        "ContatoFornecedor"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os fornecedores e contatos de fornecedores da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo do fornecedor e do contato: identificação, CNPJ, razão social, endereços e canais."
      }
    },
    {
      "grantId": "compradorProdutosFornecidos",
      "actorRef": "comprador",
      "title": "Produtos fornecidos e preços combinados",
      "description": "O comprador registra quais produtos cada fornecedor fornece e ajusta o preço combinado.",
      "entityRefs": [
        "ProdutoFornecido"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os produtos fornecidos da organização, para que qualquer comprador use o preço combinado vigente."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo do produto fornecido, com preço combinado e condições."
      }
    },
    {
      "grantId": "compradorCatalogoProdutos",
      "actorRef": "comprador",
      "title": "Consulta ao catálogo de produtos",
      "description": "O comprador consulta os produtos do catálogo para vinculá-los a fornecedores e incluí-los nos pedidos.",
      "entityRefs": [
        "Produto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os produtos do cadastro mestre da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Dados de identificação e de catálogo do produto."
      }
    },
    {
      "grantId": "compradorMeusPedidos",
      "actorRef": "comprador",
      "title": "Meus pedidos de compra",
      "description": "O comprador abre, monta, revisa e envia os pedidos de compra que ele mesmo abriu, com seus itens.",
      "entityRefs": [
        "PedidoCompra",
        "ItemPedido"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Pedidos abertos pelo próprio comprador da sessão e os itens desses pedidos.",
        "anchorEntity": "Comprador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Pedido e itens completos, incluindo valores, situação e decisão do gerente."
      }
    },
    {
      "grantId": "compradorProprioCadastro",
      "actorRef": "comprador",
      "title": "Meu cadastro de comprador",
      "description": "O comprador vê o próprio registro como comprador no módulo.",
      "entityRefs": [
        "Comprador"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro da pessoa da sessão.",
        "anchorEntity": "Comprador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, situação e contatos do próprio comprador.",
        "allowedFields": [
          "Comprador.details.identification.name",
          "Comprador.details.identification.status",
          "Comprador.details.base.contacts"
        ]
      }
    },
    {
      "grantId": "gerentePedidos",
      "actorRef": "gerenteCompras",
      "title": "Aprovação e acompanhamento de pedidos",
      "description": "O gerente de compras analisa, aprova ou rejeita pedidos acima do limite e consulta itens e recebimentos de todos os pedidos.",
      "entityRefs": [
        "PedidoCompra",
        "ItemPedido",
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os pedidos de compra, itens e recebimentos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Pedidos, itens e recebimentos completos."
      }
    },
    {
      "grantId": "gerentePainel",
      "actorRef": "gerenteCompras",
      "title": "Painel de compras",
      "description": "O gerente acompanha pedidos em aberto, atrasados e o total comprado por fornecedor no mês.",
      "entityRefs": [
        "PainelCompras"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Indicadores de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Todas as medidas do painel por período e fornecedor."
      }
    },
    {
      "grantId": "gerenteConsultaCadastros",
      "actorRef": "gerenteCompras",
      "title": "Consulta de fornecedores, produtos e compradores",
      "description": "O gerente identifica fornecedor, produtos e comprador ao analisar pedidos e o painel.",
      "entityRefs": [
        "Fornecedor",
        "Produto",
        "Comprador",
        "ProdutoFornecido"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Cadastros da organização usados nos pedidos."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Identificação do fornecedor, dados de catálogo do produto, nome do comprador e preço combinado para comparação.",
        "allowedFields": [
          "Fornecedor.details.identification",
          "Fornecedor.details.company",
          "Produto.details.identification.name",
          "Produto.details.product",
          "Comprador.details.identification.name",
          "ProdutoFornecido.fornecedorId",
          "ProdutoFornecido.produtoId",
          "ProdutoFornecido.ativo",
          "ProdutoFornecido.details.precoCombinado",
          "ProdutoFornecido.details.dataNegociacao"
        ]
      }
    },
    {
      "grantId": "almoxarifePedidosRecebimento",
      "actorRef": "almoxarife",
      "title": "Conferência de pedidos a receber",
      "description": "O almoxarife localiza os pedidos que chegaram e confere as quantidades pedidas e pendentes, sem acesso a preços e decisões.",
      "entityRefs": [
        "PedidoCompra",
        "ItemPedido"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Pedidos de compra da organização e seus itens."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados do pedido e quantidades dos itens; valores, preços e decisão do gerente ficam ocultos.",
        "deniedFields": [
          "PedidoCompra.details.valorTotal",
          "PedidoCompra.details.acimaDoLimite",
          "PedidoCompra.details.decisao",
          "ItemPedido.details.precoUnitario",
          "ItemPedido.details.precoCombinadoReferencia",
          "ItemPedido.details.valorTotalItem",
          "ItemPedido.details.precoDivergeDoCombinado"
        ]
      }
    },
    {
      "grantId": "almoxarifeRecebimentos",
      "actorRef": "almoxarife",
      "title": "Registro de recebimentos",
      "description": "O almoxarife registra a chegada total ou parcial dos pedidos, dando entrada no estoque.",
      "entityRefs": [
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os recebimentos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Recebimento completo com itens, nota fiscal e observações."
      }
    },
    {
      "grantId": "almoxarifeConsultaCadastros",
      "actorRef": "almoxarife",
      "title": "Identificação de fornecedor e produtos",
      "description": "O almoxarife identifica o fornecedor e os produtos recebidos na conferência.",
      "entityRefs": [
        "Fornecedor",
        "Produto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Fornecedores e produtos da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, CNPJ e razão social do fornecedor; nome, SKU e unidade do produto.",
        "allowedFields": [
          "Fornecedor.details.identification.name",
          "Fornecedor.details.identification.docId",
          "Fornecedor.details.company.legalName",
          "Produto.details.identification.name",
          "Produto.details.product"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ComprasAccessType = typeof comprasAccess;

export default comprasAccess;
