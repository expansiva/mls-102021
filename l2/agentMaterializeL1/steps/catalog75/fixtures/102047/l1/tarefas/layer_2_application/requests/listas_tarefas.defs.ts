/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/listas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "listas_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/createListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateListaTarefas.defs.ts"
  ],
  "data": {
    "pageId": "listas_tarefas",
    "requests": [
      {
        "route": "tarefas.listas_tarefas.qryListasTarefas",
        "kind": "qry",
        "uses": [
          "listListaTarefas"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "listas",
            "entity": "ListaTarefas",
            "items": "items",
            "page": "listas.page",
            "pageSize": "listas.pageSize",
            "hasMore": "listas.hasMore",
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
                "field": "nome",
                "path": "nome"
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
            "target": "listas",
            "pages": "listas"
          },
          {
            "name": "pageSize",
            "target": "listas",
            "pages": "listas"
          },
          {
            "name": "texto",
            "target": "listas",
            "field": "nome",
            "optional": true
          }
        ],
        "rules": [
          "somenteGestorMantemListas",
          "tarefaAbertaVencimento"
        ],
        "doc": {
          "raw": "Finalidade: Carrega as listas de tarefas cadastradas na organização, ordenadas pelo nome, com busca pelo nome e a quantidade de tarefas abertas de cada uma.\nEntrada: texto: trecho opcional digitado na busca, comparado ao nome da lista; page e pageSize: página pedida e tamanho da página.\nProcessamento: Acessível apenas ao gestor (somenteGestorMantemListas). Filtra as listas cujo nome contém o texto, quando informado, e ordena pelo nome. Para cada lista calcula quantidadeTarefasAbertas contando as tarefas com listaId da lista que estão abertas, isto é, nem concluídas nem canceladas (tarefaAbertaVencimento); o valor é derivado, nunca gravado.\nSaída: Página { items, page, pageSize, hasMore } de listas com id, version, nome, descrição e quantidade de tarefas abertas.",
          "purpose": "Carrega as listas de tarefas cadastradas na organização, ordenadas pelo nome, com busca pelo nome e a quantidade de tarefas abertas de cada uma.",
          "input": "texto: trecho opcional digitado na busca, comparado ao nome da lista; page e pageSize: página pedida e tamanho da página.",
          "processing": "Acessível apenas ao gestor (somenteGestorMantemListas). Filtra as listas cujo nome contém o texto, quando informado, e ordena pelo nome. Para cada lista calcula quantidadeTarefasAbertas contando as tarefas com listaId da lista que estão abertas, isto é, nem concluídas nem canceladas (tarefaAbertaVencimento); o valor é derivado, nunca gravado.",
          "output": "Página { items, page, pageSize, hasMore } de listas com id, version, nome, descrição e quantidade de tarefas abertas."
        }
      },
      {
        "route": "tarefas.listas_tarefas.cmdCriarLista",
        "kind": "cmd",
        "uses": [
          "createListaTarefas"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "lista",
            "entity": "ListaTarefas",
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
                "field": "nome",
                "path": "nome"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "nomeListaUnico",
          "somenteGestorMantemListas"
        ],
        "doc": {
          "raw": "Finalidade: Cria uma nova lista de tarefas com o nome e a descrição informados pelo gestor.\nEntrada: nome: nome obrigatório da lista; details.descricao: texto livre opcional sobre o projeto ou a área.\nProcessamento: Recusa quem não é gestor (somenteGestorMantemListas). Exige nome preenchido e recusa nome igual ao de outra lista, informando que o nome já existe (nomeListaUnico, garantido pelo índice único). Grava a lista; quantidadeTarefasAbertas é calculada (zero para lista nova).\nSaída: A lista criada, com id, version inicial, nome, descrição e quantidade de tarefas abertas.",
          "purpose": "Cria uma nova lista de tarefas com o nome e a descrição informados pelo gestor.",
          "input": "nome: nome obrigatório da lista; details.descricao: texto livre opcional sobre o projeto ou a área.",
          "processing": "Recusa quem não é gestor (somenteGestorMantemListas). Exige nome preenchido e recusa nome igual ao de outra lista, informando que o nome já existe (nomeListaUnico, garantido pelo índice único). Grava a lista; quantidadeTarefasAbertas é calculada (zero para lista nova).",
          "output": "A lista criada, com id, version inicial, nome, descrição e quantidade de tarefas abertas."
        }
      },
      {
        "route": "tarefas.listas_tarefas.cmdSalvarLista",
        "kind": "cmd",
        "uses": [
          "updateListaTarefas"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "lista",
            "entity": "ListaTarefas",
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
                "field": "nome",
                "path": "nome"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "nomeListaUnico",
          "somenteGestorMantemListas"
        ],
        "doc": {
          "raw": "Finalidade: Altera o nome e a descrição de uma lista de tarefas existente.\nEntrada: id: lista alterada; version: versão lida, para controle de concorrência; nome: novo nome obrigatório; details.descricao: nova descrição opcional.\nProcessamento: Recusa quem não é gestor (somenteGestorMantemListas). Recusa versão desatualizada. Exige nome preenchido e recusa nome igual ao de outra lista (nomeListaUnico). Grava nome e descrição; quantidadeTarefasAbertas é recalculada a partir das tarefas abertas da lista, nunca gravada.\nSaída: A lista alterada no novo estado, com id, nova version, nome, descrição e quantidade de tarefas abertas.",
          "purpose": "Altera o nome e a descrição de uma lista de tarefas existente.",
          "input": "id: lista alterada; version: versão lida, para controle de concorrência; nome: novo nome obrigatório; details.descricao: nova descrição opcional.",
          "processing": "Recusa quem não é gestor (somenteGestorMantemListas). Recusa versão desatualizada. Exige nome preenchido e recusa nome igual ao de outra lista (nomeListaUnico). Grava nome e descrição; quantidadeTarefasAbertas é recalculada a partir das tarefas abertas da lista, nunca gravada.",
          "output": "A lista alterada no novo estado, com id, nova version, nome, descrição e quantidade de tarefas abertas."
        }
      }
    ]
  }
} as const;

export default definition;
