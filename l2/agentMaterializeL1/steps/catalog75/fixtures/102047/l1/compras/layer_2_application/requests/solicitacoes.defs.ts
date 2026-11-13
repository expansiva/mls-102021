/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/solicitacoes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "solicitacoes",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/autorizar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/createSolicitacaoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/enviar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listOpcaoCotacao.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listSolicitacaoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/rejeitar.defs.ts"
  ],
  "data": {
    "pageId": "solicitacoes",
    "requests": [
      {
        "route": "compras.solicitacoes.listarSolicitacoes",
        "kind": "qry",
        "uses": [
          "listSolicitacaoCompra"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "solicitacoes",
            "entity": "SolicitacaoCompra",
            "items": "items",
            "page": "solicitacoes.page",
            "pageSize": "solicitacoes.pageSize",
            "hasMore": "solicitacoes.hasMore",
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
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacoes.items.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": []
          },
          {
            "kind": "computed",
            "path": "solicitacoes.items.comprador.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": []
          },
          {
            "kind": "computed",
            "path": "solicitacoes.items.opcaoCotacao.fornecedorNome",
            "entity": "SolicitacaoCompra",
            "rules": []
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.produto.details.identification.name",
            "reason": "Interface SolicitacaoResumo: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.comprador.details.identification.name",
            "reason": "Interface SolicitacaoResumo: field comprador.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.opcaoCotacao.fornecedorNome",
            "reason": "Interface SolicitacaoResumo: field opcaoCotacao.fornecedorNome is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "solicitacoes",
            "pages": "solicitacoes"
          },
          {
            "name": "pageSize",
            "target": "solicitacoes",
            "pages": "solicitacoes"
          },
          {
            "name": "produtoId",
            "target": "solicitacoes",
            "field": "produtoId",
            "optional": true
          },
          {
            "name": "opcaoCotacao",
            "target": "solicitacoes",
            "field": "numero"
          },
          {
            "name": "status",
            "target": "solicitacoes",
            "field": "status",
            "optional": true
          },
          {
            "name": "enviadaDe",
            "target": "solicitacoes",
            "field": "numero",
            "optional": true
          },
          {
            "name": "enviadaAte",
            "target": "solicitacoes",
            "field": "numero",
            "optional": true
          },
          {
            "name": "numero",
            "target": "solicitacoes",
            "field": "numero",
            "optional": true
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Pesquisa as solicitações de compra da organização por produto, fornecedor, situação e período de envio, já com os indicadores de completude, opções e necessidade vencida.\nEntrada: produtoId: produto da solicitação; opcaoCotacao.fornecedorNome: texto procurado no nome do fornecedor das opções pesquisadas; status: situação da solicitação (aguardandoAutorizacao localiza as pendentes do gerente); enviadaDe/enviadaAte: período da data de envio; numero: número da solicitação; page/pageSize: paginação.\nProcessamento: Filtra SolicitacaoCompra por colunas (produtoId, status, enviadaEm no período) e pelo número; quando há fornecedorNome, mantém só as solicitações com alguma OpcaoCotacao cujo fornecedorNome contenha o texto. Ordena da mais recente para a mais antiga. Compõe o nome do produto e do comprador pelo cadastro mestre e os nomes dos fornecedores das opções numa única leitura por página. Calcula completa (produto, quantidade > 0, justificativa e data preenchidos), quantidadeOpcoes (contagem das opções, no máximo três) e necessidadeVencida (dataNecessidade antes de hoje e situação diferente de autorizada e rejeitada); nada disso é gravado.\nSaída: Página de solicitações resumidas { items, page, pageSize, hasMore } com número, situação, produto, comprador, fornecedores das opções, envio, necessidade e indicadores.",
          "purpose": "Pesquisa as solicitações de compra da organização por produto, fornecedor, situação e período de envio, já com os indicadores de completude, opções e necessidade vencida.",
          "input": "produtoId: produto da solicitação; opcaoCotacao.fornecedorNome: texto procurado no nome do fornecedor das opções pesquisadas; status: situação da solicitação (aguardandoAutorizacao localiza as pendentes do gerente); enviadaDe/enviadaAte: período da data de envio; numero: número da solicitação; page/pageSize: paginação.",
          "processing": "Filtra SolicitacaoCompra por colunas (produtoId, status, enviadaEm no período) e pelo número; quando há fornecedorNome, mantém só as solicitações com alguma OpcaoCotacao cujo fornecedorNome contenha o texto. Ordena da mais recente para a mais antiga. Compõe o nome do produto e do comprador pelo cadastro mestre e os nomes dos fornecedores das opções numa única leitura por página. Calcula completa (produto, quantidade > 0, justificativa e data preenchidos), quantidadeOpcoes (contagem das opções, no máximo três) e necessidadeVencida (dataNecessidade antes de hoje e situação diferente de autorizada e rejeitada); nada disso é gravado.",
          "output": "Página de solicitações resumidas { items, page, pageSize, hasMore } com número, situação, produto, comprador, fornecedores das opções, envio, necessidade e indicadores."
        }
      },
      {
        "route": "compras.solicitacoes.obterSolicitacao",
        "kind": "qry",
        "uses": [
          "listSolicitacaoCompra",
          "listOpcaoCotacao",
          "listPedidoCompra"
        ],
        "transaction": "none",
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.justificativa",
                "path": "details.justificativa"
              },
              {
                "field": "details.conferidaEm",
                "path": "details.conferidaEm"
              },
              {
                "field": "details.pendencias",
                "path": "details.pendencias"
              },
              {
                "field": "details.pesquisadaEm",
                "path": "details.pesquisadaEm"
              },
              {
                "field": "details.decididaEm",
                "path": "details.decididaEm"
              },
              {
                "field": "details.motivoRejeicao",
                "path": "details.motivoRejeicao"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "opcaoSomenteEstimativa"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "opcaoSomenteEstimativa"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.opcoes",
            "entity": "OpcaoCotacao",
            "relationship": "opcaoSolicitacao",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "posicao",
                "path": "posicao"
              },
              {
                "field": "fornecedorNome",
                "path": "fornecedorNome"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              },
              {
                "field": "details.prazoEntregaDias",
                "path": "details.prazoEntregaDias"
              },
              {
                "field": "details.fonte.url",
                "path": "details.fonte.url"
              },
              {
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              },
              {
                "field": "details.estimativa",
                "path": "details.estimativa"
              },
              {
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.pedidoGerado",
            "entity": "PedidoCompra",
            "relationship": "pedidoSolicitacao",
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
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "solicitacao",
            "field": "id"
          }
        ],
        "rules": [
          "opcaoSomenteEstimativa"
        ],
        "doc": {
          "raw": "Finalidade: Carrega a solicitação escolhida com suas opções pesquisadas, os marcos do processo do sistema e o pedido gerado.\nEntrada: id: id da solicitação de compra.\nProcessamento: Lê a SolicitacaoCompra pelo id, o produto (nome e unidade) do cadastro mestre, as até três OpcaoCotacao pela solicitacaoId ordenadas pela posição e o PedidoCompra pela solicitacaoId, quando existir. Calcula escolhida (id igual a opcaoEscolhidaId), valorTotalEstimado (preço unitário × quantidade da solicitação, na moeda da opção), completa, quantidadeOpcoes e necessidadeVencida. Toda opção sai com estimativa verdadeira (opcaoSomenteEstimativa).\nSaída: A solicitação na situação atual, com versão, dados do pedido, datas de envio, conferência, pesquisa e decisão, pendências, motivo de rejeição, opções e o pedido gerado (número e emissão) quando autorizada.",
          "purpose": "Carrega a solicitação escolhida com suas opções pesquisadas, os marcos do processo do sistema e o pedido gerado.",
          "input": "id: id da solicitação de compra.",
          "processing": "Lê a SolicitacaoCompra pelo id, o produto (nome e unidade) do cadastro mestre, as até três OpcaoCotacao pela solicitacaoId ordenadas pela posição e o PedidoCompra pela solicitacaoId, quando existir. Calcula escolhida (id igual a opcaoEscolhidaId), valorTotalEstimado (preço unitário × quantidade da solicitação, na moeda da opção), completa, quantidadeOpcoes e necessidadeVencida. Toda opção sai com estimativa verdadeira (opcaoSomenteEstimativa).",
          "output": "A solicitação na situação atual, com versão, dados do pedido, datas de envio, conferência, pesquisa e decisão, pendências, motivo de rejeição, opções e o pedido gerado (número e emissão) quando autorizada."
        }
      },
      {
        "route": "compras.solicitacoes.buscarProdutos",
        "kind": "qry",
        "uses": [
          "listProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "produtos",
            "entity": "Produto",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "details",
            "target": "produtos",
            "field": "details"
          }
        ],
        "rules": [
          "produtoInativoNaoSolicitado"
        ],
        "doc": {
          "raw": "Finalidade: Encontra produtos pelo nome digitado para escolher o produto de uma nova solicitação ou filtrar a pesquisa.\nEntrada: details.identification.name: texto procurado no details.identification.name do produto; vazio traz os produtos marcados com compras.Produto.\nProcessamento: Localiza Produto pelo nome (ou pela tag compras.Produto quando sem texto) e mantém apenas os ativos (produtoInativoNaoSolicitado). Limita a 20 resultados ordenados pelo nome.\nSaída: Lista de produtos ativos com id, nome e unidade de medida.",
          "purpose": "Encontra produtos pelo nome digitado para escolher o produto de uma nova solicitação ou filtrar a pesquisa.",
          "input": "details.identification.name: texto procurado no details.identification.name do produto; vazio traz os produtos marcados com compras.Produto.",
          "processing": "Localiza Produto pelo nome (ou pela tag compras.Produto quando sem texto) e mantém apenas os ativos (produtoInativoNaoSolicitado). Limita a 20 resultados ordenados pelo nome.",
          "output": "Lista de produtos ativos com id, nome e unidade de medida."
        }
      },
      {
        "route": "compras.solicitacoes.criarSolicitacao",
        "kind": "cmd",
        "uses": [
          "createSolicitacaoCompra",
          "listOpcaoCotacao",
          "listPedidoCompra"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.justificativa",
                "path": "details.justificativa"
              },
              {
                "field": "details.conferidaEm",
                "path": "details.conferidaEm"
              },
              {
                "field": "details.pendencias",
                "path": "details.pendencias"
              },
              {
                "field": "details.pesquisadaEm",
                "path": "details.pesquisadaEm"
              },
              {
                "field": "details.decididaEm",
                "path": "details.decididaEm"
              },
              {
                "field": "details.motivoRejeicao",
                "path": "details.motivoRejeicao"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "quantidadePositiva",
              "produtoInativoNaoSolicitado",
              "compradorInativoNaoAbreSolicitacao",
              "compradorEscolhidoDaListaDeUsuarios"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "quantidadePositiva",
              "produtoInativoNaoSolicitado",
              "compradorInativoNaoAbreSolicitacao",
              "compradorEscolhidoDaListaDeUsuarios"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.opcoes",
            "entity": "OpcaoCotacao",
            "relationship": "opcaoSolicitacao",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "posicao",
                "path": "posicao"
              },
              {
                "field": "fornecedorNome",
                "path": "fornecedorNome"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              },
              {
                "field": "details.prazoEntregaDias",
                "path": "details.prazoEntregaDias"
              },
              {
                "field": "details.fonte.url",
                "path": "details.fonte.url"
              },
              {
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              },
              {
                "field": "details.estimativa",
                "path": "details.estimativa"
              },
              {
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.pedidoGerado",
            "entity": "PedidoCompra",
            "relationship": "pedidoSolicitacao",
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
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "compradorId",
            "target": "",
            "optional": true
          },
          {
            "name": "opcaoEscolhidaId",
            "target": "",
            "optional": true
          }
        ],
        "rules": [
          "quantidadePositiva",
          "produtoInativoNaoSolicitado",
          "compradorInativoNaoAbreSolicitacao",
          "compradorEscolhidoDaListaDeUsuarios"
        ],
        "doc": {
          "raw": "Finalidade: Abre uma nova solicitação de compra em rascunho.\nEntrada: produtoId: produto pedido; details.quantidade: details.quantidade na unidade do produto; details.justificativa: motivo da necessidade; dataNecessidade: data em que o produto precisa estar disponível; compradorId: comprador responsável escolhido da lista de usuários, quando ausente o servidor usa o usuário logado; opcaoEscolhidaId: opção escolhida, sempre vazia na criação (só é preenchida na autorização).\nProcessamento: Recusa quantidade menor ou igual a zero (quantidadePositiva), produto inativo (produtoInativoNaoSolicitado) e comprador inativo (compradorInativoNaoAbreSolicitacao). O comprador vem sempre da lista de usuários da organização com papel compras.Comprador, nunca é cadastrado aqui (compradorEscolhidoDaListaDeUsuarios); sem compradorId, usa o usuário da sessão. Recusa opcaoEscolhidaId preenchida, pois só a autorização escolhe opção. Emite o número pela sequência do módulo e grava com situação rascunho.\nSaída: A solicitação criada, em rascunho, com número, versão, produto e indicadores calculados, sem opções.",
          "purpose": "Abre uma nova solicitação de compra em rascunho.",
          "input": "produtoId: produto pedido; details.quantidade: details.quantidade na unidade do produto; details.justificativa: motivo da necessidade; dataNecessidade: data em que o produto precisa estar disponível; compradorId: comprador responsável escolhido da lista de usuários, quando ausente o servidor usa o usuário logado; opcaoEscolhidaId: opção escolhida, sempre vazia na criação (só é preenchida na autorização).",
          "processing": "Recusa quantidade menor ou igual a zero (quantidadePositiva), produto inativo (produtoInativoNaoSolicitado) e comprador inativo (compradorInativoNaoAbreSolicitacao). O comprador vem sempre da lista de usuários da organização com papel compras.Comprador, nunca é cadastrado aqui (compradorEscolhidoDaListaDeUsuarios); sem compradorId, usa o usuário da sessão. Recusa opcaoEscolhidaId preenchida, pois só a autorização escolhe opção. Emite o número pela sequência do módulo e grava com situação rascunho.",
          "output": "A solicitação criada, em rascunho, com número, versão, produto e indicadores calculados, sem opções."
        }
      },
      {
        "route": "compras.solicitacoes.enviarSolicitacao",
        "kind": "cmd",
        "uses": [
          "enviar",
          "listOpcaoCotacao",
          "listPedidoCompra"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.justificativa",
                "path": "details.justificativa"
              },
              {
                "field": "details.conferidaEm",
                "path": "details.conferidaEm"
              },
              {
                "field": "details.pendencias",
                "path": "details.pendencias"
              },
              {
                "field": "details.pesquisadaEm",
                "path": "details.pesquisadaEm"
              },
              {
                "field": "details.decididaEm",
                "path": "details.decididaEm"
              },
              {
                "field": "details.motivoRejeicao",
                "path": "details.motivoRejeicao"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "solicitacaoCompletaParaEnviar",
              "quantidadePositiva"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "solicitacaoCompletaParaEnviar",
              "quantidadePositiva"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.opcoes",
            "entity": "OpcaoCotacao",
            "relationship": "opcaoSolicitacao",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "posicao",
                "path": "posicao"
              },
              {
                "field": "fornecedorNome",
                "path": "fornecedorNome"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              },
              {
                "field": "details.prazoEntregaDias",
                "path": "details.prazoEntregaDias"
              },
              {
                "field": "details.fonte.url",
                "path": "details.fonte.url"
              },
              {
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              },
              {
                "field": "details.estimativa",
                "path": "details.estimativa"
              },
              {
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.pedidoGerado",
            "entity": "PedidoCompra",
            "relationship": "pedidoSolicitacao",
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
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "solicitacaoCompletaParaEnviar",
          "quantidadePositiva"
        ],
        "doc": {
          "raw": "Finalidade: Envia a solicitação em rascunho para conferência e pesquisa de opções.\nEntrada: id: solicitação a enviar; version: versão lida, para concorrência otimista.\nProcessamento: Exige situação rascunho e versão atual. Aplica a transição enviar, registrando enviadaEm; recusa quantidade não positiva (quantidadePositiva). A conferência de completude do sistema (solicitacaoCompletaParaEnviar) segue para a pesquisa ou devolve ao rascunho com pendências.\nSaída: A solicitação na nova situação, com enviadaEm e versão atualizada.",
          "purpose": "Envia a solicitação em rascunho para conferência e pesquisa de opções.",
          "input": "id: solicitação a enviar; version: versão lida, para concorrência otimista.",
          "processing": "Exige situação rascunho e versão atual. Aplica a transição enviar, registrando enviadaEm; recusa quantidade não positiva (quantidadePositiva). A conferência de completude do sistema (solicitacaoCompletaParaEnviar) segue para a pesquisa ou devolve ao rascunho com pendências.",
          "output": "A solicitação na nova situação, com enviadaEm e versão atualizada."
        }
      },
      {
        "route": "compras.solicitacoes.autorizarSolicitacao",
        "kind": "cmd",
        "uses": [
          "autorizar",
          "listOpcaoCotacao",
          "listPedidoCompra"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.justificativa",
                "path": "details.justificativa"
              },
              {
                "field": "details.conferidaEm",
                "path": "details.conferidaEm"
              },
              {
                "field": "details.pendencias",
                "path": "details.pendencias"
              },
              {
                "field": "details.pesquisadaEm",
                "path": "details.pesquisadaEm"
              },
              {
                "field": "details.decididaEm",
                "path": "details.decididaEm"
              },
              {
                "field": "details.motivoRejeicao",
                "path": "details.motivoRejeicao"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "apenasGerenteDecide",
              "autorizacaoExigeOpcao",
              "opcaoDaMesmaSolicitacao",
              "pedidoSomenteDeSolicitacaoAutorizada",
              "pedidoUsaOpcaoEscolhida",
              "umPedidoPorSolicitacao",
              "numeroPedidoSequencial"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "apenasGerenteDecide",
              "autorizacaoExigeOpcao",
              "opcaoDaMesmaSolicitacao",
              "pedidoSomenteDeSolicitacaoAutorizada",
              "pedidoUsaOpcaoEscolhida",
              "umPedidoPorSolicitacao",
              "numeroPedidoSequencial"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.opcoes",
            "entity": "OpcaoCotacao",
            "relationship": "opcaoSolicitacao",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "posicao",
                "path": "posicao"
              },
              {
                "field": "fornecedorNome",
                "path": "fornecedorNome"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              },
              {
                "field": "details.prazoEntregaDias",
                "path": "details.prazoEntregaDias"
              },
              {
                "field": "details.fonte.url",
                "path": "details.fonte.url"
              },
              {
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              },
              {
                "field": "details.estimativa",
                "path": "details.estimativa"
              },
              {
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.pedidoGerado",
            "entity": "PedidoCompra",
            "relationship": "pedidoSolicitacao",
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
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "apenasGerenteDecide",
          "autorizacaoExigeOpcao",
          "opcaoDaMesmaSolicitacao",
          "pedidoSomenteDeSolicitacaoAutorizada",
          "pedidoUsaOpcaoEscolhida",
          "umPedidoPorSolicitacao",
          "numeroPedidoSequencial"
        ],
        "doc": {
          "raw": "Finalidade: Autoriza a solicitação escolhendo uma das opções pesquisadas e gera o pedido de compra.\nEntrada: id e version: solicitação e versão lida; opcaoEscolhidaId: opção escolhida; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.\nProcessamento: Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Exige opção (autorizacaoExigeOpcao) pertencente à própria solicitação (opcaoDaMesmaSolicitacao). Na mesma transação aplica a transição autorizar e cria um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção e produto e quantidade da solicitação, com data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).\nSaída: A solicitação autorizada, com opção marcada como escolhida, decididaEm, nova versão e o pedido gerado (número e emissão).",
          "purpose": "Autoriza a solicitação escolhendo uma das opções pesquisadas e gera o pedido de compra.",
          "input": "id e version: solicitação e versão lida; opcaoEscolhidaId: opção escolhida; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.",
          "processing": "Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Exige opção (autorizacaoExigeOpcao) pertencente à própria solicitação (opcaoDaMesmaSolicitacao). Na mesma transação aplica a transição autorizar e cria um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção e produto e quantidade da solicitação, com data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).",
          "output": "A solicitação autorizada, com opção marcada como escolhida, decididaEm, nova versão e o pedido gerado (número e emissão)."
        }
      },
      {
        "route": "compras.solicitacoes.rejeitarSolicitacao",
        "kind": "cmd",
        "uses": [
          "rejeitar",
          "listOpcaoCotacao",
          "listPedidoCompra"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.justificativa",
                "path": "details.justificativa"
              },
              {
                "field": "details.conferidaEm",
                "path": "details.conferidaEm"
              },
              {
                "field": "details.pendencias",
                "path": "details.pendencias"
              },
              {
                "field": "details.pesquisadaEm",
                "path": "details.pesquisadaEm"
              },
              {
                "field": "details.decididaEm",
                "path": "details.decididaEm"
              },
              {
                "field": "details.motivoRejeicao",
                "path": "details.motivoRejeicao"
              },
              {
                "field": "details.completa",
                "path": "details.completa"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
              },
              {
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "apenasGerenteDecide",
              "rejeicaoExigeMotivo"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "apenasGerenteDecide",
              "rejeicaoExigeMotivo"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.opcoes",
            "entity": "OpcaoCotacao",
            "relationship": "opcaoSolicitacao",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "posicao",
                "path": "posicao"
              },
              {
                "field": "fornecedorNome",
                "path": "fornecedorNome"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              },
              {
                "field": "details.prazoEntregaDias",
                "path": "details.prazoEntregaDias"
              },
              {
                "field": "details.fonte.url",
                "path": "details.fonte.url"
              },
              {
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              },
              {
                "field": "details.estimativa",
                "path": "details.estimativa"
              },
              {
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
              }
            ]
          },
          {
            "kind": "related",
            "path": "solicitacao.pedidoGerado",
            "entity": "PedidoCompra",
            "relationship": "pedidoSolicitacao",
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
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoDetalhe: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "apenasGerenteDecide",
          "rejeicaoExigeMotivo"
        ],
        "doc": {
          "raw": "Finalidade: Rejeita a solicitação registrando o motivo informado pelo gerente.\nEntrada: id e version: solicitação e versão lida; details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.\nProcessamento: Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Recusa motivo vazio (rejeicaoExigeMotivo). Aplica a transição rejeitar gravando motivo e decididaEm.\nSaída: A solicitação rejeitada, com motivo, decididaEm, nova versão e suas opções.",
          "purpose": "Rejeita a solicitação registrando o motivo informado pelo gerente.",
          "input": "id e version: solicitação e versão lida; details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.",
          "processing": "Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Recusa motivo vazio (rejeicaoExigeMotivo). Aplica a transição rejeitar gravando motivo e decididaEm.",
          "output": "A solicitação rejeitada, com motivo, decididaEm, nova versão e suas opções."
        }
      }
    ]
  }
} as const;

export default definition;
