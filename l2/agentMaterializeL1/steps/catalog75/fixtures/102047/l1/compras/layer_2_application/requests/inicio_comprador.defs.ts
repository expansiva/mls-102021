/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/inicio_comprador.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "inicio_comprador",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/enviar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listSolicitacaoCompra.defs.ts"
  ],
  "data": {
    "pageId": "inicio_comprador",
    "requests": [
      {
        "route": "compras.inicio_comprador.carregarInicioComprador",
        "kind": "qry",
        "uses": [
          "listSolicitacaoCompra",
          "getProduto",
          "listPedidoCompra",
          "getFornecedor"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "alertas.solicitacoesVencidas",
            "entity": "SolicitacaoCompra",
            "items": "",
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
                "field": "status",
                "path": "status"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
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
            "path": "alertas.solicitacoesVencidas.produto",
            "entity": "Produto",
            "relationship": "solicitacaoProduto",
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
            "path": "alertas.solicitacoesVencidas.produto.details.identification",
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
            "path": "alertas.solicitacoesVencidas.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "list",
            "path": "alertas.pedidosAtrasados",
            "entity": "PedidoCompra",
            "items": "",
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
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "alertas.pedidosAtrasados.fornecedor",
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
            "path": "alertas.pedidosAtrasados.fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "list",
            "path": "solicitacoesParaEnviar",
            "entity": "SolicitacaoCompra",
            "items": "",
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
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacoesParaEnviar.produto",
            "entity": "Produto",
            "relationship": "solicitacaoProduto",
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
            "path": "solicitacoesParaEnviar.produto.details.identification",
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
            "path": "solicitacoesParaEnviar.produto.details.product",
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
            "path": "alertas.totalSolicitacoesVencidas",
            "reason": "Interface AlertasPendencias groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly totalSolicitacoesVencidas."
          },
          {
            "kind": "unresolved",
            "path": "alertas.totalPedidosAtrasados",
            "reason": "Interface AlertasPendencias groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly totalPedidosAtrasados."
          },
          {
            "kind": "unresolved",
            "path": "alertas.solicitacoesVencidas.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "alertas.solicitacoesVencidas.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "alertas.pedidosAtrasados.fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoesParaEnviar.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoesParaEnviar.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [
          "solicitacaoCompletaParaEnviar"
        ],
        "doc": {
          "raw": "Finalidade: Carrega de uma vez a página inicial do comprador: os alertas de necessidades vencidas e pedidos atrasados e as solicitações em rascunho que ele precisa completar e enviar.\nEntrada: Nenhuma entrada; o comprador é o usuário logado, identificado pelo servidor.\nProcessamento: Solicitações vencidas: solicitações do comprador logado (compradorId) com necessidadeVencida verdadeira, calculada como dataNecessidade anterior a hoje e situação diferente de autorizada e rejeitada; para cada uma calcula quantidadeOpcoes contando as OpcaoCotacao pela solicitacaoId (no máximo três) e lê o nome do produto no cadastro mestre; ordena pela dataNecessidade mais antiga. Pedidos atrasados: pedidos originados das solicitações do comprador logado, em situação emAberto ou parcialmenteRecebido com dataPrevistaEntrega anterior a hoje; calcula atrasado, diasAtraso (dias entre a data prevista e hoje) e saldoAReceber (quantidade pedida menos a soma dos recebimentos), lê o nome do fornecedor; ordena por diasAtraso decrescente. Os totais são as contagens de cada lista. Solicitações para enviar: solicitações do comprador logado em situação rascunho, com produto (nome e unidade de medida), quantidade, justificativa, dataNecessidade, pendências da conferência e completa calculada conforme solicitacaoCompletaParaEnviar (produto, quantidade maior que zero, justificativa e data preenchidos); ordenadas pela dataNecessidade. Campos derivados são calculados na leitura, nunca gravados.\nSaída: alertas com os totais e as listas de solicitações vencidas e pedidos atrasados; solicitacoesParaEnviar com as solicitações em rascunho do comprador.",
          "purpose": "Carrega de uma vez a página inicial do comprador: os alertas de necessidades vencidas e pedidos atrasados e as solicitações em rascunho que ele precisa completar e enviar.",
          "input": "Nenhuma entrada; o comprador é o usuário logado, identificado pelo servidor.",
          "processing": "Solicitações vencidas: solicitações do comprador logado (compradorId) com necessidadeVencida verdadeira, calculada como dataNecessidade anterior a hoje e situação diferente de autorizada e rejeitada; para cada uma calcula quantidadeOpcoes contando as OpcaoCotacao pela solicitacaoId (no máximo três) e lê o nome do produto no cadastro mestre; ordena pela dataNecessidade mais antiga. Pedidos atrasados: pedidos originados das solicitações do comprador logado, em situação emAberto ou parcialmenteRecebido com dataPrevistaEntrega anterior a hoje; calcula atrasado, diasAtraso (dias entre a data prevista e hoje) e saldoAReceber (quantidade pedida menos a soma dos recebimentos), lê o nome do fornecedor; ordena por diasAtraso decrescente. Os totais são as contagens de cada lista. Solicitações para enviar: solicitações do comprador logado em situação rascunho, com produto (nome e unidade de medida), quantidade, justificativa, dataNecessidade, pendências da conferência e completa calculada conforme solicitacaoCompletaParaEnviar (produto, quantidade maior que zero, justificativa e data preenchidos); ordenadas pela dataNecessidade. Campos derivados são calculados na leitura, nunca gravados.",
          "output": "alertas com os totais e as listas de solicitações vencidas e pedidos atrasados; solicitacoesParaEnviar com as solicitações em rascunho do comprador."
        }
      },
      {
        "route": "compras.inicio_comprador.enviarSolicitacao",
        "kind": "cmd",
        "uses": [
          "enviar",
          "getProduto"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "solicitacao",
            "entity": "SolicitacaoCompra",
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
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.produto",
            "entity": "Produto",
            "relationship": "solicitacaoProduto",
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
            "path": "solicitacao.produto.details.identification",
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
            "path": "solicitacao.produto.details.product",
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
            "path": "solicitacao.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [
          "solicitacaoCompletaParaEnviar",
          "quantidadePositiva"
        ],
        "doc": {
          "raw": "Finalidade: Envia uma solicitação em rascunho do comprador para conferência de completude e pesquisa de opções.\nEntrada: id: a solicitação a enviar; version: versão lida, para controle de concorrência otimista.\nProcessamento: Verifica que a solicitação pertence ao comprador logado, está em rascunho e que a versão confere. Aplica a transição enviar (rascunho → enviada), gravando enviadaEm. quantidadePositiva: recusa se a quantidade não for maior que zero. solicitacaoCompletaParaEnviar: a conferência do sistema verifica produto, quantidade, justificativa e data de necessidade; se faltar algo a solicitação volta a rascunho com as pendências, senão segue para emPesquisa e a pesquisa de opções é disparada. completa é calculada, nunca gravada.\nSaída: A solicitação enviada, no seu novo estado (enviada, em pesquisa ou de volta a rascunho com pendências), com nova versão, produto, quantidade, justificativa, data de necessidade e completa.",
          "purpose": "Envia uma solicitação em rascunho do comprador para conferência de completude e pesquisa de opções.",
          "input": "id: a solicitação a enviar; version: versão lida, para controle de concorrência otimista.",
          "processing": "Verifica que a solicitação pertence ao comprador logado, está em rascunho e que a versão confere. Aplica a transição enviar (rascunho → enviada), gravando enviadaEm. quantidadePositiva: recusa se a quantidade não for maior que zero. solicitacaoCompletaParaEnviar: a conferência do sistema verifica produto, quantidade, justificativa e data de necessidade; se faltar algo a solicitação volta a rascunho com as pendências, senão segue para emPesquisa e a pesquisa de opções é disparada. completa é calculada, nunca gravada.",
          "output": "A solicitação enviada, no seu novo estado (enviada, em pesquisa ou de volta a rascunho com pendências), com nova versão, produto, quantidade, justificativa, data de necessidade e completa."
        }
      }
    ]
  }
} as const;

export default definition;
