/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/painel_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "painel_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts"
  ],
  "data": {
    "pageId": "painel_tarefas",
    "requests": [
      {
        "route": "tarefas.painel_tarefas.carregarPainelTarefas",
        "kind": "qry",
        "uses": [
          "listListaTarefas",
          "listTarefa"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "listas",
            "entity": "ListaTarefas",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "nome",
                "path": "nome"
              },
              {
                "field": "details.quantidadeTarefasAbertas",
                "path": "details.quantidadeTarefasAbertas"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "listas.itensChecklistConcluidos",
            "entity": "ListaTarefas",
            "rules": [
              "tarefaAbertaVencimento",
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma"
            ]
          },
          {
            "kind": "computed",
            "path": "listas.itensChecklistTotal",
            "entity": "ListaTarefas",
            "rules": [
              "tarefaAbertaVencimento",
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma"
            ]
          },
          {
            "kind": "related",
            "path": "listas.tarefas",
            "entity": "Tarefa",
            "relationship": "tarefaLista",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              },
              {
                "field": "listaId",
                "path": "listaId"
              },
              {
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "indicadores",
            "rules": [
              "tarefaAbertaVencimento"
            ]
          }
        ],
        "params": [],
        "rules": [
          "tarefaAbertaVencimento",
          "membroVeResponsavelOuCriador",
          "gestorPorAcessoPlataforma"
        ],
        "doc": {
          "raw": "Finalidade: Carrega, numa única chamada, o painel do gestor: os quatro indicadores gerais das tarefas da organização e o resumo das tarefas abertas por lista com o progresso das checklists.\nEntrada: Nenhuma entrada; o gestor é identificado pela sessão.\nProcessamento: Verifica que a pessoa da sessão é gestor pelo acesso da plataforma (gestorPorAcessoPlataforma) e considera todas as tarefas da organização, sem o filtro de membro (membroVeResponsavelOuCriador: o gestor vê todas). Conta no servidor, com tarefaAbertaVencimento: abertas (situação diferente de concluida e cancelada), que vencem hoje (abertas com prazo igual à data de hoje), atrasadas (abertas com prazo anterior a hoje) e devolvidas pendentes (em andamento, devolvidas e ainda não retomadas após a última devolução). Para cada lista, ordenada pelo nome, calcula a quantidade de tarefas abertas, conta os itens de checklist totais e concluídos das tarefas abertas da lista e traz as tarefas abertas que têm checklist com o progresso calculado (itens marcados de total). Todos esses valores são derivados e calculados na consulta, nunca gravados.\nSaída: indicadores com as quatro contagens já calculadas; listas com cada lista de tarefas, seu nome, quantidade de tarefas abertas, totais de itens de checklist concluídos e existentes e as tarefas abertas com título e progresso da checklist.",
          "purpose": "Carrega, numa única chamada, o painel do gestor: os quatro indicadores gerais das tarefas da organização e o resumo das tarefas abertas por lista com o progresso das checklists.",
          "input": "Nenhuma entrada; o gestor é identificado pela sessão.",
          "processing": "Verifica que a pessoa da sessão é gestor pelo acesso da plataforma (gestorPorAcessoPlataforma) e considera todas as tarefas da organização, sem o filtro de membro (membroVeResponsavelOuCriador: o gestor vê todas). Conta no servidor, com tarefaAbertaVencimento: abertas (situação diferente de concluida e cancelada), que vencem hoje (abertas com prazo igual à data de hoje), atrasadas (abertas com prazo anterior a hoje) e devolvidas pendentes (em andamento, devolvidas e ainda não retomadas após a última devolução). Para cada lista, ordenada pelo nome, calcula a quantidade de tarefas abertas, conta os itens de checklist totais e concluídos das tarefas abertas da lista e traz as tarefas abertas que têm checklist com o progresso calculado (itens marcados de total). Todos esses valores são derivados e calculados na consulta, nunca gravados.",
          "output": "indicadores com as quatro contagens já calculadas; listas com cada lista de tarefas, seu nome, quantidade de tarefas abertas, totais de itens de checklist concluídos e existentes e as tarefas abertas com título e progresso da checklist."
        }
      }
    ]
  }
} as const;

export default definition;
