/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/fechamento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "fechamento",
  "moduleName": "comandaRestaurante",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/fecharComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getMesa.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listItemComanda.defs.ts"
  ],
  "data": {
    "pageId": "fechamento",
    "requests": [
      {
        "route": "comandaRestaurante.fechamento.carregarFechamento",
        "kind": "qry",
        "uses": [
          "listComanda",
          "getMesa",
          "getComanda",
          "listItemComanda",
          "getItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "openComandas",
            "entity": "Comanda",
            "items": "items",
            "page": "openComandas.page",
            "pageSize": "openComandas.pageSize",
            "hasMore": "openComandas.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "number",
                "path": "number"
              },
              {
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "openComandas.items.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "entity",
            "path": "selectedComanda",
            "entity": "Comanda",
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
                "field": "number",
                "path": "number"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "selectedComanda.items",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "selectedComanda.items.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "name",
                "path": "name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "selectedComanda.mesa",
            "reason": "Interface MesaNoFechamento has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "selectedComanda.mesa",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route comandaRestaurante.fechamento.carregarFechamento projects Comanda.mesa, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "pageSize",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "number",
            "target": "openComandas",
            "field": "number"
          }
        ],
        "rules": [
          "subtotalComandaCalculado",
          "totalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Carrega o fechamento com as comandas abertas para localização e, quando houver contexto, a cobrança completa que o caixa irá conferir.\nEntrada: comandaId identifica a comanda recebida no contexto. number e mesaCode restringem a localização inicial. page e pageSize definem a janela da lista de comandas abertas.\nProcessamento: Filtra a lista obrigatoriamente por situação open, aplica número e código de mesa quando informados, ordena de forma estável e entrega a janela paginada. Compõe o código da mesa e calcula o total de cada resumo conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Se comandaId identificar uma comanda aberta, compõe suas linhas launched, nomes do cardápio, pagamento, totais calculados e disponibilidade calculada da mesa; campos derivados são apenas calculados.\nSaída: Retorna uma lista paginada e enxuta pronta para localizar a conta e, opcionalmente, a comanda contextual completa para preencher revisão, pagamento e ação de fechamento.",
          "purpose": "Carrega o fechamento com as comandas abertas para localização e, quando houver contexto, a cobrança completa que o caixa irá conferir.",
          "input": "comandaId identifica a comanda recebida no contexto. number e mesaCode restringem a localização inicial. page e pageSize definem a janela da lista de comandas abertas.",
          "processing": "Filtra a lista obrigatoriamente por situação open, aplica número e código de mesa quando informados, ordena de forma estável e entrega a janela paginada. Compõe o código da mesa e calcula o total de cada resumo conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Se comandaId identificar uma comanda aberta, compõe suas linhas launched, nomes do cardápio, pagamento, totais calculados e disponibilidade calculada da mesa; campos derivados são apenas calculados.",
          "output": "Retorna uma lista paginada e enxuta pronta para localizar a conta e, opcionalmente, a comanda contextual completa para preencher revisão, pagamento e ação de fechamento."
        }
      },
      {
        "route": "comandaRestaurante.fechamento.buscarComandasAbertas",
        "kind": "qry",
        "uses": [
          "listComanda",
          "getMesa"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "openComandas",
            "entity": "Comanda",
            "items": "items",
            "page": "openComandas.page",
            "pageSize": "openComandas.pageSize",
            "hasMore": "openComandas.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "number",
                "path": "number"
              },
              {
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "openComandas.items.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "code",
                "path": "code"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "pageSize",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "number",
            "target": "openComandas",
            "field": "number"
          }
        ],
        "rules": [
          "subtotalComandaCalculado",
          "totalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Substitui a lista de localização pelas comandas abertas que correspondem ao número ou à mesa procurados pelo caixa.\nEntrada: number filtra pelo número da comanda e mesaCode pelo código da mesa. page e pageSize definem a primeira janela resultante da busca ou troca de filtros.\nProcessamento: Restringe o resultado a comandas open, combina os filtros informados e ordena antes de paginar. Para cada resumo, compõe a mesa e calcula totalComanda pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado, sem registrar valores derivados.\nSaída: Retorna a janela paginada de resumos para substituir a lista que o caixa está pesquisando.",
          "purpose": "Substitui a lista de localização pelas comandas abertas que correspondem ao número ou à mesa procurados pelo caixa.",
          "input": "number filtra pelo número da comanda e mesaCode pelo código da mesa. page e pageSize definem a primeira janela resultante da busca ou troca de filtros.",
          "processing": "Restringe o resultado a comandas open, combina os filtros informados e ordena antes de paginar. Para cada resumo, compõe a mesa e calcula totalComanda pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado, sem registrar valores derivados.",
          "output": "Retorna a janela paginada de resumos para substituir a lista que o caixa está pesquisando."
        }
      },
      {
        "route": "comandaRestaurante.fechamento.carregarMaisComandasAbertas",
        "kind": "qry",
        "uses": [
          "listComanda",
          "getMesa"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "openComandas",
            "entity": "Comanda",
            "items": "items",
            "page": "openComandas.page",
            "pageSize": "openComandas.pageSize",
            "hasMore": "openComandas.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "number",
                "path": "number"
              },
              {
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "openComandas.items.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "code",
                "path": "code"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "pageSize",
            "target": "openComandas",
            "pages": "openComandas"
          },
          {
            "name": "number",
            "target": "openComandas",
            "field": "number"
          }
        ],
        "rules": [
          "subtotalComandaCalculado",
          "totalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Busca a próxima janela das comandas abertas da localização atual sem recarregar os resumos já exibidos.\nEntrada: number e mesaCode repetem os filtros ativos. page e pageSize identificam a próxima janela solicitada.\nProcessamento: Aplica os mesmos filtros obrigatórios de situação open, número e mesa, ordena de forma estável e pagina a próxima janela. Compõe mesa e total calculado conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado.\nSaída: Retorna uma página adicional de resumos para ser anexada à lista de comandas abertas.",
          "purpose": "Busca a próxima janela das comandas abertas da localização atual sem recarregar os resumos já exibidos.",
          "input": "number e mesaCode repetem os filtros ativos. page e pageSize identificam a próxima janela solicitada.",
          "processing": "Aplica os mesmos filtros obrigatórios de situação open, número e mesa, ordena de forma estável e pagina a próxima janela. Compõe mesa e total calculado conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado.",
          "output": "Retorna uma página adicional de resumos para ser anexada à lista de comandas abertas."
        }
      },
      {
        "route": "comandaRestaurante.fechamento.obterComandaParaFechamento",
        "kind": "qry",
        "uses": [
          "getComanda",
          "listItemComanda",
          "getItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "comanda",
            "entity": "Comanda",
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
                "field": "number",
                "path": "number"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.items",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.items.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "name",
                "path": "name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "comanda.mesa",
            "reason": "Interface MesaNoFechamento has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "comanda.mesa",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route comandaRestaurante.fechamento.obterComandaParaFechamento projects Comanda.mesa, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "comanda",
            "field": "id"
          }
        ],
        "rules": [
          "subtotalComandaCalculado",
          "totalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Obtém a comanda aberta selecionada pelo caixa, já composta para conferência, recebimento e fechamento.\nEntrada: id é o identificador da comanda escolhida na lista de comandas abertas.\nProcessamento: Lê a comanda aberta autorizada, inclui somente itens launched, associa o nome de cada ItemCardapio e calcula valorTotal, subtotal e totalComanda segundo valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Também calcula o indicador de disponibilidade da mesa, sem gravar nenhum campo derivado.\nSaída: Retorna versão, situação, linhas válidas, desconto, forma de pagamento, totais e indicador da mesa para os organismos de revisão, pagamento e fechamento.",
          "purpose": "Obtém a comanda aberta selecionada pelo caixa, já composta para conferência, recebimento e fechamento.",
          "input": "id é o identificador da comanda escolhida na lista de comandas abertas.",
          "processing": "Lê a comanda aberta autorizada, inclui somente itens launched, associa o nome de cada ItemCardapio e calcula valorTotal, subtotal e totalComanda segundo valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Também calcula o indicador de disponibilidade da mesa, sem gravar nenhum campo derivado.",
          "output": "Retorna versão, situação, linhas válidas, desconto, forma de pagamento, totais e indicador da mesa para os organismos de revisão, pagamento e fechamento."
        }
      },
      {
        "route": "comandaRestaurante.fechamento.fecharComandaPaga",
        "kind": "cmd",
        "uses": [
          "fecharComanda",
          "listItemComanda",
          "getItemCardapio"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "comanda",
            "entity": "Comanda",
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
                "field": "number",
                "path": "number"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.items",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.items.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "name",
                "path": "name"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "comanda.mesa",
            "rules": [
              "fechamentoLiberaMesa"
            ]
          },
          {
            "kind": "unresolved",
            "path": "comanda.mesa",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route comandaRestaurante.fechamento.fecharComandaPaga projects Comanda.mesa, which is not a field of the ontology."
          }
        ],
        "params": [],
        "rules": [
          "pagamentoObrigatorioNoFechamento",
          "descontoNaoExcedeSubtotal",
          "fechamentoLiberaMesa",
          "subtotalComandaCalculado",
          "totalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Registra o desconto e o pagamento, fecha a comanda e confirma que sua mesa foi liberada.\nEntrada: id e version identificam a comanda aberta e protegem contra fechamento concorrente. discountAmount é o desconto opcional. paymentMethod é a forma de pagamento obrigatória do fechamento.\nProcessamento: Em transação, recompõe os itens launched e recalcula valorTotal, subtotal e total pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Recusa pagamento ausente por pagamentoObrigatorioNoFechamento e desconto superior ao subtotal por descontoNaoExcedeSubtotal. Com a versão válida, grava o payload da transição fecharComanda, muda a situação para closed e libera a mesa segundo fechamentoLiberaMesa.\nSaída: Retorna a comanda fechada, com linhas, desconto, pagamento, totais recalculados e indicador de mesa disponível, para redesenhar imediatamente a confirmação.",
          "purpose": "Registra o desconto e o pagamento, fecha a comanda e confirma que sua mesa foi liberada.",
          "input": "id e version identificam a comanda aberta e protegem contra fechamento concorrente. discountAmount é o desconto opcional. paymentMethod é a forma de pagamento obrigatória do fechamento.",
          "processing": "Em transação, recompõe os itens launched e recalcula valorTotal, subtotal e total pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Recusa pagamento ausente por pagamentoObrigatorioNoFechamento e desconto superior ao subtotal por descontoNaoExcedeSubtotal. Com a versão válida, grava o payload da transição fecharComanda, muda a situação para closed e libera a mesa segundo fechamentoLiberaMesa.",
          "output": "Retorna a comanda fechada, com linhas, desconto, pagamento, totais recalculados e indicador de mesa disponível, para redesenhar imediatamente a confirmação."
        }
      }
    ]
  }
} as const;

export default definition;
