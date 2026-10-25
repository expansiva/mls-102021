/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "tarefas_equipe",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/cancelar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.defs.ts"
  ],
  "data": {
    "pageId": "tarefas_equipe",
    "requests": [
      {
        "route": "tarefas.tarefas_equipe.carregarFiltrosEquipe",
        "kind": "qry",
        "uses": [
          "listListaTarefas",
          "listParticipante"
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
              }
            ]
          },
          {
            "kind": "list",
            "path": "participantes",
            "entity": "Participante",
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
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.tarefas.aceitaTarefasEfetivo",
                "path": "details.tarefas.aceitaTarefasEfetivo"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "participanteNaoConfiguradoAceitaECria"
        ],
        "doc": {
          "raw": "Finalidade: Carrega as opções dos filtros de lista e de responsável da visão de tarefas da equipe.\nEntrada: Nenhuma entrada; o gestor é identificado pela sessão.\nProcessamento: Lê as listas de tarefas ordenadas pelo nome e os participantes do módulo pelo papel tarefas.Participante, ordenados pelo nome. aceitaTarefasEfetivo é calculado (participanteNaoConfiguradoAceitaECria: sem configuração vale sim), nunca gravado.\nSaída: As listas de tarefas (id e nome) e os participantes (id, nome, situação na plataforma e se aceita tarefas).",
          "purpose": "Carrega as opções dos filtros de lista e de responsável da visão de tarefas da equipe.",
          "input": "Nenhuma entrada; o gestor é identificado pela sessão.",
          "processing": "Lê as listas de tarefas ordenadas pelo nome e os participantes do módulo pelo papel tarefas.Participante, ordenados pelo nome. aceitaTarefasEfetivo é calculado (participanteNaoConfiguradoAceitaECria: sem configuração vale sim), nunca gravado.",
          "output": "As listas de tarefas (id e nome) e os participantes (id, nome, situação na plataforma e se aceita tarefas)."
        }
      },
      {
        "route": "tarefas.tarefas_equipe.listarTarefasEquipe",
        "kind": "qry",
        "uses": [
          "listTarefa"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "tarefas",
            "entity": "Tarefa",
            "items": "items",
            "page": "tarefas.page",
            "pageSize": "tarefas.pageSize",
            "hasMore": "tarefas.hasMore",
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
                "field": "titulo",
                "path": "titulo"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "listaId",
                "path": "listaId"
              },
              {
                "field": "responsavelId",
                "path": "responsavelId"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.venceHoje",
                "path": "details.venceHoje"
              },
              {
                "field": "details.atrasada",
                "path": "details.atrasada"
              },
              {
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefas.items.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefas.items.listaTarefas.nome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefas.items.participante.details.identification.name",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento"
            ]
          },
          {
            "kind": "list",
            "path": "contagemPorSituacao",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "contagemPorSituacao.quantidade",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "gestorPorAcessoPlataforma",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento"
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefas.listaTarefas.nome",
            "reason": "Interface TarefaResumo: field listaTarefas.nome is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "tarefas.participante.details.identification.name",
            "reason": "Interface TarefaResumo: field participante.details.identification.name is not a field of any entity."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "tarefas",
            "pages": "tarefas"
          },
          {
            "name": "pageSize",
            "target": "tarefas",
            "pages": "tarefas"
          },
          {
            "name": "listaId",
            "target": "tarefas",
            "field": "listaId",
            "optional": true
          },
          {
            "name": "responsavelId",
            "target": "tarefas",
            "field": "responsavelId",
            "optional": true
          },
          {
            "name": "prioridade",
            "target": "tarefas",
            "field": "prioridade",
            "optional": true
          },
          {
            "name": "status",
            "target": "tarefas",
            "field": "status",
            "optional": true
          },
          {
            "name": "prazoDe",
            "target": "",
            "optional": true
          },
          {
            "name": "prazoAte",
            "target": "",
            "optional": true
          }
        ],
        "rules": [
          "membroVeResponsavelOuCriador",
          "gestorPorAcessoPlataforma",
          "quemAgeAgoraPorSituacao",
          "tarefaAbertaVencimento"
        ],
        "doc": {
          "raw": "Finalidade: Lista todas as tarefas da organização com os filtros do gestor, servindo tanto a visão em lista quanto o quadro por situação.\nEntrada: listaId, responsavelId, prioridade e status: filtros opcionais por igualdade; prazoDe e prazoAte: intervalo opcional de prazo; page e pageSize: página pedida.\nProcessamento: Executa ao abrir a página (sem filtros) e a cada mudança de filtro ou página. O gestor, definido pelo acesso da plataforma (gestorPorAcessoPlataforma), vê todas as tarefas (membroVeResponsavelOuCriador). Ordena por criadaEm decrescente. Junta o nome da lista e os nomes do responsável e de quem age agora. Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), venceHoje e atrasada (tarefaAbertaVencimento) e progressoChecklist contando itens marcados sobre o total; nada disso é gravado. Conta as tarefas por situação sob os mesmos filtros, sem paginação.\nSaída: A página de tarefas resumidas { items, page, pageSize, hasMore } e a quantidade de tarefas em cada situação para os mesmos filtros.",
          "purpose": "Lista todas as tarefas da organização com os filtros do gestor, servindo tanto a visão em lista quanto o quadro por situação.",
          "input": "listaId, responsavelId, prioridade e status: filtros opcionais por igualdade; prazoDe e prazoAte: intervalo opcional de prazo; page e pageSize: página pedida.",
          "processing": "Executa ao abrir a página (sem filtros) e a cada mudança de filtro ou página. O gestor, definido pelo acesso da plataforma (gestorPorAcessoPlataforma), vê todas as tarefas (membroVeResponsavelOuCriador). Ordena por criadaEm decrescente. Junta o nome da lista e os nomes do responsável e de quem age agora. Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), venceHoje e atrasada (tarefaAbertaVencimento) e progressoChecklist contando itens marcados sobre o total; nada disso é gravado. Conta as tarefas por situação sob os mesmos filtros, sem paginação.",
          "output": "A página de tarefas resumidas { items, page, pageSize, hasMore } e a quantidade de tarefas em cada situação para os mesmos filtros."
        }
      },
      {
        "route": "tarefas.tarefas_equipe.obterTarefaEquipe",
        "kind": "qry",
        "uses": [
          "listTarefa",
          "listItemChecklist"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "tarefa",
            "entity": "Tarefa",
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
                "field": "titulo",
                "path": "titulo"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "listaId",
                "path": "listaId"
              },
              {
                "field": "responsavelId",
                "path": "responsavelId"
              },
              {
                "field": "criadorId",
                "path": "criadorId"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "details.quantidadeSubtarefas",
                "path": "details.quantidadeSubtarefas"
              },
              {
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.criadorNome",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.listaTarefas.nome",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.participante.details.identification.name",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.checklist",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "ordem",
                "path": "ordem"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.concluido",
                "path": "details.concluido"
              },
              {
                "field": "details.concluidoEm",
                "path": "details.concluidoEm"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.historico",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.momento",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.listaTarefas.nome",
            "reason": "Interface TarefaDetalhe: field listaTarefas.nome is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.participante.details.identification.name",
            "reason": "Interface TarefaDetalhe: field participante.details.identification.name is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "quemAgeAgoraPorSituacao",
          "tarefaAbertaVencimento",
          "moduloNaoGuardaComentarios"
        ],
        "doc": {
          "raw": "Finalidade: Abre uma tarefa da organização com tudo que o gestor confere antes de agir: responsável, prazo, checklist, subtarefas e histórico.\nEntrada: tarefaId: id da tarefa escolhida na lista ou no quadro.\nProcessamento: Lê a tarefa pelo id, junta o nome da lista e os nomes do responsável, de quem criou e de quem age agora. Lista os itens da checklist pela tarefa em ordem. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta (tarefaAbertaVencimento), quantidadeSubtarefas contando as tarefas que apontam esta como pai e progressoChecklist; nada disso é gravado. Monta o histórico em ordem de tempo a partir de criadaEm, devolvidaEm com motivo, retomadaEm, concluidaEm, canceladaEm e dos eventos de mudança de situação e reatribuição da ocorrência do processo de tarefa da plataforma. Comentários e anexos não vêm daqui (moduloNaoGuardaComentarios).\nSaída: A tarefa no estado atual, com sua checklist ordenada e o histórico de eventos em ordem de tempo.",
          "purpose": "Abre uma tarefa da organização com tudo que o gestor confere antes de agir: responsável, prazo, checklist, subtarefas e histórico.",
          "input": "tarefaId: id da tarefa escolhida na lista ou no quadro.",
          "processing": "Lê a tarefa pelo id, junta o nome da lista e os nomes do responsável, de quem criou e de quem age agora. Lista os itens da checklist pela tarefa em ordem. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta (tarefaAbertaVencimento), quantidadeSubtarefas contando as tarefas que apontam esta como pai e progressoChecklist; nada disso é gravado. Monta o histórico em ordem de tempo a partir de criadaEm, devolvidaEm com motivo, retomadaEm, concluidaEm, canceladaEm e dos eventos de mudança de situação e reatribuição da ocorrência do processo de tarefa da plataforma. Comentários e anexos não vêm daqui (moduloNaoGuardaComentarios).",
          "output": "A tarefa no estado atual, com sua checklist ordenada e o histórico de eventos em ordem de tempo."
        }
      },
      {
        "route": "tarefas.tarefas_equipe.buscarResponsaveisDisponiveis",
        "kind": "qry",
        "uses": [
          "listParticipante"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "participantes",
            "entity": "Participante",
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
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.tarefas.aceitaTarefasEfetivo",
                "path": "details.tarefas.aceitaTarefasEfetivo"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "nome",
            "target": "participantes",
            "field": "details.identification.name",
            "optional": true
          }
        ],
        "rules": [
          "responsavelAceitaTarefas",
          "escolhaResponsavelPeloNome",
          "participanteNaoConfiguradoAceitaECria"
        ],
        "doc": {
          "raw": "Finalidade: Busca pelo nome os participantes que podem ser escolhidos como novo responsável.\nEntrada: nome: trecho do nome digitado; vazio traz os primeiros por ordem alfabética.\nProcessamento: Filtra participantes ativos que aceitam tarefas (responsavelAceitaTarefas), com aceitaTarefasEfetivo calculado como sim quando o gestor não configurou (participanteNaoConfiguradoAceitaECria). A busca é só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome). Limita a uma quantidade curta de resultados ordenados pelo nome.\nSaída: Os participantes elegíveis encontrados, com id, nome, situação e se aceita tarefas.",
          "purpose": "Busca pelo nome os participantes que podem ser escolhidos como novo responsável.",
          "input": "nome: trecho do nome digitado; vazio traz os primeiros por ordem alfabética.",
          "processing": "Filtra participantes ativos que aceitam tarefas (responsavelAceitaTarefas), com aceitaTarefasEfetivo calculado como sim quando o gestor não configurou (participanteNaoConfiguradoAceitaECria). A busca é só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome). Limita a uma quantidade curta de resultados ordenados pelo nome.",
          "output": "Os participantes elegíveis encontrados, com id, nome, situação e se aceita tarefas."
        }
      },
      {
        "route": "tarefas.tarefas_equipe.trocarResponsavelTarefa",
        "kind": "cmd",
        "uses": [
          "updateTarefa",
          "listItemChecklist"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "tarefa",
            "entity": "Tarefa",
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
                "field": "titulo",
                "path": "titulo"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "listaId",
                "path": "listaId"
              },
              {
                "field": "responsavelId",
                "path": "responsavelId"
              },
              {
                "field": "criadorId",
                "path": "criadorId"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "details.quantidadeSubtarefas",
                "path": "details.quantidadeSubtarefas"
              },
              {
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.criadorNome",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.listaTarefas.nome",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.participante.details.identification.name",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.checklist",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "ordem",
                "path": "ordem"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.concluido",
                "path": "details.concluido"
              },
              {
                "field": "details.concluidoEm",
                "path": "details.concluidoEm"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.historico",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.momento",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "reatribuirApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "responsavelAceitaTarefas",
              "edicaoNaoMudaSituacao",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.listaTarefas.nome",
            "reason": "Interface TarefaDetalhe: field listaTarefas.nome is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.participante.details.identification.name",
            "reason": "Interface TarefaDetalhe: field participante.details.identification.name is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "reatribuirApenasCriadorOuGestor",
          "gestorPorAcessoPlataforma",
          "responsavelAceitaTarefas",
          "edicaoNaoMudaSituacao",
          "quemAgeAgoraPorSituacao",
          "avisarQuemAgeAgora"
        ],
        "doc": {
          "raw": "Finalidade: Troca o responsável de uma tarefa pelo participante escolhido pelo gestor.\nEntrada: id: tarefa a reatribuir; version: versão lida, para concorrência otimista; responsavelId: novo responsável escolhido pelo nome.\nProcessamento: Recusa quem não é o criador nem gestor pelo acesso da plataforma (reatribuirApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa responsável inativo ou que não aceita tarefas (responsavelAceitaTarefas). Recusa versão divergente. Grava só o responsável, sem mudar a situação (edicaoNaoMudaSituacao). Quando a tarefa está a fazer ou em andamento, o novo responsável passa a ser quem age agora (quemAgeAgoraPorSituacao, calculado, não gravado) e a ocorrência do processo da plataforma troca e avisa essa pessoa (avisarQuemAgeAgora).\nSaída: A tarefa no novo estado, com o novo responsável, quem age agora recalculado, checklist e histórico incluindo a troca.",
          "purpose": "Troca o responsável de uma tarefa pelo participante escolhido pelo gestor.",
          "input": "id: tarefa a reatribuir; version: versão lida, para concorrência otimista; responsavelId: novo responsável escolhido pelo nome.",
          "processing": "Recusa quem não é o criador nem gestor pelo acesso da plataforma (reatribuirApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa responsável inativo ou que não aceita tarefas (responsavelAceitaTarefas). Recusa versão divergente. Grava só o responsável, sem mudar a situação (edicaoNaoMudaSituacao). Quando a tarefa está a fazer ou em andamento, o novo responsável passa a ser quem age agora (quemAgeAgoraPorSituacao, calculado, não gravado) e a ocorrência do processo da plataforma troca e avisa essa pessoa (avisarQuemAgeAgora).",
          "output": "A tarefa no novo estado, com o novo responsável, quem age agora recalculado, checklist e histórico incluindo a troca."
        }
      },
      {
        "route": "tarefas.tarefas_equipe.cancelarTarefaEquipe",
        "kind": "cmd",
        "uses": [
          "cancelar",
          "listItemChecklist"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "tarefa",
            "entity": "Tarefa",
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
                "field": "titulo",
                "path": "titulo"
              },
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "listaId",
                "path": "listaId"
              },
              {
                "field": "responsavelId",
                "path": "responsavelId"
              },
              {
                "field": "criadorId",
                "path": "criadorId"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "details.quantidadeSubtarefas",
                "path": "details.quantidadeSubtarefas"
              },
              {
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.criadorNome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.listaTarefas.nome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.participante.details.identification.name",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.checklist",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "ordem",
                "path": "ordem"
              },
              {
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.concluido",
                "path": "details.concluido"
              },
              {
                "field": "details.concluidoEm",
                "path": "details.concluidoEm"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.historico",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.momento",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "gestorPorAcessoPlataforma",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.listaTarefas.nome",
            "reason": "Interface TarefaDetalhe: field listaTarefas.nome is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.participante.details.identification.name",
            "reason": "Interface TarefaDetalhe: field participante.details.identification.name is not a field of any entity."
          }
        ],
        "params": [],
        "rules": [
          "cancelarApenasCriadorOuGestor",
          "gestorPorAcessoPlataforma",
          "avisarQuemAgeAgora",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Cancela uma tarefa ainda aberta a pedido do gestor.\nEntrada: id: tarefa a cancelar; version: versão lida, para concorrência otimista.\nProcessamento: Recusa quem não é o criador nem gestor pelo acesso da plataforma e recusa tarefa que não está a fazer, em andamento ou em revisão (cancelarApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa versão divergente. Aplica a transição cancelar, levando a situação a cancelada e registrando canceladaEm. Antes de trocar, identifica quem estava agindo e o processo da plataforma o avisa (avisarQuemAgeAgora); depois quem age agora passa a ser ninguém (quemAgeAgoraPorSituacao, calculado).\nSaída: A tarefa cancelada, não mais aberta, sem quem age agora, com checklist e histórico incluindo o cancelamento.",
          "purpose": "Cancela uma tarefa ainda aberta a pedido do gestor.",
          "input": "id: tarefa a cancelar; version: versão lida, para concorrência otimista.",
          "processing": "Recusa quem não é o criador nem gestor pelo acesso da plataforma e recusa tarefa que não está a fazer, em andamento ou em revisão (cancelarApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa versão divergente. Aplica a transição cancelar, levando a situação a cancelada e registrando canceladaEm. Antes de trocar, identifica quem estava agindo e o processo da plataforma o avisa (avisarQuemAgeAgora); depois quem age agora passa a ser ninguém (quemAgeAgoraPorSituacao, calculado).",
          "output": "A tarefa cancelada, não mais aberta, sem quem age agora, com checklist e histórico incluindo o cancelamento."
        }
      }
    ]
  }
} as const;

export default definition;
