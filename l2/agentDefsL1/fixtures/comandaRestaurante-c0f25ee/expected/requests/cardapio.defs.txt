/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/cardapio.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "cardapio",
  "moduleName": "comandaRestaurante",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/createItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/getItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/listItemCardapio.defs.ts",
    "_102047_/l1/comandaRestaurante/layer_2_application/usecases/updateItemCardapio.defs.ts"
  ],
  "data": {
    "pageId": "cardapio",
    "requests": [
      {
        "route": "comandaRestaurante.cardapio.carregarItensCardapio",
        "kind": "qry",
        "uses": [
          "listItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "pagina",
            "entity": "ItemCardapio",
            "items": "items",
            "page": "pagina.page",
            "pageSize": "pagina.pageSize",
            "hasMore": "pagina.hasMore",
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
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pagina",
            "pages": "pagina"
          },
          {
            "name": "pageSize",
            "target": "pagina",
            "pages": "pagina"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a primeira página do catálogo ao abrir a página para o caixa conferir os itens disponíveis e selecionar um para manutenção.\nEntrada: page informa a página solicitada, assumindo a primeira quando omitida; pageSize limita quantos itens cabem na faixa exibida.\nProcessamento: Lista ItemCardapio em ordem de nome e identificador como desempate estável, aplica a paginação solicitada e compõe id, name e details.precoVigente. Calcula hasMore pela existência de itens depois da página retornada. Nenhuma regra de lançamento ou totalização de comanda se aplica.\nSaída: Retorna a página já no formato da lista, com itens, página, tamanho da página e indicação de resultados adicionais.",
          "purpose": "Carrega a primeira página do catálogo ao abrir a página para o caixa conferir os itens disponíveis e selecionar um para manutenção.",
          "input": "page informa a página solicitada, assumindo a primeira quando omitida; pageSize limita quantos itens cabem na faixa exibida.",
          "processing": "Lista ItemCardapio em ordem de nome e identificador como desempate estável, aplica a paginação solicitada e compõe id, name e details.precoVigente. Calcula hasMore pela existência de itens depois da página retornada. Nenhuma regra de lançamento ou totalização de comanda se aplica.",
          "output": "Retorna a página já no formato da lista, com itens, página, tamanho da página e indicação de resultados adicionais."
        }
      },
      {
        "route": "comandaRestaurante.cardapio.carregarMaisItensCardapio",
        "kind": "qry",
        "uses": [
          "listItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "pagina",
            "entity": "ItemCardapio",
            "items": "items",
            "page": "pagina.page",
            "pageSize": "pagina.pageSize",
            "hasMore": "pagina.hasMore",
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
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pagina",
            "pages": "pagina"
          },
          {
            "name": "pageSize",
            "target": "pagina",
            "pages": "pagina"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Busca a próxima página do catálogo quando o caixa continua a leitura, sem transferir todos os itens cadastrados.\nEntrada: page identifica a próxima página a carregar; pageSize informa a quantidade de itens de cada página.\nProcessamento: Lista a página solicitada de ItemCardapio usando a mesma ordenação estável por nome e identificador, projeta id, name e details.precoVigente e calcula hasMore. Nenhuma regra de lançamento ou totalização de comanda se aplica.\nSaída: Retorna somente a página solicitada para que seus itens sejam anexados ao catálogo já exibido.",
          "purpose": "Busca a próxima página do catálogo quando o caixa continua a leitura, sem transferir todos os itens cadastrados.",
          "input": "page identifica a próxima página a carregar; pageSize informa a quantidade de itens de cada página.",
          "processing": "Lista a página solicitada de ItemCardapio usando a mesma ordenação estável por nome e identificador, projeta id, name e details.precoVigente e calcula hasMore. Nenhuma regra de lançamento ou totalização de comanda se aplica.",
          "output": "Retorna somente a página solicitada para que seus itens sejam anexados ao catálogo já exibido."
        }
      },
      {
        "route": "comandaRestaurante.cardapio.obterItemCardapio",
        "kind": "qry",
        "uses": [
          "getItemCardapio"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "item",
            "entity": "ItemCardapio",
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
                "field": "name",
                "path": "name"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "item",
            "field": "id"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Obtém o item escolhido no catálogo para preencher o formulário de manutenção.\nEntrada: id é o identificador do ItemCardapio selecionado pelo caixa.\nProcessamento: Consulta o item pelo identificador e compõe id, version, name e details.precoVigente para edição autorizada. A version é retornada para controle de concorrência. Nenhuma regra de lançamento ou totalização de comanda se aplica.\nSaída: Retorna o item selecionado no formato que o formulário usa para mostrar e alterar os dados persistidos.",
          "purpose": "Obtém o item escolhido no catálogo para preencher o formulário de manutenção.",
          "input": "id é o identificador do ItemCardapio selecionado pelo caixa.",
          "processing": "Consulta o item pelo identificador e compõe id, version, name e details.precoVigente para edição autorizada. A version é retornada para controle de concorrência. Nenhuma regra de lançamento ou totalização de comanda se aplica.",
          "output": "Retorna o item selecionado no formato que o formulário usa para mostrar e alterar os dados persistidos."
        }
      },
      {
        "route": "comandaRestaurante.cardapio.cadastrarItemCardapio",
        "kind": "cmd",
        "uses": [
          "createItemCardapio"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "item",
            "entity": "ItemCardapio",
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
                "field": "name",
                "path": "name"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Cadastra um item com nome e preço vigente para uso operacional no cardápio.\nEntrada: name é o nome pelo qual a equipe localiza o item; details.precoVigente é o preço atualmente cobrado.\nProcessamento: Cria ItemCardapio com o nome e o preço vigente recebidos e compõe o registro persistido, incluindo id e version gerados. Não cria ItemComanda, nem registra preço de lançamento ou executa regras de subtotal, total ou valor de item.\nSaída: Retorna o item criado e persistido para redesenhar imediatamente o formulário; o catálogo é recarregado para refletir a inclusão.",
          "purpose": "Cadastra um item com nome e preço vigente para uso operacional no cardápio.",
          "input": "name é o nome pelo qual a equipe localiza o item; details.precoVigente é o preço atualmente cobrado.",
          "processing": "Cria ItemCardapio com o nome e o preço vigente recebidos e compõe o registro persistido, incluindo id e version gerados. Não cria ItemComanda, nem registra preço de lançamento ou executa regras de subtotal, total ou valor de item.",
          "output": "Retorna o item criado e persistido para redesenhar imediatamente o formulário; o catálogo é recarregado para refletir a inclusão."
        }
      },
      {
        "route": "comandaRestaurante.cardapio.atualizarItemCardapio",
        "kind": "cmd",
        "uses": [
          "updateItemCardapio"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "item",
            "entity": "ItemCardapio",
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
                "field": "name",
                "path": "name"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Atualiza o nome e o preço vigente do item selecionado para manter o catálogo usado pela operação.\nEntrada: id e version identificam a versão persistida a alterar; name e details.precoVigente são os valores informados pelo caixa.\nProcessamento: Atualiza o ItemCardapio por id somente se a version recebida corresponder à versão atual, recusando sobrescrita concorrente, e compõe a nova versão persistida. Não altera ItemComanda já lançado nem aplica regras de preço de lançamento, subtotal, total ou valor de ItemComanda.\nSaída: Retorna o registro atualizado, incluindo a nova version, para redesenhar o formulário sem nova consulta; o catálogo é recarregado para refletir a alteração.",
          "purpose": "Atualiza o nome e o preço vigente do item selecionado para manter o catálogo usado pela operação.",
          "input": "id e version identificam a versão persistida a alterar; name e details.precoVigente são os valores informados pelo caixa.",
          "processing": "Atualiza o ItemCardapio por id somente se a version recebida corresponder à versão atual, recusando sobrescrita concorrente, e compõe a nova versão persistida. Não altera ItemComanda já lançado nem aplica regras de preço de lançamento, subtotal, total ou valor de ItemComanda.",
          "output": "Retorna o registro atualizado, incluindo a nova version, para redesenhar o formulário sem nova consulta; o catálogo é recarregado para refletir a alteração."
        }
      }
    ]
  }
} as const;

export default definition;
