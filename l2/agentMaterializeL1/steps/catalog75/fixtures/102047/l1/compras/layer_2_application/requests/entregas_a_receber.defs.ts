/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/entregas_a_receber.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "entregas_a_receber",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/createRecebimento.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listRecebimento.defs.ts"
  ],
  "data": {
    "pageId": "entregas_a_receber",
    "requests": [
      {
        "route": "compras.entregas_a_receber.getEntregasDoDia",
        "kind": "qry",
        "uses": [
          "listPedidoCompra"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "resumo",
            "entity": "PedidoCompra",
            "items": "",
            "fields": []
          },
          {
            "kind": "list",
            "path": "fila",
            "entity": "PedidoCompra",
            "items": "items",
            "page": "fila.page",
            "pageSize": "fila.pageSize",
            "hasMore": "fila.hasMore",
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
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
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
                "field": "details.entregaPrevistaHoje",
                "path": "details.entregaPrevistaHoje"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "fila.items.fornecedor.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "fila.items.fornecedor.details.company.legalName",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "fila.items.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "fila.items.produto.details.product.unitOfMeasure",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "unresolved",
            "path": "resumo.entregasPrevistasHoje",
            "reason": "Interface ResumoEntregas pages atrasados; entregasPrevistasHoje is not one of the paging keys total, page, pageSize, hasMore next to items, so the types do not say what it is."
          },
          {
            "kind": "unresolved",
            "path": "resumo.pedidosAtrasados",
            "reason": "Interface ResumoEntregas pages atrasados; pedidosAtrasados is not one of the paging keys total, page, pageSize, hasMore next to items, so the types do not say what it is."
          },
          {
            "kind": "unresolved",
            "path": "resumo.maiorAtrasoDias",
            "reason": "Interface ResumoEntregas pages atrasados; maiorAtrasoDias is not one of the paging keys total, page, pageSize, hasMore next to items, so the types do not say what it is."
          },
          {
            "kind": "unresolved",
            "path": "resumo.saldoTotalAReceber",
            "reason": "Interface ResumoEntregas pages atrasados; saldoTotalAReceber is not one of the paging keys total, page, pageSize, hasMore next to items, so the types do not say what it is."
          },
          {
            "kind": "unresolved",
            "path": "fila.fornecedor.details.identification.name",
            "reason": "Interface PedidoAguardandoEntrega: field fornecedor.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.fornecedor.details.company.legalName",
            "reason": "Interface PedidoAguardandoEntrega: field fornecedor.details.company.legalName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.produto.details.identification.name",
            "reason": "Interface PedidoAguardandoEntrega: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.produto.details.product.unitOfMeasure",
            "reason": "Interface PedidoAguardandoEntrega: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "resumo.entregasPrevistasHoje",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route compras.entregas_a_receber.getEntregasDoDia projects PedidoCompra.entregasPrevistasHoje, which is not a field of the ontology."
          },
          {
            "kind": "unresolved",
            "path": "resumo.pedidosAtrasados",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route compras.entregas_a_receber.getEntregasDoDia projects PedidoCompra.pedidosAtrasados, which is not a field of the ontology."
          },
          {
            "kind": "unresolved",
            "path": "resumo.maiorAtrasoDias",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route compras.entregas_a_receber.getEntregasDoDia projects PedidoCompra.maiorAtrasoDias, which is not a field of the ontology."
          },
          {
            "kind": "unresolved",
            "path": "resumo.saldoTotalAReceber",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route compras.entregas_a_receber.getEntregasDoDia projects PedidoCompra.saldoTotalAReceber, which is not a field of the ontology."
          },
          {
            "kind": "unresolved",
            "path": "resumo.atrasados",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route compras.entregas_a_receber.getEntregasDoDia projects PedidoCompra.atrasados, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "fila",
            "pages": "fila"
          },
          {
            "name": "pageSize",
            "target": "fila",
            "pages": "fila"
          }
        ],
        "rules": [
          "lembreteEntregaEAtraso"
        ],
        "doc": {
          "raw": "Finalidade: Carrega na abertura da página a situação do dia e a primeira página da fila de pedidos aguardando entrega da organização.\nEntrada: page: número da página da fila (começa em 1); pageSize: quantidade de pedidos por página.\nProcessamento: Considera apenas pedidos com status emAberto ou parcialmenteRecebido (os mesmos que a regra lembreteEntregaEAtraso acompanha). Calcula, sem gravar, os derivados de cada pedido: quantidadeRecebida (soma dos recebimentos), saldoAReceber (quantidade menos recebido), atrasado (data prevista anterior a hoje), diasAtraso (dias entre a data prevista e hoje, zero se não atrasado) e entregaPrevistaHoje. O resumo conta os pedidos com entrega prevista hoje, os atrasados, o maior número de dias de atraso, soma o saldo a receber de todos e lista os atrasados com número e dias de atraso. A fila junta razão social e nome do fornecedor e nome e unidade do produto, ordenada por atrasados primeiro (mais dias de atraso), depois previstos para hoje, depois data prevista crescente.\nSaída: resumo com os indicadores já calculados e a lista de atrasados; fila paginada { items, page, pageSize, hasMore } de pedidos aguardando entrega com fornecedor, produto, quantidades e indicadores de atraso.",
          "purpose": "Carrega na abertura da página a situação do dia e a primeira página da fila de pedidos aguardando entrega da organização.",
          "input": "page: número da página da fila (começa em 1); pageSize: quantidade de pedidos por página.",
          "processing": "Considera apenas pedidos com status emAberto ou parcialmenteRecebido (os mesmos que a regra lembreteEntregaEAtraso acompanha). Calcula, sem gravar, os derivados de cada pedido: quantidadeRecebida (soma dos recebimentos), saldoAReceber (quantidade menos recebido), atrasado (data prevista anterior a hoje), diasAtraso (dias entre a data prevista e hoje, zero se não atrasado) e entregaPrevistaHoje. O resumo conta os pedidos com entrega prevista hoje, os atrasados, o maior número de dias de atraso, soma o saldo a receber de todos e lista os atrasados com número e dias de atraso. A fila junta razão social e nome do fornecedor e nome e unidade do produto, ordenada por atrasados primeiro (mais dias de atraso), depois previstos para hoje, depois data prevista crescente.",
          "output": "resumo com os indicadores já calculados e a lista de atrasados; fila paginada { items, page, pageSize, hasMore } de pedidos aguardando entrega com fornecedor, produto, quantidades e indicadores de atraso."
        }
      },
      {
        "route": "compras.entregas_a_receber.buscarFilaEntregas",
        "kind": "qry",
        "uses": [
          "listPedidoCompra"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "fila",
            "entity": "PedidoCompra",
            "items": "items",
            "page": "fila.page",
            "pageSize": "fila.pageSize",
            "hasMore": "fila.hasMore",
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
                "field": "dataPrevistaEntrega",
                "path": "dataPrevistaEntrega"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
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
                "field": "details.entregaPrevistaHoje",
                "path": "details.entregaPrevistaHoje"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "fila.items.fornecedor.details.identification.name",
            "entity": "PedidoCompra",
            "rules": []
          },
          {
            "kind": "computed",
            "path": "fila.items.fornecedor.details.company.legalName",
            "entity": "PedidoCompra",
            "rules": []
          },
          {
            "kind": "computed",
            "path": "fila.items.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": []
          },
          {
            "kind": "computed",
            "path": "fila.items.produto.details.product.unitOfMeasure",
            "entity": "PedidoCompra",
            "rules": []
          },
          {
            "kind": "unresolved",
            "path": "fila.fornecedor.details.identification.name",
            "reason": "Interface PedidoAguardandoEntrega: field fornecedor.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.fornecedor.details.company.legalName",
            "reason": "Interface PedidoAguardandoEntrega: field fornecedor.details.company.legalName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.produto.details.identification.name",
            "reason": "Interface PedidoAguardandoEntrega: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "fila.produto.details.product.unitOfMeasure",
            "reason": "Interface PedidoAguardandoEntrega: field produto.details.product.unitOfMeasure is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "fila",
            "pages": "fila"
          },
          {
            "name": "pageSize",
            "target": "fila",
            "pages": "fila"
          },
          {
            "name": "numero",
            "target": "fila",
            "field": "numero",
            "optional": true
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Busca na fila de pedidos aguardando entrega pelo número do pedido e navega entre as páginas.\nEntrada: numero: texto do número do pedido digitado na busca (vazio traz todos); page e pageSize: página pedida e tamanho da página.\nProcessamento: Mesmo filtro da fila de abertura (status emAberto ou parcialmenteRecebido), acrescido da busca por número (locate.byText). Calcula os derivados quantidadeRecebida, saldoAReceber, atrasado, diasAtraso e entregaPrevistaHoje, junta fornecedor e produto e mantém a mesma ordenação.\nSaída: fila paginada { items, page, pageSize, hasMore } dos pedidos aguardando entrega que atendem à busca.",
          "purpose": "Busca na fila de pedidos aguardando entrega pelo número do pedido e navega entre as páginas.",
          "input": "numero: texto do número do pedido digitado na busca (vazio traz todos); page e pageSize: página pedida e tamanho da página.",
          "processing": "Mesmo filtro da fila de abertura (status emAberto ou parcialmenteRecebido), acrescido da busca por número (locate.byText). Calcula os derivados quantidadeRecebida, saldoAReceber, atrasado, diasAtraso e entregaPrevistaHoje, junta fornecedor e produto e mantém a mesma ordenação.",
          "output": "fila paginada { items, page, pageSize, hasMore } dos pedidos aguardando entrega que atendem à busca."
        }
      },
      {
        "route": "compras.entregas_a_receber.getPedidoParaRecebimento",
        "kind": "qry",
        "uses": [
          "listPedidoCompra",
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
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "status",
                "path": "status"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
              },
              {
                "field": "details.observacoes",
                "path": "details.observacoes"
              },
              {
                "field": "details.ultimoLembreteEm",
                "path": "details.ultimoLembreteEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.company.legalName",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.company.tradeName",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.identification.docId",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.sku",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.unitOfMeasure",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.isInventoried",
            "entity": "PedidoCompra",
            "rules": [
              "lembreteEntregaEAtraso"
            ]
          },
          {
            "kind": "list",
            "path": "recebimentos",
            "entity": "Recebimento",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pedidoCompraId",
                "path": "pedidoCompraId"
              },
              {
                "field": "dataRecebimento",
                "path": "dataRecebimento"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.recebimentoTotal",
                "path": "details.recebimentoTotal"
              },
              {
                "field": "details.saldoPendente",
                "path": "details.saldoPendente"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company.legalName",
            "reason": "Interface PedidoConferencia: field fornecedor.details.company.legalName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company.tradeName",
            "reason": "Interface PedidoConferencia: field fornecedor.details.company.tradeName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.identification.docId",
            "reason": "Interface PedidoConferencia: field fornecedor.details.identification.docId is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.identification.name",
            "reason": "Interface PedidoConferencia: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.sku",
            "reason": "Interface PedidoConferencia: field produto.details.product.sku is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.unitOfMeasure",
            "reason": "Interface PedidoConferencia: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.isInventoried",
            "reason": "Interface PedidoConferencia: field produto.details.product.isInventoried is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "pedido",
            "field": "id"
          }
        ],
        "rules": [
          "lembreteEntregaEAtraso"
        ],
        "doc": {
          "raw": "Finalidade: Abre o pedido escolhido na fila ou vindo do lembrete, com os dados de conferência e o histórico de recebimentos.\nEntrada: id: id do pedido de compra selecionado.\nProcessamento: Lê o pedido pelo id, junta do cadastro mestre razão social, nome fantasia e CNPJ do fornecedor e nome, SKU, unidade e controle de estoque do produto. Lista os recebimentos do pedido (listByForeignKey) em ordem de data. Calcula, sem gravar, quantidadeRecebida e saldoAReceber do pedido e, para cada recebimento, recebimentoTotal e saldoPendente acumulados até ele. ultimoLembreteEm é o dia do último lembrete da regra lembreteEntregaEAtraso.\nSaída: pedido com dados de conferência, datas de emissão, previsão e último lembrete; recebimentos já lançados com data, quantidade, observação e saldo pendente.",
          "purpose": "Abre o pedido escolhido na fila ou vindo do lembrete, com os dados de conferência e o histórico de recebimentos.",
          "input": "id: id do pedido de compra selecionado.",
          "processing": "Lê o pedido pelo id, junta do cadastro mestre razão social, nome fantasia e CNPJ do fornecedor e nome, SKU, unidade e controle de estoque do produto. Lista os recebimentos do pedido (listByForeignKey) em ordem de data. Calcula, sem gravar, quantidadeRecebida e saldoAReceber do pedido e, para cada recebimento, recebimentoTotal e saldoPendente acumulados até ele. ultimoLembreteEm é o dia do último lembrete da regra lembreteEntregaEAtraso.",
          "output": "pedido com dados de conferência, datas de emissão, previsão e último lembrete; recebimentos já lançados com data, quantidade, observação e saldo pendente."
        }
      },
      {
        "route": "compras.entregas_a_receber.registrarRecebimento",
        "kind": "cmd",
        "uses": [
          "createRecebimento",
          "listPedidoCompra"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "recebimento",
            "entity": "Recebimento",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pedidoCompraId",
                "path": "pedidoCompraId"
              },
              {
                "field": "dataRecebimento",
                "path": "dataRecebimento"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.recebimentoTotal",
                "path": "details.recebimentoTotal"
              },
              {
                "field": "details.saldoPendente",
                "path": "details.saldoPendente"
              }
            ]
          },
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
                "field": "numero",
                "path": "numero"
              },
              {
                "field": "status",
                "path": "status"
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
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.quantidadeRecebida",
                "path": "details.quantidadeRecebida"
              },
              {
                "field": "details.saldoAReceber",
                "path": "details.saldoAReceber"
              },
              {
                "field": "details.observacoes",
                "path": "details.observacoes"
              },
              {
                "field": "details.ultimoLembreteEm",
                "path": "details.ultimoLembreteEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.company.legalName",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.company.tradeName",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.fornecedor.details.identification.docId",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.identification.name",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.sku",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.unitOfMeasure",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "computed",
            "path": "pedido.produto.details.product.isInventoried",
            "entity": "PedidoCompra",
            "rules": [
              "recebimentoSomentePedidoEmAberto",
              "quantidadeRecebidaPositiva",
              "recebimentoNaoExcedeSaldo",
              "recebimentoNaoExcedePedido",
              "recebimentoAtualizaSituacaoPedido",
              "recebimentoDaEntradaEstoque"
            ]
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company.legalName",
            "reason": "Interface PedidoConferencia: field fornecedor.details.company.legalName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.company.tradeName",
            "reason": "Interface PedidoConferencia: field fornecedor.details.company.tradeName is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.fornecedor.details.identification.docId",
            "reason": "Interface PedidoConferencia: field fornecedor.details.identification.docId is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.identification.name",
            "reason": "Interface PedidoConferencia: field produto.details.identification.name is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.sku",
            "reason": "Interface PedidoConferencia: field produto.details.product.sku is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.unitOfMeasure",
            "reason": "Interface PedidoConferencia: field produto.details.product.unitOfMeasure is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "pedido.produto.details.product.isInventoried",
            "reason": "Interface PedidoConferencia: field produto.details.product.isInventoried is not a field of any entity."
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
          "raw": "Finalidade: Lança o recebimento total ou parcial do pedido conferido, dá entrada no estoque e atualiza a situação do pedido.\nEntrada: pedidoCompraId: pedido cuja chegada é registrada; dataRecebimento: momento da chegada; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: avarias ou divergências encontradas (opcional).\nProcessamento: Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva), se for maior que o saldo a receber (recebimentoNaoExcedeSaldo) ou se a soma recebida ultrapassar a quantidade pedida (recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, dá entrada no estoque da quantidade do produto do pedido (recebimentoDaEntradaEstoque, compras.darEntradaEstoque) e move o pedido para recebido (concluirRecebimento) quando a soma alcança a quantidade pedida ou para parcialmenteRecebido (registrarRecebimentoParcial) quando resta saldo (recebimentoAtualizaSituacaoPedido). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.\nSaída: recebimento criado com recebimentoTotal e saldoPendente calculados; pedido na nova situação com quantidade recebida e saldo a receber atualizados.",
          "purpose": "Lança o recebimento total ou parcial do pedido conferido, dá entrada no estoque e atualiza a situação do pedido.",
          "input": "pedidoCompraId: pedido cuja chegada é registrada; dataRecebimento: momento da chegada; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: avarias ou divergências encontradas (opcional).",
          "processing": "Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva), se for maior que o saldo a receber (recebimentoNaoExcedeSaldo) ou se a soma recebida ultrapassar a quantidade pedida (recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, dá entrada no estoque da quantidade do produto do pedido (recebimentoDaEntradaEstoque, compras.darEntradaEstoque) e move o pedido para recebido (concluirRecebimento) quando a soma alcança a quantidade pedida ou para parcialmenteRecebido (registrarRecebimentoParcial) quando resta saldo (recebimentoAtualizaSituacaoPedido). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.",
          "output": "recebimento criado com recebimentoTotal e saldoPendente calculados; pedido na nova situação com quantidade recebida e saldo a receber atualizados."
        }
      }
    ]
  }
} as const;

export default definition;
