/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/atendimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "atendimento",
  "moduleName": "comandaRestaurante",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/cancelarItemComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/createComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/createItemComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getMesa.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listItemComanda.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listMesa.defs.ts"
  ],
  "data": {
    "pageId": "atendimento",
    "requests": [
      {
        "route": "comandaRestaurante.atendimento.carregarAtendimento",
        "kind": "qry",
        "uses": [
          "listMesa",
          "listComanda",
          "getMesa",
          "listItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "contextoAtendimento.mesasDisponiveis",
            "entity": "Mesa",
            "items": "items",
            "page": "contextoAtendimento.mesasDisponiveis.page",
            "pageSize": "contextoAtendimento.mesasDisponiveis.pageSize",
            "hasMore": "contextoAtendimento.mesasDisponiveis.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              },
              {
                "field": "details.disponivel",
                "path": "details.disponivel"
              }
            ]
          },
          {
            "kind": "list",
            "path": "contextoAtendimento.comandasAbertas",
            "entity": "Comanda",
            "items": "items",
            "page": "contextoAtendimento.comandasAbertas.page",
            "pageSize": "contextoAtendimento.comandasAbertas.pageSize",
            "hasMore": "contextoAtendimento.comandasAbertas.hasMore",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "contextoAtendimento.comandasAbertas.items.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "list",
            "path": "contextoAtendimento.itensCardapio",
            "entity": "ItemCardapio",
            "items": "items",
            "page": "contextoAtendimento.itensCardapio.page",
            "pageSize": "contextoAtendimento.itensCardapio.pageSize",
            "hasMore": "contextoAtendimento.itensCardapio.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              },
              {
                "field": "details.precoVigente",
                "path": "details.precoVigente"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega de uma vez o contexto inicial para o garçom localizar uma mesa disponível, uma comanda aberta ou um item do cardápio.\nEntrada: Os pares mesasPage e mesasPageSize, comandasPage e comandasPageSize, itensPage e itensPageSize definem opcionalmente o trecho inicial de cada lista; na ausência deles, aplica os tamanhos padrão da página.\nProcessamento: Consulta somente mesas com disponibilidade calculada verdadeira, somente comandas em situação open e itens do cardápio ordenados por nome. Cada coleção é ordenada e paginada de forma independente, retornando hasMore sem transferir itens fora da tela. Não altera registros.\nSaída: Retorna as três coleções já filtradas e no formato de localização, para abastecer a busca e a escolha inicial do contexto de atendimento.",
          "purpose": "Carrega de uma vez o contexto inicial para o garçom localizar uma mesa disponível, uma comanda aberta ou um item do cardápio.",
          "input": "Os pares mesasPage e mesasPageSize, comandasPage e comandasPageSize, itensPage e itensPageSize definem opcionalmente o trecho inicial de cada lista; na ausência deles, aplica os tamanhos padrão da página.",
          "processing": "Consulta somente mesas com disponibilidade calculada verdadeira, somente comandas em situação open e itens do cardápio ordenados por nome. Cada coleção é ordenada e paginada de forma independente, retornando hasMore sem transferir itens fora da tela. Não altera registros.",
          "output": "Retorna as três coleções já filtradas e no formato de localização, para abastecer a busca e a escolha inicial do contexto de atendimento."
        }
      },
      {
        "route": "comandaRestaurante.atendimento.atualizarLocalizacaoAtendimento",
        "kind": "qry",
        "uses": [
          "listMesa",
          "listComanda",
          "getMesa",
          "listItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "contextoAtendimento.mesasDisponiveis",
            "entity": "Mesa",
            "items": "items",
            "page": "contextoAtendimento.mesasDisponiveis.page",
            "pageSize": "contextoAtendimento.mesasDisponiveis.pageSize",
            "hasMore": "contextoAtendimento.mesasDisponiveis.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              },
              {
                "field": "details.disponivel",
                "path": "details.disponivel"
              }
            ]
          },
          {
            "kind": "list",
            "path": "contextoAtendimento.comandasAbertas",
            "entity": "Comanda",
            "items": "items",
            "page": "contextoAtendimento.comandasAbertas.page",
            "pageSize": "contextoAtendimento.comandasAbertas.pageSize",
            "hasMore": "contextoAtendimento.comandasAbertas.hasMore",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "contextoAtendimento.comandasAbertas.items.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "list",
            "path": "contextoAtendimento.itensCardapio",
            "entity": "ItemCardapio",
            "items": "items",
            "page": "contextoAtendimento.itensCardapio.page",
            "pageSize": "contextoAtendimento.itensCardapio.pageSize",
            "hasMore": "contextoAtendimento.itensCardapio.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              },
              {
                "field": "details.precoVigente",
                "path": "details.precoVigente"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Atualiza a localização do atendimento quando o garçom pesquisa ou navega nas listas de mesa, comanda e cardápio.\nEntrada: mesaTermo filtra o código de mesas disponíveis; comandaNumero restringe uma comanda aberta pelo número; itemTermo pesquisa um trecho do nome do item. Cada par de página define o trecho da respectiva lista.\nProcessamento: Mantém os filtros próprios do atendimento: mesa disponível e comanda open. Aplica os termos informados, ordena cada resultado, calcula hasMore para a página solicitada e não grava dados.\nSaída: Retorna o contexto de localização substituto, com as listas filtradas e paginadas que a página deve redesenhar.",
          "purpose": "Atualiza a localização do atendimento quando o garçom pesquisa ou navega nas listas de mesa, comanda e cardápio.",
          "input": "mesaTermo filtra o código de mesas disponíveis; comandaNumero restringe uma comanda aberta pelo número; itemTermo pesquisa um trecho do nome do item. Cada par de página define o trecho da respectiva lista.",
          "processing": "Mantém os filtros próprios do atendimento: mesa disponível e comanda open. Aplica os termos informados, ordena cada resultado, calcula hasMore para a página solicitada e não grava dados.",
          "output": "Retorna o contexto de localização substituto, com as listas filtradas e paginadas que a página deve redesenhar."
        }
      },
      {
        "route": "comandaRestaurante.atendimento.obterComandaAtendimento",
        "kind": "qry",
        "uses": [
          "getComanda",
          "getMesa",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.subtotal",
                "path": "details.subtotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
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
                "field": "comandaId",
                "path": "comandaId"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "subtotalComandaCalculado",
          "valorTotalItemComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Carrega a comanda escolhida com a mesa, todas as linhas e o subtotal necessários para conferir e operar o atendimento.\nEntrada: comandaId é o identificador da comanda selecionada pelo garçom na localização.\nProcessamento: Lê a comanda, a mesa vinculada e todas as linhas, inclusive canceladas, com o nome do item de cardápio. Calcula valorTotal de cada linha conforme valorTotalItemComandaCalculado e subtotal apenas com linhas não canceladas conforme subtotalComandaCalculado; esses valores derivados não são gravados por esta consulta.\nSaída: Retorna a comanda completa para redesenhar a conferência, identificar a comanda ativa no formulário e disponibilizar a linha selecionada para cancelamento.",
          "purpose": "Carrega a comanda escolhida com a mesa, todas as linhas e o subtotal necessários para conferir e operar o atendimento.",
          "input": "comandaId é o identificador da comanda selecionada pelo garçom na localização.",
          "processing": "Lê a comanda, a mesa vinculada e todas as linhas, inclusive canceladas, com o nome do item de cardápio. Calcula valorTotal de cada linha conforme valorTotalItemComandaCalculado e subtotal apenas com linhas não canceladas conforme subtotalComandaCalculado; esses valores derivados não são gravados por esta consulta.",
          "output": "Retorna a comanda completa para redesenhar a conferência, identificar a comanda ativa no formulário e disponibilizar a linha selecionada para cancelamento."
        }
      },
      {
        "route": "comandaRestaurante.atendimento.abrirComanda",
        "kind": "cmd",
        "uses": [
          "createComanda",
          "getMesa",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.subtotal",
                "path": "details.subtotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
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
                "field": "comandaId",
                "path": "comandaId"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "mesaDisponivelParaAbrirComanda",
          "umaComandaAbertaPorMesa",
          "subtotalComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Abre a comanda da mesa disponível escolhida e devolve o atendimento pronto para registrar pedidos.\nEntrada: mesaId preenche o vínculo obrigatório da nova comanda com a mesa selecionada.\nProcessamento: Em transação, verifica que a mesa está disponível conforme mesaDisponivelParaAbrirComanda e recusa outra comanda open para a mesma mesa conforme umaComandaAbertaPorMesa. Gera o número sequencial, cria a comanda em situação open e calcula o subtotal vazio conforme subtotalComandaCalculado.\nSaída: Retorna a nova comanda com mesa, número, situação, linhas vazias e subtotal, permitindo redesenhar a conferência imediatamente.",
          "purpose": "Abre a comanda da mesa disponível escolhida e devolve o atendimento pronto para registrar pedidos.",
          "input": "mesaId preenche o vínculo obrigatório da nova comanda com a mesa selecionada.",
          "processing": "Em transação, verifica que a mesa está disponível conforme mesaDisponivelParaAbrirComanda e recusa outra comanda open para a mesma mesa conforme umaComandaAbertaPorMesa. Gera o número sequencial, cria a comanda em situação open e calcula o subtotal vazio conforme subtotalComandaCalculado.",
          "output": "Retorna a nova comanda com mesa, número, situação, linhas vazias e subtotal, permitindo redesenhar a conferência imediatamente."
        }
      },
      {
        "route": "comandaRestaurante.atendimento.lancarItem",
        "kind": "cmd",
        "uses": [
          "createItemComanda",
          "getComanda",
          "getMesa",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.subtotal",
                "path": "details.subtotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
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
                "field": "comandaId",
                "path": "comandaId"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "itensSomenteEmComandaAberta",
          "precoUnitarioRegistradoNoLancamento",
          "valorTotalItemComandaCalculado",
          "subtotalComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Inclui o pedido informado na comanda aberta e devolve a conferência integral já atualizada.\nEntrada: comandaId vincula a nova linha à comanda; itemCardapioId identifica o item escolhido; quantidade registra o volume pedido; observacao registra a orientação opcional de preparo.\nProcessamento: Recusa o lançamento em comanda diferente de open conforme itensSomenteEmComandaAberta. Obtém o preço vigente e o registra na linha conforme precoUnitarioRegistradoNoLancamento, calcula valorTotal conforme valorTotalItemComandaCalculado e recalcula o subtotal da comanda conforme subtotalComandaCalculado.\nSaída: Retorna a comanda com a nova linha, nome do item, preço registrado, valor calculado e subtotal atualizado, sem exigir nova consulta.",
          "purpose": "Inclui o pedido informado na comanda aberta e devolve a conferência integral já atualizada.",
          "input": "comandaId vincula a nova linha à comanda; itemCardapioId identifica o item escolhido; quantidade registra o volume pedido; observacao registra a orientação opcional de preparo.",
          "processing": "Recusa o lançamento em comanda diferente de open conforme itensSomenteEmComandaAberta. Obtém o preço vigente e o registra na linha conforme precoUnitarioRegistradoNoLancamento, calcula valorTotal conforme valorTotalItemComandaCalculado e recalcula o subtotal da comanda conforme subtotalComandaCalculado.",
          "output": "Retorna a comanda com a nova linha, nome do item, preço registrado, valor calculado e subtotal atualizado, sem exigir nova consulta."
        }
      },
      {
        "route": "comandaRestaurante.atendimento.cancelarItem",
        "kind": "cmd",
        "uses": [
          "cancelarItemComanda",
          "getComanda",
          "getMesa",
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
                "field": "mesaId",
                "path": "mesaId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.subtotal",
                "path": "details.subtotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.mesa",
            "entity": "Mesa",
            "relationship": "comandaMesa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "code",
                "path": "code"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens",
            "entity": "ItemComanda",
            "relationship": "itemComandaComanda",
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
                "field": "comandaId",
                "path": "comandaId"
              },
              {
                "field": "itemCardapioId",
                "path": "itemCardapioId"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.quantidade",
                "path": "details.quantidade"
              },
              {
                "field": "details.observacao",
                "path": "details.observacao"
              },
              {
                "field": "details.precoUnitario",
                "path": "details.precoUnitario"
              },
              {
                "field": "details.valorTotal",
                "path": "details.valorTotal"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comanda.itens.itemCardapio",
            "entity": "ItemCardapio",
            "relationship": "itemComandaItemCardapio",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "name",
                "path": "name"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "itemComandaOperacaoSomenteComandaAberta",
          "valorTotalItemComandaCalculado",
          "subtotalComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Cancela a linha escolhida por engano e devolve a comanda com a cobrança recalculada.\nEntrada: id identifica o item da comanda a transicionar e version protege a operação contra alteração concorrente.\nProcessamento: Executa cancelarItemComanda somente para uma linha launched cuja comanda está open, conforme itemComandaOperacaoSomenteComandaAberta. Mantém a linha no histórico como canceled, calcula seu valor conforme valorTotalItemComandaCalculado e recalcula o subtotal desconsiderando-a conforme subtotalComandaCalculado.\nSaída: Retorna a comanda completa com a linha marcada como canceled e o subtotal atualizado para conferência imediata.",
          "purpose": "Cancela a linha escolhida por engano e devolve a comanda com a cobrança recalculada.",
          "input": "id identifica o item da comanda a transicionar e version protege a operação contra alteração concorrente.",
          "processing": "Executa cancelarItemComanda somente para uma linha launched cuja comanda está open, conforme itemComandaOperacaoSomenteComandaAberta. Mantém a linha no histórico como canceled, calcula seu valor conforme valorTotalItemComandaCalculado e recalcula o subtotal desconsiderando-a conforme subtotalComandaCalculado.",
          "output": "Retorna a comanda completa com a linha marcada como canceled e o subtotal atualizado para conferência imediata."
        }
      }
    ]
  }
} as const;

export default definition;
