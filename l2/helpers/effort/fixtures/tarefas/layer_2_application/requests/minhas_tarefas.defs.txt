/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "minhas_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/aceitar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/cancelar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/createItemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/devolver.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/iniciar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/retomar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateItemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateTarefa.defs.ts"
  ],
  "data": {
    "pageId": "minhas_tarefas",
    "requests": [
      {
        "route": "tarefas.minhas_tarefas.qryMinhasTarefas",
        "kind": "qry",
        "uses": [
          "listTarefa",
          "listListaTarefas",
          "getParticipante"
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
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
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
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefas.items.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento",
              "participanteNaoConfiguradoAceitaECria",
              "criarTarefaExigePodeCriar"
            ]
          },
          {
            "kind": "related",
            "path": "tarefas.items.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefas.items.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefas.items.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "quantidadeDependeDeMim",
            "reason": "Output quantidadeDependeDeMim is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "quantidadeResponsavel",
            "reason": "Output quantidadeResponsavel is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "quantidadeCriadas",
            "reason": "Output quantidadeCriadas is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "quantidadeVenceHoje",
            "reason": "Output quantidadeVenceHoje is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "quantidadeAtrasadas",
            "reason": "Output quantidadeAtrasadas is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "podeCriarTarefasEfetivo",
            "reason": "Output podeCriarTarefasEfetivo is a value (boolean), not an interface; no entity owns it."
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
          }
        ],
        "rules": [
          "membroVeResponsavelOuCriador",
          "quemAgeAgoraPorSituacao",
          "tarefaAbertaVencimento",
          "participanteNaoConfiguradoAceitaECria",
          "criarTarefaExigePodeCriar"
        ],
        "doc": {
          "raw": "Finalidade: Carrega a abertura de minhas tarefas: a primeira página do que depende da pessoa da sessão agora, os totais de cada grupo e de vencimento, e se ela pode criar tarefas.\nEntrada: page e pageSize: página e tamanho da página do grupo ’depende de mim agora’.\nProcessamento: Filtra as tarefas em que a pessoa da sessão é quem age agora (membroVeResponsavelOuCriador), ordenadas por atrasada, vence hoje e criadaEm. quemAgeAgora é calculado pela situação (quemAgeAgoraPorSituacao); aberta, venceHoje e atrasada são calculados pela data de hoje (tarefaAbertaVencimento); progressoChecklist conta itens concluídos sobre o total. Conta no servidor as tarefas abertas de que é responsável, as que criou, as que dependem dela, as que vencem hoje e as atrasadas. possoCriar é a marca efetiva de poder criar tarefas da pessoa da sessão, valendo sim quando não configurada (participanteNaoConfiguradoAceitaECria, criarTarefaExigePodeCriar). Campos derivados são calculados, nunca gravados.\nSaída: Página { items, page, pageSize, hasMore } de tarefas resumidas que dependem da pessoa agora, os totais por grupo e de vencimento e o indicador podeCriarTarefasEfetivo.",
          "purpose": "Carrega a abertura de minhas tarefas: a primeira página do que depende da pessoa da sessão agora, os totais de cada grupo e de vencimento, e se ela pode criar tarefas.",
          "input": "page e pageSize: página e tamanho da página do grupo ’depende de mim agora’.",
          "processing": "Filtra as tarefas em que a pessoa da sessão é quem age agora (membroVeResponsavelOuCriador), ordenadas por atrasada, vence hoje e criadaEm. quemAgeAgora é calculado pela situação (quemAgeAgoraPorSituacao); aberta, venceHoje e atrasada são calculados pela data de hoje (tarefaAbertaVencimento); progressoChecklist conta itens concluídos sobre o total. Conta no servidor as tarefas abertas de que é responsável, as que criou, as que dependem dela, as que vencem hoje e as atrasadas. possoCriar é a marca efetiva de poder criar tarefas da pessoa da sessão, valendo sim quando não configurada (participanteNaoConfiguradoAceitaECria, criarTarefaExigePodeCriar). Campos derivados são calculados, nunca gravados.",
          "output": "Página { items, page, pageSize, hasMore } de tarefas resumidas que dependem da pessoa agora, os totais por grupo e de vencimento e o indicador podeCriarTarefasEfetivo."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
        "kind": "qry",
        "uses": [
          "listTarefa",
          "listListaTarefas",
          "getParticipante"
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
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "details.progressoChecklist",
                "path": "details.progressoChecklist"
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
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "criadaEm",
                "path": "criadaEm"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefas.items.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "tarefaAbertaVencimento"
            ]
          },
          {
            "kind": "related",
            "path": "tarefas.items.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefas.items.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefas.items.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
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
          }
        ],
        "rules": [
          "membroVeResponsavelOuCriador",
          "quemAgeAgoraPorSituacao",
          "tarefaAbertaVencimento"
        ],
        "doc": {
          "raw": "Finalidade: Busca uma página das tarefas da pessoa da sessão num grupo: responsável, criadas ou depende de mim agora.\nEntrada: grupo: ’responsavel’, ’criadas’ ou ’dependeDeMim’; page e pageSize: página pedida e tamanho.\nProcessamento: Filtra por responsavelId, criadorId ou quemAgeAgora igual à pessoa da sessão conforme o grupo (membroVeResponsavelOuCriador), abertas primeiro, atrasadas e que vencem hoje antes, depois criadaEm. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta, venceHoje, atrasada (tarefaAbertaVencimento), devolvidaPendente e progressoChecklist; nada é gravado.\nSaída: Página { items, page, pageSize, hasMore } de tarefas resumidas do grupo pedido.",
          "purpose": "Busca uma página das tarefas da pessoa da sessão num grupo: responsável, criadas ou depende de mim agora.",
          "input": "grupo: ’responsavel’, ’criadas’ ou ’dependeDeMim’; page e pageSize: página pedida e tamanho.",
          "processing": "Filtra por responsavelId, criadorId ou quemAgeAgora igual à pessoa da sessão conforme o grupo (membroVeResponsavelOuCriador), abertas primeiro, atrasadas e que vencem hoje antes, depois criadaEm. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta, venceHoje, atrasada (tarefaAbertaVencimento), devolvidaPendente e progressoChecklist; nada é gravado.",
          "output": "Página { items, page, pageSize, hasMore } de tarefas resumidas do grupo pedido."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.qryTarefa",
        "kind": "qry",
        "uses": [
          "listTarefa",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "membroVeResponsavelOuCriador",
              "quemAgeAgoraPorSituacao",
              "itemChecklistSoQuemVeTarefa",
              "moduloNaoGuardaComentarios"
            ]
          }
        ],
        "params": [],
        "rules": [
          "membroVeResponsavelOuCriador",
          "quemAgeAgoraPorSituacao",
          "itemChecklistSoQuemVeTarefa",
          "moduloNaoGuardaComentarios"
        ],
        "doc": {
          "raw": "Finalidade: Abre uma tarefa com seus dados, checklist, papel da pessoa da sessão e histórico.\nEntrada: tarefaId: id da tarefa escolhida na lista ou vinda de um aviso.\nProcessamento: Lê a tarefa pelo id e recusa se a pessoa da sessão não for responsável, quem criou nem quem age agora (membroVeResponsavelOuCriador). Compõe nomes do responsável, de quem criou e de quem age agora, nome da lista, título da tarefa pai, quantidade de subtarefas, progressoChecklist e os itens da checklist em ordem (itemChecklistSoQuemVeTarefa). Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), souResponsavel e souCriador comparando com a pessoa da sessão. Monta o histórico pelos marcos da tarefa e do processo da plataforma, em ordem de tempo; comentários e anexos ficam na conversa da plataforma (moduloNaoGuardaComentarios).\nSaída: A tarefa completa com a checklist em ordem e a lista de eventos do histórico em ordem cronológica.",
          "purpose": "Abre uma tarefa com seus dados, checklist, papel da pessoa da sessão e histórico.",
          "input": "tarefaId: id da tarefa escolhida na lista ou vinda de um aviso.",
          "processing": "Lê a tarefa pelo id e recusa se a pessoa da sessão não for responsável, quem criou nem quem age agora (membroVeResponsavelOuCriador). Compõe nomes do responsável, de quem criou e de quem age agora, nome da lista, título da tarefa pai, quantidade de subtarefas, progressoChecklist e os itens da checklist em ordem (itemChecklistSoQuemVeTarefa). Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), souResponsavel e souCriador comparando com a pessoa da sessão. Monta o histórico pelos marcos da tarefa e do processo da plataforma, em ordem de tempo; comentários e anexos ficam na conversa da plataforma (moduloNaoGuardaComentarios).",
          "output": "A tarefa completa com a checklist em ordem e a lista de eventos do histórico em ordem cronológica."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.qryResponsaveis",
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
            "name": "busca",
            "target": "participantes",
            "field": "details.identification.name",
            "optional": true
          }
        ],
        "rules": [
          "escolhaResponsavelPeloNome",
          "responsavelAceitaTarefas",
          "participanteNaoConfiguradoAceitaECria",
          "participanteSemCadastroPessoal"
        ],
        "doc": {
          "raw": "Finalidade: Busca pelo nome os participantes que podem ser escolhidos como responsável.\nEntrada: busca: trecho do nome digitado; vazio traz os primeiros por nome.\nProcessamento: Filtra participantes com o papel tarefas.Participante, situação Active e aceitaTarefasEfetivo verdadeiro, valendo sim quando não configurado (responsavelAceitaTarefas, participanteNaoConfiguradoAceitaECria). Busca só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome), e não expõe outro dado pessoal (participanteSemCadastroPessoal). Limita a uma quantidade curta, ordenada por nome.\nSaída: Participantes elegíveis com id, nome, situação e aceita tarefas efetivo.",
          "purpose": "Busca pelo nome os participantes que podem ser escolhidos como responsável.",
          "input": "busca: trecho do nome digitado; vazio traz os primeiros por nome.",
          "processing": "Filtra participantes com o papel tarefas.Participante, situação Active e aceitaTarefasEfetivo verdadeiro, valendo sim quando não configurado (responsavelAceitaTarefas, participanteNaoConfiguradoAceitaECria). Busca só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome), e não expõe outro dado pessoal (participanteSemCadastroPessoal). Limita a uma quantidade curta, ordenada por nome.",
          "output": "Participantes elegíveis com id, nome, situação e aceita tarefas efetivo."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.qryListas",
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
          }
        ],
        "params": [
          {
            "name": "busca",
            "target": "listas",
            "field": "nome",
            "optional": true
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Busca as listas de tarefas pelo nome para escolher a lista da tarefa.\nEntrada: busca: trecho do nome da lista; vazio traz as primeiras por nome.\nProcessamento: Busca listas pelo texto no nome, ordenadas por nome, limitadas a uma quantidade curta.\nSaída: Listas com id e nome.",
          "purpose": "Busca as listas de tarefas pelo nome para escolher a lista da tarefa.",
          "input": "busca: trecho do nome da lista; vazio traz as primeiras por nome.",
          "processing": "Busca listas pelo texto no nome, ordenadas por nome, limitadas a uma quantidade curta.",
          "output": "Listas com id e nome."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdCriarTarefa",
        "kind": "cmd",
        "uses": [
          "createTarefa",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "criarTarefaExigePodeCriar",
              "podeCriarTarefasExigido",
              "participanteNaoConfiguradoAceitaECria",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          }
        ],
        "params": [
          {
            "name": "prazo",
            "target": "",
            "optional": true
          },
          {
            "name": "tarefaPaiId",
            "target": "",
            "optional": true
          }
        ],
        "rules": [
          "criarTarefaExigePodeCriar",
          "podeCriarTarefasExigido",
          "participanteNaoConfiguradoAceitaECria",
          "responsavelAceitaTarefas",
          "escolhaResponsavelPeloNome",
          "tarefaPaiDiferenteDaPropria",
          "avisarQuemAgeAgora"
        ],
        "doc": {
          "raw": "Finalidade: Cria uma nova tarefa em a fazer com o responsável escolhido.\nEntrada: titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId opcional e details.etiquetas da nova tarefa; criadorId: quem cria, que precisa ser a própria pessoa da sessão.\nProcessamento: Recusa se a pessoa da sessão não puder criar tarefas pela marca efetiva (criarTarefaExigePodeCriar, podeCriarTarefasExigido, participanteNaoConfiguradoAceitaECria) e recusa criadorId diferente da pessoa da sessão: quem criou é sempre ela (criarTarefaExigePodeCriar). Recusa responsável que não seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome) e tarefa pai inválida (tarefaPaiDiferenteDaPropria). Grava com status aFazer; criadaEm é preenchido pelo sistema. Abre a ocorrência do processo da tarefa e avisa o responsável (avisarQuemAgeAgora).\nSaída: A tarefa criada, em a fazer, completa e com checklist vazia, e seu histórico com o evento de criação.",
          "purpose": "Cria uma nova tarefa em a fazer com o responsável escolhido.",
          "input": "titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId opcional e details.etiquetas da nova tarefa; criadorId: quem cria, que precisa ser a própria pessoa da sessão.",
          "processing": "Recusa se a pessoa da sessão não puder criar tarefas pela marca efetiva (criarTarefaExigePodeCriar, podeCriarTarefasExigido, participanteNaoConfiguradoAceitaECria) e recusa criadorId diferente da pessoa da sessão: quem criou é sempre ela (criarTarefaExigePodeCriar). Recusa responsável que não seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome) e tarefa pai inválida (tarefaPaiDiferenteDaPropria). Grava com status aFazer; criadaEm é preenchido pelo sistema. Abre a ocorrência do processo da tarefa e avisa o responsável (avisarQuemAgeAgora).",
          "output": "A tarefa criada, em a fazer, completa e com checklist vazia, e seu histórico com o evento de criação."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist",
        "kind": "cmd",
        "uses": [
          "createItemChecklist",
          "listTarefa",
          "listListaTarefas",
          "getParticipante"
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "itemChecklistSoQuemVeTarefa",
          "itemChecklistTarefaNaoEncerrada",
          "marcarItemNaoMudaSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Acrescenta itens marcáveis à checklist de uma tarefa.\nEntrada: tarefaId: tarefa que recebe os itens; itens: ordem, descrição e marcação inicial de concluído de cada novo item (normalmente falso).\nProcessamento: Recusa se a pessoa da sessão não vê a tarefa (itemChecklistSoQuemVeTarefa) ou se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada). Grava os itens todos juntos com a marcação informada; concluidoEm é preenchido pelo sistema quando o item já vem marcado. A situação da tarefa não muda (marcarItemNaoMudaSituacao). progressoChecklist é recalculado, nunca gravado.\nSaída: A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico.",
          "purpose": "Acrescenta itens marcáveis à checklist de uma tarefa.",
          "input": "tarefaId: tarefa que recebe os itens; itens: ordem, descrição e marcação inicial de concluído de cada novo item (normalmente falso).",
          "processing": "Recusa se a pessoa da sessão não vê a tarefa (itemChecklistSoQuemVeTarefa) ou se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada). Grava os itens todos juntos com a marcação informada; concluidoEm é preenchido pelo sistema quando o item já vem marcado. A situação da tarefa não muda (marcarItemNaoMudaSituacao). progressoChecklist é recalculado, nunca gravado.",
          "output": "A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdSalvarAlteracoes",
        "kind": "cmd",
        "uses": [
          "updateTarefa",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "edicaoNaoMudaSituacao",
              "membroVeResponsavelOuCriador",
              "reatribuirApenasCriadorOuGestor",
              "responsavelAceitaTarefas",
              "escolhaResponsavelPeloNome",
              "tarefaPaiDiferenteDaPropria",
              "avisarQuemAgeAgora"
            ]
          }
        ],
        "params": [
          {
            "name": "prazo",
            "target": "",
            "optional": true
          },
          {
            "name": "tarefaPaiId",
            "target": "",
            "optional": true
          }
        ],
        "rules": [
          "edicaoNaoMudaSituacao",
          "membroVeResponsavelOuCriador",
          "reatribuirApenasCriadorOuGestor",
          "responsavelAceitaTarefas",
          "escolhaResponsavelPeloNome",
          "tarefaPaiDiferenteDaPropria",
          "avisarQuemAgeAgora"
        ],
        "doc": {
          "raw": "Finalidade: Salva os campos ajustados de uma tarefa e, quando muda, troca o responsável, sem mudar a situação.\nEntrada: id e version da tarefa; titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId e details.etiquetas com os novos valores.\nProcessamento: Recusa se a pessoa não vê a tarefa (membroVeResponsavelOuCriador) ou se a version mudou. Nunca altera status (edicaoNaoMudaSituacao). Se responsavelId mudou, exige que a pessoa seja quem criou (reatribuirApenasCriadorOuGestor) e que o novo seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome), e avisa o novo responsável quando ele passa a agir agora (avisarQuemAgeAgora). Recusa tarefa pai igual à própria ou a uma subtarefa (tarefaPaiDiferenteDaPropria).\nSaída: A tarefa completa nos novos valores, com a mesma situação, e seu histórico incluindo a troca de responsável quando houver.",
          "purpose": "Salva os campos ajustados de uma tarefa e, quando muda, troca o responsável, sem mudar a situação.",
          "input": "id e version da tarefa; titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId e details.etiquetas com os novos valores.",
          "processing": "Recusa se a pessoa não vê a tarefa (membroVeResponsavelOuCriador) ou se a version mudou. Nunca altera status (edicaoNaoMudaSituacao). Se responsavelId mudou, exige que a pessoa seja quem criou (reatribuirApenasCriadorOuGestor) e que o novo seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome), e avisa o novo responsável quando ele passa a agir agora (avisarQuemAgeAgora). Recusa tarefa pai igual à própria ou a uma subtarefa (tarefaPaiDiferenteDaPropria).",
          "output": "A tarefa completa nos novos valores, com a mesma situação, e seu histórico incluindo a troca de responsável quando houver."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdAjustarChecklist",
        "kind": "cmd",
        "uses": [
          "updateItemChecklist",
          "listTarefa",
          "listListaTarefas",
          "getParticipante"
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "itemChecklistSoQuemVeTarefa",
              "itemChecklistTarefaNaoEncerrada",
              "marcarItemNaoMudaSituacao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "itemChecklistSoQuemVeTarefa",
          "itemChecklistTarefaNaoEncerrada",
          "marcarItemNaoMudaSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Edita, reordena, marca ou desmarca itens da checklist de uma tarefa.\nEntrada: tarefaId: tarefa dos itens; itens: id, version e os novos valores de ordem, descrição ou concluído de cada item.\nProcessamento: Recusa se a pessoa não vê a tarefa (itemChecklistSoQuemVeTarefa), se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada), se algum item não pertence à tarefa ou se a version mudou. Grava os itens; concluidoEm é preenchido pelo sistema ao marcar e limpo ao desmarcar. A situação da tarefa não muda (marcarItemNaoMudaSituacao).\nSaída: A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico.",
          "purpose": "Edita, reordena, marca ou desmarca itens da checklist de uma tarefa.",
          "input": "tarefaId: tarefa dos itens; itens: id, version e os novos valores de ordem, descrição ou concluído de cada item.",
          "processing": "Recusa se a pessoa não vê a tarefa (itemChecklistSoQuemVeTarefa), se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada), se algum item não pertence à tarefa ou se a version mudou. Grava os itens; concluidoEm é preenchido pelo sistema ao marcar e limpo ao desmarcar. A situação da tarefa não muda (marcarItemNaoMudaSituacao).",
          "output": "A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdIniciar",
        "kind": "cmd",
        "uses": [
          "iniciar",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Inicia a tarefa de que a pessoa é responsável.\nEntrada: id e version da tarefa.\nProcessamento: Recusa se a pessoa da sessão não é o responsável (apenasResponsavelExecuta), se a tarefa não está em aFazer ou se a version mudou. Passa a emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao).\nSaída: A tarefa completa em andamento e seu histórico com o início.",
          "purpose": "Inicia a tarefa de que a pessoa é responsável.",
          "input": "id e version da tarefa.",
          "processing": "Recusa se a pessoa da sessão não é o responsável (apenasResponsavelExecuta), se a tarefa não está em aFazer ou se a version mudou. Passa a emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao).",
          "output": "A tarefa completa em andamento e seu histórico com o início."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdEnviarParaRevisao",
        "kind": "cmd",
        "uses": [
          "enviarParaRevisao",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "quemAgeAgoraPorSituacao",
          "avisarQuemAgeAgora"
        ],
        "doc": {
          "raw": "Finalidade: Envia para revisão de quem criou a tarefa em andamento do responsável.\nEntrada: id e version da tarefa.\nProcessamento: Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a tarefa não está emAndamento ou se a version mudou. Passa a emRevisao; quem criou passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).\nSaída: A tarefa completa em revisão e seu histórico com o envio.",
          "purpose": "Envia para revisão de quem criou a tarefa em andamento do responsável.",
          "input": "id e version da tarefa.",
          "processing": "Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a tarefa não está emAndamento ou se a version mudou. Passa a emRevisao; quem criou passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).",
          "output": "A tarefa completa em revisão e seu histórico com o envio."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdAceitar",
        "kind": "cmd",
        "uses": [
          "aceitar",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "quemAgeAgoraPorSituacao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "apenasCriadorRevisa",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Aceita a entrega de uma tarefa em revisão criada pela pessoa.\nEntrada: id e version da tarefa.\nProcessamento: Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao ou se a version mudou. Passa a concluida e registra concluidaEm; ninguém age agora (quemAgeAgoraPorSituacao).\nSaída: A tarefa completa concluída e seu histórico com o aceite.",
          "purpose": "Aceita a entrega de uma tarefa em revisão criada pela pessoa.",
          "input": "id e version da tarefa.",
          "processing": "Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao ou se a version mudou. Passa a concluida e registra concluidaEm; ninguém age agora (quemAgeAgoraPorSituacao).",
          "output": "A tarefa completa concluída e seu histórico com o aceite."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdDevolver",
        "kind": "cmd",
        "uses": [
          "devolver",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "apenasCriadorRevisa",
              "devolucaoExigeMotivo",
              "quemAgeAgoraPorSituacao",
              "avisarQuemAgeAgora"
            ]
          }
        ],
        "params": [],
        "rules": [
          "apenasCriadorRevisa",
          "devolucaoExigeMotivo",
          "quemAgeAgoraPorSituacao",
          "avisarQuemAgeAgora"
        ],
        "doc": {
          "raw": "Finalidade: Devolve ao responsável, com motivo, uma tarefa em revisão criada pela pessoa.\nEntrada: id e version da tarefa; details.motivoDevolucao: o que precisa ser corrigido.\nProcessamento: Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao, se a version mudou ou se o motivo está vazio (devolucaoExigeMotivo). Grava o motivo, registra devolvidaEm e volta a emAndamento; o responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).\nSaída: A tarefa completa em andamento com o motivo da devolução e devolvida aguardando retomada, e seu histórico com a devolução.",
          "purpose": "Devolve ao responsável, com motivo, uma tarefa em revisão criada pela pessoa.",
          "input": "id e version da tarefa; details.motivoDevolucao: o que precisa ser corrigido.",
          "processing": "Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao, se a version mudou ou se o motivo está vazio (devolucaoExigeMotivo). Grava o motivo, registra devolvidaEm e volta a emAndamento; o responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).",
          "output": "A tarefa completa em andamento com o motivo da devolução e devolvida aguardando retomada, e seu histórico com a devolução."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdRetomar",
        "kind": "cmd",
        "uses": [
          "retomar",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "apenasResponsavelExecuta",
              "retomarSoAposDevolucao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "retomarSoAposDevolucao"
        ],
        "doc": {
          "raw": "Finalidade: Retoma a tarefa devolvida para continuar o trabalho.\nEntrada: id e version da tarefa.\nProcessamento: Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a version mudou ou se a tarefa não está emAndamento devolvida e ainda não retomada (retomarSoAposDevolucao). Registra retomadaEm e mantém emAndamento; devolvidaPendente passa a falso por cálculo.\nSaída: A tarefa completa em andamento já retomada e seu histórico com a retomada.",
          "purpose": "Retoma a tarefa devolvida para continuar o trabalho.",
          "input": "id e version da tarefa.",
          "processing": "Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a version mudou ou se a tarefa não está emAndamento devolvida e ainda não retomada (retomarSoAposDevolucao). Registra retomadaEm e mantém emAndamento; devolvidaPendente passa a falso por cálculo.",
          "output": "A tarefa completa em andamento já retomada e seu histórico com a retomada."
        }
      },
      {
        "route": "tarefas.minhas_tarefas.cmdCancelar",
        "kind": "cmd",
        "uses": [
          "cancelar",
          "listListaTarefas",
          "getParticipante",
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
                "field": "details.descricao",
                "path": "details.descricao"
              },
              {
                "field": "details.etiquetas",
                "path": "details.etiquetas"
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
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              },
              {
                "field": "details.devolvidaEm",
                "path": "details.devolvidaEm"
              },
              {
                "field": "details.retomadaEm",
                "path": "details.retomadaEm"
              },
              {
                "field": "details.concluidaEm",
                "path": "details.concluidaEm"
              },
              {
                "field": "details.canceladaEm",
                "path": "details.canceladaEm"
              },
              {
                "field": "details.quemAgeAgora",
                "path": "details.quemAgeAgora"
              },
              {
                "field": "details.devolvidaPendente",
                "path": "details.devolvidaPendente"
              },
              {
                "field": "details.aberta",
                "path": "details.aberta"
              },
              {
                "field": "prazo",
                "path": "prazo"
              },
              {
                "field": "prioridade",
                "path": "prioridade"
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "tarefaPaiId",
                "path": "tarefaPaiId"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.quemAgeAgoraNome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souResponsavel",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "tarefa.souCriador",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.listaTarefas",
            "entity": "ListaTarefas",
            "relationship": "tarefaLista",
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
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "relationship": "tarefaResponsavel",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "relationship": "tarefaCriador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.tarefaPai",
            "entity": "Tarefa",
            "relationship": "tarefaPai",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "titulo",
                "path": "titulo"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.itens",
            "entity": "ItemChecklist",
            "relationship": "itemChecklistTarefa",
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
            "kind": "list",
            "path": "historico",
            "entity": "Tarefa",
            "items": "",
            "fields": [
              {
                "field": "status",
                "path": "status"
              },
              {
                "field": "details.motivoDevolucao",
                "path": "details.motivoDevolucao"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "historico.tipo",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.momento",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          },
          {
            "kind": "computed",
            "path": "historico.responsavelNome",
            "entity": "Tarefa",
            "rules": [
              "cancelarApenasCriadorOuGestor",
              "avisarQuemAgeAgora",
              "quemAgeAgoraPorSituacao"
            ]
          }
        ],
        "params": [],
        "rules": [
          "cancelarApenasCriadorOuGestor",
          "avisarQuemAgeAgora",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Cancela uma tarefa criada pela pessoa.\nEntrada: id e version da tarefa.\nProcessamento: Recusa se a pessoa não é quem criou nem gestor (cancelarApenasCriadorOuGestor), se a tarefa não está em aFazer, emAndamento ou emRevisao ou se a version mudou. Passa a cancelada e registra canceladaEm; quem estava agindo é avisado (avisarQuemAgeAgora) e ninguém age agora (quemAgeAgoraPorSituacao).\nSaída: A tarefa completa cancelada e seu histórico com o cancelamento.",
          "purpose": "Cancela uma tarefa criada pela pessoa.",
          "input": "id e version da tarefa.",
          "processing": "Recusa se a pessoa não é quem criou nem gestor (cancelarApenasCriadorOuGestor), se a tarefa não está em aFazer, emAndamento ou emRevisao ou se a version mudou. Passa a cancelada e registra canceladaEm; quem estava agindo é avisado (avisarQuemAgeAgora) e ninguém age agora (quemAgeAgoraPorSituacao).",
          "output": "A tarefa completa cancelada e seu histórico com o cancelamento."
        }
      }
    ]
  }
} as const;

export default definition;
