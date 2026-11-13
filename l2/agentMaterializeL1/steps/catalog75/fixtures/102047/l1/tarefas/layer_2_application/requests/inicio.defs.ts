/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "inicio",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/aceitar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/devolver.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/getParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/iniciar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listListaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/retomar.defs.ts"
  ],
  "data": {
    "pageId": "inicio",
    "requests": [
      {
        "route": "tarefas.inicio.carregarInicio",
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
            "path": "pendencias",
            "entity": "Tarefa",
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
                "field": "criadaEm",
                "path": "criadaEm"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pendencias.listaTarefas",
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
            "kind": "unresolved",
            "path": "pendencias.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.carregarInicio projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "pendencias.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pendencias.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pendencias.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.carregarInicio projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "pendencias.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pendencias.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "list",
            "path": "alertas",
            "entity": "Tarefa",
            "items": "",
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
                "field": "prazo",
                "path": "prazo"
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
            "kind": "entity",
            "path": "permissoes.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "computed",
            "path": "permissoes.details.tarefas",
            "rules": [
              "participanteNaoConfiguradoAceitaECria"
            ]
          },
          {
            "kind": "unresolved",
            "path": "pendencias.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "pendencias.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "pendencias.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "pendencias.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "membroVeResponsavelOuCriador",
          "quemAgeAgoraPorSituacao",
          "retomarSoAposDevolucao",
          "tarefaAbertaVencimento",
          "resumoDiarioOitoHoras",
          "participanteNaoConfiguradoAceitaECria"
        ],
        "doc": {
          "raw": "Finalidade: Carrega de uma vez a tela inicial do membro: o que depende dele agora, os prazos de hoje e atrasados, os contadores das suas tarefas e as suas marcas de aceitar e criar tarefas.\nEntrada: Nenhuma entrada; a pessoa da sessão é identificada pelo servidor.\nProcessamento: Restringe às tarefas visíveis ao membro (membroVeResponsavelOuCriador). Pendências: tarefas cujo quemAgeAgora calculado é a pessoa da sessão (quemAgeAgoraPorSituacao) — a fazer ou em andamento como responsável, em revisão como quem criou — incluindo as em andamento devolvidas e ainda não retomadas (devolvidaPendente, retomarSoAposDevolucao), ordenadas por prazo e criadaEm, com nome da lista, nomes do responsável e de quem criou e progressoChecklist calculado pela contagem dos itens. Alertas: tarefas abertas de que a pessoa é responsável que vencem hoje ou estão atrasadas (tarefaAbertaVencimento, mesmo critério do resumo das 8h de resumoDiarioOitoHoras), ordenadas por prazo. Indicadores: contagens no servidor de abertas, vencem hoje, atrasadas e devolvidas pendentes entre as tarefas de que a pessoa é responsável. Permissões: lê o participante da sessão e calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo como a marca do gestor ou sim quando não configurado (participanteNaoConfiguradoAceitaECria). Campos derivados são calculados, nunca gravados.\nSaída: Lista de pendências com situação, prazo, prioridade, lista, responsável, quem criou, progresso e motivo da devolução; lista de alertas de prazo; os quatro contadores já calculados; e o nome com as marcas efetivas da pessoa da sessão.",
          "purpose": "Carrega de uma vez a tela inicial do membro: o que depende dele agora, os prazos de hoje e atrasados, os contadores das suas tarefas e as suas marcas de aceitar e criar tarefas.",
          "input": "Nenhuma entrada; a pessoa da sessão é identificada pelo servidor.",
          "processing": "Restringe às tarefas visíveis ao membro (membroVeResponsavelOuCriador). Pendências: tarefas cujo quemAgeAgora calculado é a pessoa da sessão (quemAgeAgoraPorSituacao) — a fazer ou em andamento como responsável, em revisão como quem criou — incluindo as em andamento devolvidas e ainda não retomadas (devolvidaPendente, retomarSoAposDevolucao), ordenadas por prazo e criadaEm, com nome da lista, nomes do responsável e de quem criou e progressoChecklist calculado pela contagem dos itens. Alertas: tarefas abertas de que a pessoa é responsável que vencem hoje ou estão atrasadas (tarefaAbertaVencimento, mesmo critério do resumo das 8h de resumoDiarioOitoHoras), ordenadas por prazo. Indicadores: contagens no servidor de abertas, vencem hoje, atrasadas e devolvidas pendentes entre as tarefas de que a pessoa é responsável. Permissões: lê o participante da sessão e calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo como a marca do gestor ou sim quando não configurado (participanteNaoConfiguradoAceitaECria). Campos derivados são calculados, nunca gravados.",
          "output": "Lista de pendências com situação, prazo, prioridade, lista, responsável, quem criou, progresso e motivo da devolução; lista de alertas de prazo; os quatro contadores já calculados; e o nome com as marcas efetivas da pessoa da sessão."
        }
      },
      {
        "route": "tarefas.inicio.iniciarTarefa",
        "kind": "cmd",
        "uses": [
          "iniciar",
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
                "field": "details",
                "path": "details"
              }
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
            "kind": "unresolved",
            "path": "tarefa.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.iniciarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.iniciarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Inicia uma tarefa a fazer de que a pessoa da sessão é responsável.\nEntrada: id: tarefa a iniciar; version: versão lida, para controle de concorrência.\nProcessamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta) ou se a situação não for aFazer, ou se a versão divergir. Executa a transição iniciar para emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao, calculado). Recalcula os contadores da pessoa.\nSaída: A tarefa na nova situação em andamento, com lista, nomes, progresso e campos derivados recalculados, e os contadores atualizados da pessoa.",
          "purpose": "Inicia uma tarefa a fazer de que a pessoa da sessão é responsável.",
          "input": "id: tarefa a iniciar; version: versão lida, para controle de concorrência.",
          "processing": "Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta) ou se a situação não for aFazer, ou se a versão divergir. Executa a transição iniciar para emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao, calculado). Recalcula os contadores da pessoa.",
          "output": "A tarefa na nova situação em andamento, com lista, nomes, progresso e campos derivados recalculados, e os contadores atualizados da pessoa."
        }
      },
      {
        "route": "tarefas.inicio.enviarRevisao",
        "kind": "cmd",
        "uses": [
          "enviarParaRevisao",
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
                "field": "details",
                "path": "details"
              }
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
            "kind": "unresolved",
            "path": "tarefa.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.enviarRevisao projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.enviarRevisao projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "avisarQuemAgeAgora",
          "avisoNaoSobrepostoPorPessoa",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Envia para revisão (ou reenvia após devolução) uma tarefa em andamento de que a pessoa da sessão é responsável.\nEntrada: id: tarefa a enviar; version: versão lida, para controle de concorrência.\nProcessamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a situação não for emAndamento ou se a versão divergir. Executa a transição enviarParaRevisao para emRevisao; quem criou passa a ser quem age agora (quemAgeAgoraPorSituacao) e é avisado pelo processo da tarefa (avisarQuemAgeAgora), sem iniciar novo aviso para quem já tem um em andamento (avisoNaoSobrepostoPorPessoa). Recalcula os contadores.\nSaída: A tarefa em revisão, com quem age agora já sendo quem criou, e os contadores atualizados da pessoa.",
          "purpose": "Envia para revisão (ou reenvia após devolução) uma tarefa em andamento de que a pessoa da sessão é responsável.",
          "input": "id: tarefa a enviar; version: versão lida, para controle de concorrência.",
          "processing": "Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a situação não for emAndamento ou se a versão divergir. Executa a transição enviarParaRevisao para emRevisao; quem criou passa a ser quem age agora (quemAgeAgoraPorSituacao) e é avisado pelo processo da tarefa (avisarQuemAgeAgora), sem iniciar novo aviso para quem já tem um em andamento (avisoNaoSobrepostoPorPessoa). Recalcula os contadores.",
          "output": "A tarefa em revisão, com quem age agora já sendo quem criou, e os contadores atualizados da pessoa."
        }
      },
      {
        "route": "tarefas.inicio.aceitarTarefa",
        "kind": "cmd",
        "uses": [
          "aceitar",
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
                "field": "details",
                "path": "details"
              }
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
            "kind": "unresolved",
            "path": "tarefa.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.aceitarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.aceitarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "apenasCriadorRevisa",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Aceita a entrega de uma tarefa em revisão criada pela pessoa da sessão, concluindo-a.\nEntrada: id: tarefa a aceitar; version: versão lida, para controle de concorrência.\nProcessamento: Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao ou se a versão divergir. Executa a transição aceitar para concluida; quem age agora passa a ser ninguém e a tarefa deixa de ser aberta (calculados). Recalcula os contadores.\nSaída: A tarefa concluída, sem quem aja agora, e os contadores atualizados da pessoa.",
          "purpose": "Aceita a entrega de uma tarefa em revisão criada pela pessoa da sessão, concluindo-a.",
          "input": "id: tarefa a aceitar; version: versão lida, para controle de concorrência.",
          "processing": "Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao ou se a versão divergir. Executa a transição aceitar para concluida; quem age agora passa a ser ninguém e a tarefa deixa de ser aberta (calculados). Recalcula os contadores.",
          "output": "A tarefa concluída, sem quem aja agora, e os contadores atualizados da pessoa."
        }
      },
      {
        "route": "tarefas.inicio.devolverTarefa",
        "kind": "cmd",
        "uses": [
          "devolver",
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
                "field": "details",
                "path": "details"
              }
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
            "kind": "unresolved",
            "path": "tarefa.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.devolverTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.devolverTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "apenasCriadorRevisa",
          "devolucaoExigeMotivo",
          "avisarQuemAgeAgora",
          "avisoNaoSobrepostoPorPessoa",
          "quemAgeAgoraPorSituacao"
        ],
        "doc": {
          "raw": "Finalidade: Devolve ao responsável, com o motivo, uma tarefa em revisão criada pela pessoa da sessão.\nEntrada: id: tarefa a devolver; version: versão lida; details.motivoDevolucao: texto obrigatório explicando o que corrigir.\nProcessamento: Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao, se a versão divergir ou se o motivo vier vazio (devolucaoExigeMotivo). Executa a transição devolver para emAndamento gravando o motivo; o sistema preenche devolvidaEm. O responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora, sem sobrepor aviso em andamento — avisoNaoSobrepostoPorPessoa). devolvidaPendente passa a verdadeiro por cálculo. Recalcula os contadores.\nSaída: A tarefa em andamento com o motivo da devolução e quem age agora sendo o responsável, e os contadores atualizados da pessoa.",
          "purpose": "Devolve ao responsável, com o motivo, uma tarefa em revisão criada pela pessoa da sessão.",
          "input": "id: tarefa a devolver; version: versão lida; details.motivoDevolucao: texto obrigatório explicando o que corrigir.",
          "processing": "Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao, se a versão divergir ou se o motivo vier vazio (devolucaoExigeMotivo). Executa a transição devolver para emAndamento gravando o motivo; o sistema preenche devolvidaEm. O responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora, sem sobrepor aviso em andamento — avisoNaoSobrepostoPorPessoa). devolvidaPendente passa a verdadeiro por cálculo. Recalcula os contadores.",
          "output": "A tarefa em andamento com o motivo da devolução e quem age agora sendo o responsável, e os contadores atualizados da pessoa."
        }
      },
      {
        "route": "tarefas.inicio.retomarTarefa",
        "kind": "cmd",
        "uses": [
          "retomar",
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
                "field": "details",
                "path": "details"
              }
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
            "kind": "unresolved",
            "path": "tarefa.responsavel.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.retomarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.responsavel.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details",
            "reason": "DISCLOSURE: Route tarefas.inicio.retomarTarefa projects responsavel.details, criador.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "tarefa.criador",
            "entity": "Participante",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "tarefa.criador.details.identification",
            "entity": "Participante",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.responsavel.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador",
            "reason": "Participante inside Tarefa needs one L4 relationship between them; found 2."
          },
          {
            "kind": "unresolved",
            "path": "tarefa.criador.details.identification",
            "reason": "Participante inside Participante needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "indicadores",
            "reason": "Interface IndicadoresTarefas has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [
          "apenasResponsavelExecuta",
          "retomarSoAposDevolucao"
        ],
        "doc": {
          "raw": "Finalidade: Retoma uma tarefa devolvida de que a pessoa da sessão é responsável, para continuar o trabalho.\nEntrada: id: tarefa a retomar; version: versão lida, para controle de concorrência.\nProcessamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a versão divergir ou se a tarefa não estiver em andamento devolvida e ainda não retomada após a devolução (retomarSoAposDevolucao). Executa a transição retomar, mantendo emAndamento; o sistema preenche retomadaEm e devolvidaPendente passa a falso por cálculo. Recalcula os contadores.\nSaída: A tarefa em andamento já retomada, com o motivo da última devolução, e os contadores atualizados da pessoa.",
          "purpose": "Retoma uma tarefa devolvida de que a pessoa da sessão é responsável, para continuar o trabalho.",
          "input": "id: tarefa a retomar; version: versão lida, para controle de concorrência.",
          "processing": "Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a versão divergir ou se a tarefa não estiver em andamento devolvida e ainda não retomada após a devolução (retomarSoAposDevolucao). Executa a transição retomar, mantendo emAndamento; o sistema preenche retomadaEm e devolvidaPendente passa a falso por cálculo. Recalcula os contadores.",
          "output": "A tarefa em andamento já retomada, com o motivo da última devolução, e os contadores atualizados da pessoa."
        }
      }
    ]
  }
} as const;

export default definition;
