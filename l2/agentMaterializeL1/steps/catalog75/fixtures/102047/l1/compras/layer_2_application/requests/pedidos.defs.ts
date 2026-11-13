/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/pedidos.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "pedidos",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/createRecebimento.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listRecebimento.defs.ts"
  ],
  "data": {
    "pageId": "pedidos",
    "requests": [
      {
        "route": "compras.pedidos.pesquisarPedidos",
        "kind": "qry",
        "uses": [
          "listPedidoCompra",
          "getFornecedor",
          "getProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "pedidos",
            "entity": "PedidoCompra",
            "items": "items",
            "page": "pedidos.page",
            "pageSize": "pedidos.pageSize",
            "hasMore": "pedidos.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "dataEmissao",
                "path": "dataEmissao"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.fornecedor",
            "entity": "Fornecedor",
            "relationship": "pedidoFornecedor",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.produto",
            "entity": "Produto",
            "relationship": "pedidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedidos.items.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedidos.fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedidos.fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedidos.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedidos.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pedidos",
            "pages": "pedidos"
          },
          {
            "name": "pageSize",
            "target": "pedidos",
            "pages": "pedidos"
          },
          {
            "name": "numero",
            "target": "pedidos",
            "field": "numero",
            "optional": true
          },
          {
            "name": "produto",
            "target": "pedidos",
            "field": "numero"
          },
          {
            "name": "fornecedor",
            "target": "pedidos",
            "field": "numero"
          },
          {
            "name": "status",
            "target": "pedidos",
            "field": "status",
            "optional": true
          },
          {
            "name": "emitidoDe",
            "target": "pedidos",
            "field": "numero",
            "optional": true
          },
          {
            "name": "emitidoAte",
            "target": "pedidos",
            "field": "numero",
            "optional": true
          },
          {
            "name": "details",
            "target": "pedidos",
            "field": "details"
          }
        ],
        "rules": [
          "pedidoAtrasadoAposDataPrevista"
        ],
        "doc": {
          "raw": "Finalidade: Pesquisa os pedidos de compra da organização por número, produto, fornecedor, situação e período de emissão, opcionalmente só os atrasados.\nEntrada: numero: trecho do número do pedido; produto.details.identification.name: texto do nome do produto.details.identification.name; fornecedor.details.identification.name: texto do nome do fornecedor.details.identification.name; status: situação do pedido; emitidoDe/emitidoAte: limites do período da data de emissão; details.atrasado: quando verdadeiro traz apenas pedidos atrasados (lista de atrasados aberta a partir do painel); page e pageSize: paginação.\nProcessamento: Filtra PedidoCompra pelas colunas indexadas (situação, período de emissão), localiza produto e fornecedor pelo nome no cadastro mestre e busca o número por texto; ordena por data de emissão decrescente. Lê nome do fornecedor e do produto no MDM. Calcula valorTotal (quantidade × preço unitário), saldoAReceber (quantidade pedida − soma dos recebimentos) e atrasado conforme pedidoAtrasadoAposDataPrevista: pedido emAberto ou parcialmenteRecebido com data prevista de entrega anterior a hoje. Campos derivados são calculados, nunca gravados.\nSaída: Página { items, page, pageSize, hasMore } de pedidos resumidos com número, emissão, situação, fornecedor, produto, valor total e moeda, indicação de atraso e saldo a receber.",
          "purpose": "Pesquisa os pedidos de compra da organização por número, produto, fornecedor, situação e período de emissão, opcionalmente só os atrasados.",
          "input": "numero: trecho do número do pedido; produto.details.identification.name: texto do nome do produto.details.identification.name; fornecedor.details.identification.name: texto do nome do fornecedor.details.identification.name; status: situação do pedido; emitidoDe/emitidoAte: limites do período da data de emissão; details.atrasado: quando verdadeiro traz apenas pedidos atrasados (lista de atrasados aberta a partir do painel); page e pageSize: paginação.",
          "processing": "Filtra PedidoCompra pelas colunas indexadas (situação, período de emissão), localiza produto e fornecedor pelo nome no cadastro mestre e busca o número por texto; ordena por data de emissão decrescente. Lê nome do fornecedor e do produto no MDM. Calcula valorTotal (quantidade × preço unitário), saldoAReceber (quantidade pedida − soma dos recebimentos) e atrasado conforme pedidoAtrasadoAposDataPrevista: pedido emAberto ou parcialmenteRecebido com data prevista de entrega anterior a hoje. Campos derivados são calculados, nunca gravados.",
          "output": "Página { items, page, pageSize, hasMore } de pedidos resumidos com número, emissão, situação, fornecedor, produto, valor total e moeda, indicação de atraso e saldo a receber."
        }
      },
      {
        "route": "compras.pedidos.abrirPedido",
        "kind": "qry",
        "uses": [
          "listPedidoCompra",
          "getFornecedor",
          "getProduto",
          "listRecebimento"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "pedido",
            "entity": "PedidoCompra",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "solicitacaoId",
                "path": "solicitacaoId"
              },
              {
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "dataEmissao",
                "path": "dataEmissao"
              },
              {
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor",
            "entity": "Fornecedor",
            "relationship": "pedidoFornecedor",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto",
            "entity": "Produto",
            "relationship": "pedidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.recebimentos",
            "entity": "Recebimento",
            "relationship": "recebimentoPedido",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "dataRecebimento",
                "path": "dataRecebimento"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "pedidoId",
            "target": "pedido",
            "field": "numero"
          }
        ],
        "rules": [
          "pedidoAtrasadoAposDataPrevista",
          "lembreteEntregaEAtraso"
        ],
        "doc": {
          "raw": "Finalidade: Abre um pedido de compra com tudo o que se confere nele: fornecedor, produto, quantidades, preço, saldo, origem, último lembrete e recebimentos.\nEntrada: pedidoId: id do pedido escolhido na lista ou vindo do lembrete de entrega (URL).\nProcessamento: Lê o PedidoCompra pelo id, o fornecedor (nome e razão social) e o produto (nome e unidade de medida) no MDM e lista os recebimentos pela chave pedidoCompraId em ordem de data de recebimento. Calcula valorTotal, quantidadeRecebida (soma dos recebimentos), saldoAReceber e atrasado (pedidoAtrasadoAposDataPrevista); para cada recebimento calcula saldoPendente e recebimentoTotal acumulando as quantidades até ele. ultimoLembreteEm é o dia do último lembrete enviado pela verificação diária (lembreteEntregaEAtraso), apenas lido.\nSaída: O pedido em seu estado atual, com versão, solicitação de origem, data de emissão, data prevista de entrega, valores calculados, fornecedor, produto e a lista de recebimentos registrados.",
          "purpose": "Abre um pedido de compra com tudo o que se confere nele: fornecedor, produto, quantidades, preço, saldo, origem, último lembrete e recebimentos.",
          "input": "pedidoId: id do pedido escolhido na lista ou vindo do lembrete de entrega (URL).",
          "processing": "Lê o PedidoCompra pelo id, o fornecedor (nome e razão social) e o produto (nome e unidade de medida) no MDM e lista os recebimentos pela chave pedidoCompraId em ordem de data de recebimento. Calcula valorTotal, quantidadeRecebida (soma dos recebimentos), saldoAReceber e atrasado (pedidoAtrasadoAposDataPrevista); para cada recebimento calcula saldoPendente e recebimentoTotal acumulando as quantidades até ele. ultimoLembreteEm é o dia do último lembrete enviado pela verificação diária (lembreteEntregaEAtraso), apenas lido.",
          "output": "O pedido em seu estado atual, com versão, solicitação de origem, data de emissão, data prevista de entrega, valores calculados, fornecedor, produto e a lista de recebimentos registrados."
        }
      },
      {
        "route": "compras.pedidos.registrarRecebimento",
        "kind": "cmd",
        "uses": [
          "createRecebimento",
          "listPedidoCompra",
          "getFornecedor",
          "getProduto"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "pedido",
            "entity": "PedidoCompra",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "solicitacaoId",
                "path": "solicitacaoId"
              },
              {
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "dataEmissao",
                "path": "dataEmissao"
              },
              {
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor",
            "entity": "Fornecedor",
            "relationship": "pedidoFornecedor",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto",
            "entity": "Produto",
            "relationship": "pedidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pedido.recebimentos",
            "entity": "Recebimento",
            "relationship": "recebimentoPedido",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "dataRecebimento",
                "path": "dataRecebimento"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "entity",
            "path": "linha",
            "entity": "PedidoCompra",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "dataEmissao",
                "path": "dataEmissao"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.fornecedor",
            "entity": "Fornecedor",
            "relationship": "pedidoFornecedor",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.produto",
            "entity": "Produto",
            "relationship": "pedidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "linha.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "linha.fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "linha.fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "linha.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "linha.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [
          "recebimentoSomentePedidoEmAberto",
          "quantidadeRecebidaPositiva",
          "recebimentoNaoExcedeSaldo",
          "recebimentoNaoExcedePedido",
          "recebimentoAtualizaSituacaoPedido",
          "recebimentoDaEntradaEstoque"
        ],
        "doc": {
          "raw": "Finalidade: Registra a chegada total ou parcial de um pedido de compra pelo almoxarife.\nEntrada: pedidoCompraId: pedido recebido; dataRecebimento: momento da chegada da mercadoria; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: anotação opcional sobre avarias ou divergências.\nProcessamento: Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva) ou se for maior que o saldo a receber, de modo que a soma recebida nunca ultrapasse a quantidade pedida (recebimentoNaoExcedeSaldo, recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, move o pedido para recebido quando a soma alcança a quantidade pedida ou para parcialmenteRecebido quando ainda resta saldo (recebimentoAtualizaSituacaoPedido, transições concluirRecebimento/registrarRecebimentoParcial) e dá entrada no estoque da quantidade recebida do produto (recebimentoDaEntradaEstoque). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.\nSaída: pedido: o pedido na nova situação, com valores recalculados e a lista de recebimentos incluindo o novo; linha: o mesmo pedido em forma resumida, com situação, atraso e saldo a receber atualizados.",
          "purpose": "Registra a chegada total ou parcial de um pedido de compra pelo almoxarife.",
          "input": "pedidoCompraId: pedido recebido; dataRecebimento: momento da chegada da mercadoria; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: anotação opcional sobre avarias ou divergências.",
          "processing": "Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva) ou se for maior que o saldo a receber, de modo que a soma recebida nunca ultrapasse a quantidade pedida (recebimentoNaoExcedeSaldo, recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, move o pedido para recebido quando a soma alcança a quantidade pedida ou para parcialmenteRecebido quando ainda resta saldo (recebimentoAtualizaSituacaoPedido, transições concluirRecebimento/registrarRecebimentoParcial) e dá entrada no estoque da quantidade recebida do produto (recebimentoDaEntradaEstoque). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.",
          "output": "pedido: o pedido na nova situação, com valores recalculados e a lista de recebimentos incluindo o novo; linha: o mesmo pedido em forma resumida, com situação, atraso e saldo a receber atualizados."
        }
      }
    ]
  }
} as const;

export default definition;
