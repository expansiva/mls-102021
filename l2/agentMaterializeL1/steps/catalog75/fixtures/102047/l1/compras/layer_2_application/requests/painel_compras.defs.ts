/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/painel_compras.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "painel_compras",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/autorizar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listOpcaoCotacao.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listSolicitacaoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/rejeitar.defs.ts"
  ],
  "data": {
    "pageId": "painel_compras",
    "requests": [
      {
        "route": "compras.painel_compras.carregarPainel",
        "kind": "qry",
        "uses": [
          "listSolicitacaoCompra",
          "listOpcaoCotacao",
          "listPedidoCompra"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "solicitacoes",
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
                "field": "compradorId",
                "path": "compradorId"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
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
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
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
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacoes.produto.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "solicitacaoAguardandoAutorizacao",
              "pedidoAtrasadoAposDataPrevista",
              "totalCompradoPorFornecedorNoMes",
              "opcaoSomenteEstimativa",
              "maximoTresOpcoes"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacoes.produto.details.product.unitOfMeasure",
            "entity": "SolicitacaoCompra",
            "rules": [
              "solicitacaoAguardandoAutorizacao",
              "pedidoAtrasadoAposDataPrevista",
              "totalCompradoPorFornecedorNoMes",
              "opcaoSomenteEstimativa",
              "maximoTresOpcoes"
            ]
          },
          {
            "kind": "computed",
            "path": "solicitacoes.comprador.details.identification.name",
            "entity": "SolicitacaoCompra",
            "rules": [
              "solicitacaoAguardandoAutorizacao",
              "pedidoAtrasadoAposDataPrevista",
              "totalCompradoPorFornecedorNoMes",
              "opcaoSomenteEstimativa",
              "maximoTresOpcoes"
            ]
          },
          {
            "kind": "related",
            "path": "solicitacoes.opcoes",
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
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
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
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              }
            ]
          },
          {
            "kind": "list",
            "path": "pedidosAtrasados",
            "entity": "PedidoCompra",
            "items": "items",
            "page": "pedidosAtrasados.page",
            "pageSize": "pedidosAtrasados.pageSize",
            "hasMore": "pedidosAtrasados.hasMore",
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
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details.atrasado",
                "path": "details.atrasado"
              },
              {
                "field": "details.diasAtraso",
                "path": "details.diasAtraso"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "pedidosAtrasados.items.fornecedor.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "solicitacaoAguardandoAutorizacao",
              "pedidoAtrasadoAposDataPrevista",
              "totalCompradoPorFornecedorNoMes",
              "opcaoSomenteEstimativa",
              "maximoTresOpcoes"
            ]
          },
          {
            "kind": "computed",
            "path": "pedidosAtrasados.items.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "solicitacaoAguardandoAutorizacao",
              "pedidoAtrasadoAposDataPrevista",
              "totalCompradoPorFornecedorNoMes",
              "opcaoSomenteEstimativa",
              "maximoTresOpcoes"
            ]
          },
          {
            "kind": "unresolved",
            "path": "resumo.periodo",
            "reason": "Interface ResumoMes groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly periodo."
          },
          {
            "kind": "unresolved",
            "path": "resumo.details.solicitacoesAguardandoAutorizacao",
            "reason": "Interface ResumoMes groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly details.solicitacoesAguardandoAutorizacao."
          },
          {
            "kind": "unresolved",
            "path": "resumo.details.pedidosEmAberto",
            "reason": "Interface ResumoMes groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly details.pedidosEmAberto."
          },
          {
            "kind": "unresolved",
            "path": "resumo.details.pedidosAtrasados",
            "reason": "Interface ResumoMes groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly details.pedidosAtrasados."
          },
          {
            "kind": "unresolved",
            "path": "resumo.totaisPorFornecedor.fornecedor.details.identification.name",
            "reason": "Interface TotalFornecedor: field fornecedor.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.produto.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacoes.comprador.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field comprador.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedidosAtrasados.fornecedor.details.identification.name",
            "reason": "Interface PedidoAtrasado: field fornecedor.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedidosAtrasados.produto.details.identification.name",
            "reason": "Interface PedidoAtrasado: field produto.details.identification.name is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pedidosAtrasados",
            "pages": "pedidosAtrasados"
          },
          {
            "name": "pageSize",
            "target": "pedidosAtrasados",
            "pages": "pedidosAtrasados"
          }
        ],
        "rules": [
          "solicitacaoAguardandoAutorizacao",
          "pedidoAtrasadoAposDataPrevista",
          "totalCompradoPorFornecedorNoMes",
          "opcaoSomenteEstimativa",
          "maximoTresOpcoes"
        ],
        "doc": {
          "raw": "Finalidade: Carrega de uma vez tudo o que o painel de compras mostra ao abrir: indicadores do mês corrente, total comprado por fornecedor, solicitações aguardando decisão do gerente com suas opções e a primeira página dos pedidos atrasados.\nEntrada: page e pageSize: página e tamanho da página da lista de pedidos atrasados (padrão página 1).\nProcessamento: Lê o PainelCompras do mês corrente (actualDate): a linha geral (fornecedorId vazio) fornece solicitacoesAguardandoAutorizacao, pedidosEmAberto e pedidosAtrasados; as linhas por fornecedor fornecem totalComprado e quantidadePedidos (totalCompradoPorFornecedorNoMes: soma de quantidade × preço unitário dos pedidos gerados no mês), com o nome do fornecedor lido do cadastro mestre, ordenadas por total decrescente. Lista as solicitações da organização com status aguardandoAutorizacao (solicitacaoAguardandoAutorizacao), ordenadas por dataNecessidade, com nome do produto e unidade, nome do comprador e as até três opções (maximoTresOpcoes) ordenadas por posição, buscadas em lote por solicitacaoId; necessidadeVencida, quantidadeOpcoes e valorTotalEstimado (preço unitário × quantidade da solicitação) são calculados, e as opções são apresentadas como estimativa (opcaoSomenteEstimativa). Lista os pedidos em aberto ou parcialmente recebidos com dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, calculando atrasado, diasAtraso, saldoAReceber e valorTotal.\nSaída: resumo: indicadores do mês com o total por fornecedor; solicitacoes: solicitações aguardando autorização com suas opções; pedidosAtrasados: página { items, page, pageSize, hasMore } de pedidos atrasados.",
          "purpose": "Carrega de uma vez tudo o que o painel de compras mostra ao abrir: indicadores do mês corrente, total comprado por fornecedor, solicitações aguardando decisão do gerente com suas opções e a primeira página dos pedidos atrasados.",
          "input": "page e pageSize: página e tamanho da página da lista de pedidos atrasados (padrão página 1).",
          "processing": "Lê o PainelCompras do mês corrente (actualDate): a linha geral (fornecedorId vazio) fornece solicitacoesAguardandoAutorizacao, pedidosEmAberto e pedidosAtrasados; as linhas por fornecedor fornecem totalComprado e quantidadePedidos (totalCompradoPorFornecedorNoMes: soma de quantidade × preço unitário dos pedidos gerados no mês), com o nome do fornecedor lido do cadastro mestre, ordenadas por total decrescente. Lista as solicitações da organização com status aguardandoAutorizacao (solicitacaoAguardandoAutorizacao), ordenadas por dataNecessidade, com nome do produto e unidade, nome do comprador e as até três opções (maximoTresOpcoes) ordenadas por posição, buscadas em lote por solicitacaoId; necessidadeVencida, quantidadeOpcoes e valorTotalEstimado (preço unitário × quantidade da solicitação) são calculados, e as opções são apresentadas como estimativa (opcaoSomenteEstimativa). Lista os pedidos em aberto ou parcialmente recebidos com dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, calculando atrasado, diasAtraso, saldoAReceber e valorTotal.",
          "output": "resumo: indicadores do mês com o total por fornecedor; solicitacoes: solicitações aguardando autorização com suas opções; pedidosAtrasados: página { items, page, pageSize, hasMore } de pedidos atrasados."
        }
      },
      {
        "route": "compras.painel_compras.listarPedidosAtrasados",
        "kind": "qry",
        "uses": [
          "listPedidoCompra"
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
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details.atrasado",
                "path": "details.atrasado"
              },
              {
                "field": "details.diasAtraso",
                "path": "details.diasAtraso"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              },
              {
                "field": "details.moeda",
                "path": "details.moeda"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "pedidos.items.fornecedor.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "pedidoAtrasadoAposDataPrevista"
            ]
          },
          {
            "kind": "computed",
            "path": "pedidos.items.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "pedidoAtrasadoAposDataPrevista"
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedidos.fornecedor.details.identification.name",
            "reason": "Interface PedidoAtrasado: field fornecedor.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedidos.produto.details.identification.name",
            "reason": "Interface PedidoAtrasado: field produto.details.identification.name is not a field of any entity."
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
          }
        ],
        "rules": [
          "pedidoAtrasadoAposDataPrevista"
        ],
        "doc": {
          "raw": "Finalidade: Busca as páginas seguintes da lista de pedidos atrasados da organização.\nEntrada: page: número da página pedida; pageSize: quantidade de pedidos por página.\nProcessamento: Filtra pedidos com status emAberto ou parcialmenteRecebido e dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, mesmo critério de carregarPainel; lê nomes de fornecedor e produto do cadastro mestre; atrasado, diasAtraso, saldoAReceber e valorTotal são calculados.\nSaída: pedidos: página { items, page, pageSize, hasMore } de pedidos atrasados com fornecedor, produto, data prevista, dias de atraso e saldo a receber.",
          "purpose": "Busca as páginas seguintes da lista de pedidos atrasados da organização.",
          "input": "page: número da página pedida; pageSize: quantidade de pedidos por página.",
          "processing": "Filtra pedidos com status emAberto ou parcialmenteRecebido e dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, mesmo critério de carregarPainel; lê nomes de fornecedor e produto do cadastro mestre; atrasado, diasAtraso, saldoAReceber e valorTotal são calculados.",
          "output": "pedidos: página { items, page, pageSize, hasMore } de pedidos atrasados com fornecedor, produto, data prevista, dias de atraso e saldo a receber."
        }
      },
      {
        "route": "compras.painel_compras.autorizarSolicitacao",
        "kind": "cmd",
        "uses": [
          "autorizar",
          "listOpcaoCotacao"
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
                "field": "compradorId",
                "path": "compradorId"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
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
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
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
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
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
            "kind": "computed",
            "path": "solicitacao.comprador.details.identification.name",
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
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
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
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.comprador.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field comprador.details.identification.name is not a field of any entity."
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
          "raw": "Finalidade: Autoriza uma solicitação aguardando autorização escolhendo uma das opções pesquisadas, gerando o pedido de compra.\nEntrada: id e version: solicitação e versão lida (concorrência otimista); opcaoEscolhidaId: opção pesquisada escolhida pelo gerente; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.\nProcessamento: Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); exige opção informada (autorizacaoExigeOpcao) e pertencente à própria solicitação (opcaoDaMesmaSolicitacao); recusa versão divergente. Executa a transição autorizar gravando opcaoEscolhidaId e decididaEm e, na mesma transação, gera um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção, produto e quantidade da solicitação e data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).\nSaída: solicitacao: a solicitação em status autorizada, com a opção escolhida, decididaEm e suas opções (escolhida marcada).",
          "purpose": "Autoriza uma solicitação aguardando autorização escolhendo uma das opções pesquisadas, gerando o pedido de compra.",
          "input": "id e version: solicitação e versão lida (concorrência otimista); opcaoEscolhidaId: opção pesquisada escolhida pelo gerente; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.",
          "processing": "Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); exige opção informada (autorizacaoExigeOpcao) e pertencente à própria solicitação (opcaoDaMesmaSolicitacao); recusa versão divergente. Executa a transição autorizar gravando opcaoEscolhidaId e decididaEm e, na mesma transação, gera um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção, produto e quantidade da solicitação e data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).",
          "output": "solicitacao: a solicitação em status autorizada, com a opção escolhida, decididaEm e suas opções (escolhida marcada)."
        }
      },
      {
        "route": "compras.painel_compras.rejeitarSolicitacao",
        "kind": "cmd",
        "uses": [
          "rejeitar",
          "listOpcaoCotacao"
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
                "field": "compradorId",
                "path": "compradorId"
              },
              {
                "field": "dataNecessidade",
                "path": "dataNecessidade"
              },
              {
                "field": "enviadaEm",
                "path": "enviadaEm"
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
                "field": "details.necessidadeVencida",
                "path": "details.necessidadeVencida"
              },
              {
                "field": "details.quantidadeOpcoes",
                "path": "details.quantidadeOpcoes"
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
                "field": "opcaoEscolhidaId",
                "path": "opcaoEscolhidaId"
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
            "kind": "computed",
            "path": "solicitacao.comprador.details.identification.name",
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
                "field": "tipoFonte",
                "path": "tipoFonte"
              },
              {
                "field": "dataPesquisa",
                "path": "dataPesquisa"
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
                "field": "details.fonte.descricao",
                "path": "details.fonte.descricao"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.valorTotalEstimado",
                "path": "details.valorTotalEstimado"
              },
              {
                "field": "details.escolhida",
                "path": "details.escolhida"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.produto.details.product.unitOfMeasure",
            "reason": "Interface SolicitacaoEmDecisao: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "solicitacao.comprador.details.identification.name",
            "reason": "Interface SolicitacaoEmDecisao: field comprador.details.identification.name is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "apenasGerenteDecide",
          "rejeicaoExigeMotivo"
        ],
        "doc": {
          "raw": "Finalidade: Rejeita uma solicitação aguardando autorização registrando o motivo informado pelo gerente.\nEntrada: id e version: solicitação e versão lida (concorrência otimista); details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.\nProcessamento: Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); recusa motivo vazio (rejeicaoExigeMotivo); recusa versão divergente. Executa a transição rejeitar gravando motivoRejeicao e decididaEm; nenhum pedido é gerado.\nSaída: solicitacao: a solicitação em status rejeitada, com motivo, decididaEm e suas opções.",
          "purpose": "Rejeita uma solicitação aguardando autorização registrando o motivo informado pelo gerente.",
          "input": "id e version: solicitação e versão lida (concorrência otimista); details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.",
          "processing": "Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); recusa motivo vazio (rejeicaoExigeMotivo); recusa versão divergente. Executa a transição rejeitar gravando motivoRejeicao e decididaEm; nenhum pedido é gerado.",
          "output": "solicitacao: a solicitação em status rejeitada, com motivo, decididaEm e suas opções."
        }
      }
    ]
  }
} as const;

export default definition;
