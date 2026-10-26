/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "persistenceSeeds",
  "artifactId": "seeds",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/itemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefa.defs.ts"
  ],
  "data": {
    "seedId": "seeds",
    "phase": "plan",
    "scenarios": [
      {
        "scenarioId": "criarTarefa",
        "tableId": "itemChecklist",
        "source": "journey:criarTarefa",
        "constraints": [
          "ref:tarefaId:Tarefa"
        ],
        "refs": [
          {
            "field": "tarefaId",
            "relationshipId": "itemChecklistTarefa",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "ItemChecklist"
      },
      {
        "scenarioId": "editarTarefa",
        "tableId": "itemChecklist",
        "source": "journey:editarTarefa",
        "constraints": [
          "ref:tarefaId:Tarefa"
        ],
        "refs": [
          {
            "field": "tarefaId",
            "relationshipId": "itemChecklistTarefa",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "ItemChecklist"
      },
      {
        "scenarioId": "executarTarefa",
        "tableId": "itemChecklist",
        "source": "journey:executarTarefa",
        "constraints": [
          "ref:tarefaId:Tarefa"
        ],
        "refs": [
          {
            "field": "tarefaId",
            "relationshipId": "itemChecklistTarefa",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "ItemChecklist"
      },
      {
        "scenarioId": "manterListas",
        "tableId": "listaTarefas",
        "source": "journey:manterListas",
        "constraints": [
          "uniqueKeys:nome"
        ],
        "refs": [],
        "states": [],
        "entityId": "ListaTarefas"
      },
      {
        "scenarioId": "acompanharTarefas",
        "tableId": "tarefa",
        "source": "journey:acompanharTarefas",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "cancelarTarefa",
        "tableId": "tarefa",
        "source": "journey:cancelarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:cancelada"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "cancelada"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "cancelarTarefaCriada",
        "tableId": "tarefa",
        "source": "journey:cancelarTarefaCriada",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:cancelada"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "cancelada"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "criarTarefa",
        "tableId": "tarefa",
        "source": "journey:criarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:aFazer"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "aFazer"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "editarTarefa",
        "tableId": "tarefa",
        "source": "journey:editarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "executarTarefa",
        "tableId": "tarefa",
        "source": "journey:executarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:emAndamento"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "emAndamento"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "minhasTarefas",
        "tableId": "tarefa",
        "source": "journey:minhasTarefas",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "reatribuirTarefa",
        "tableId": "tarefa",
        "source": "journey:reatribuirTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "reatribuirTarefaCriada",
        "tableId": "tarefa",
        "source": "journey:reatribuirTarefaCriada",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "resumoDiario",
        "tableId": "tarefa",
        "source": "journey:resumoDiario",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "retomarTarefa",
        "tableId": "tarefa",
        "source": "journey:retomarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:emAndamento"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "emAndamento"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      },
      {
        "scenarioId": "revisarTarefa",
        "tableId": "tarefa",
        "source": "journey:revisarTarefa",
        "constraints": [
          "ref:criadorId:Participante",
          "ref:listaId:ListaTarefas",
          "ref:responsavelId:Participante",
          "ref:tarefaPaiId:Tarefa",
          "state:concluida"
        ],
        "refs": [
          {
            "field": "criadorId",
            "relationshipId": "tarefaCriador",
            "entityId": "Participante"
          },
          {
            "field": "listaId",
            "relationshipId": "tarefaLista",
            "entityId": "ListaTarefas"
          },
          {
            "field": "responsavelId",
            "relationshipId": "tarefaResponsavel",
            "entityId": "Participante"
          },
          {
            "field": "tarefaPaiId",
            "relationshipId": "tarefaPai",
            "entityId": "Tarefa"
          }
        ],
        "states": [
          "concluida"
        ],
        "entityId": "Tarefa",
        "stateField": "status"
      }
    ],
    "dependencies": [
      {
        "entityId": "ItemChecklist",
        "kind": "module",
        "seeded": false
      },
      {
        "entityId": "ListaTarefas",
        "kind": "module",
        "seeded": false
      },
      {
        "entityId": "Participante",
        "kind": "mdm",
        "seeded": false
      },
      {
        "entityId": "Tarefa",
        "kind": "module",
        "seeded": false
      }
    ],
    "datasets": [
      {
        "datasetId": "itemChecklist",
        "tableId": "itemChecklist",
        "owners": [
          "criarTarefa",
          "editarTarefa",
          "executarTarefa"
        ]
      },
      {
        "datasetId": "listaTarefas",
        "tableId": "listaTarefas",
        "owners": [
          "manterListas"
        ]
      },
      {
        "datasetId": "tarefa",
        "tableId": "tarefa",
        "owners": [
          "acompanharTarefas",
          "cancelarTarefa",
          "cancelarTarefaCriada",
          "criarTarefa",
          "editarTarefa",
          "executarTarefa",
          "minhasTarefas",
          "reatribuirTarefa",
          "reatribuirTarefaCriada",
          "resumoDiario",
          "retomarTarefa",
          "revisarTarefa"
        ]
      }
    ],
    "fixture": {
      "schemaVersion": "2026-09-27-m1-certification-fixture-v1",
      "phase": "plan",
      "targets": [
        "memory",
        "development"
      ],
      "datasets": [
        {
          "supportId": "data:ItemChecklist",
          "entityId": "ItemChecklist",
          "tableId": "itemChecklist",
          "dependsOn": [
            "Tarefa"
          ],
          "sourceRefs": [
            "grant:gestorTodasTarefas",
            "grant:membroChecklistPropria",
            "journey:acompanharTarefas/abrirTarefaGestor",
            "journey:acompanharTarefas/filtrarTarefas",
            "journey:acompanharTarefas/verQuadro",
            "journey:cancelarTarefa/cancelar",
            "journey:cancelarTarefa/localizarTarefaCancelar",
            "journey:cancelarTarefaCriada/cancelarCriada",
            "journey:cancelarTarefaCriada/localizarCriadaCancelar",
            "journey:criarTarefa/adicionarChecklist",
            "journey:criarTarefa/preencherTarefa",
            "journey:editarTarefa/ajustarChecklist",
            "journey:editarTarefa/alterarCampos",
            "journey:editarTarefa/localizarTarefaEdicao",
            "journey:executarTarefa/abrirTarefa",
            "journey:executarTarefa/enviarRevisao",
            "journey:executarTarefa/iniciarTarefa",
            "journey:executarTarefa/marcarItem",
            "journey:executarTarefa/verTarefa",
            "journey:minhasTarefas/listarMinhas",
            "journey:minhasTarefas/verDetalhe",
            "journey:reatribuirTarefa/localizarTarefaReatribuir",
            "journey:reatribuirTarefa/trocarResponsavel",
            "journey:reatribuirTarefa/verResponsavelAtual",
            "journey:reatribuirTarefaCriada/localizarCriada",
            "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
            "journey:reatribuirTarefaCriada/verResponsavelCriada",
            "journey:resumoDiario/lerResumo",
            "journey:resumoDiario/verVencendo",
            "journey:retomarTarefa/lerMotivo",
            "journey:retomarTarefa/reenviarRevisao",
            "journey:retomarTarefa/retomar",
            "journey:revisarTarefa/abrirRevisao",
            "journey:revisarTarefa/aceitarTarefa",
            "journey:revisarTarefa/conferirTarefa",
            "journey:revisarTarefa/devolverTarefa",
            "relationship:ItemChecklist/itemChecklistTarefa",
            "relationship:Tarefa/itemChecklistTarefa"
          ]
        },
        {
          "supportId": "data:ListaTarefas",
          "entityId": "ListaTarefas",
          "tableId": "listaTarefas",
          "dependsOn": [],
          "sourceRefs": [
            "grant:gestorListas",
            "grant:membroConsultarListas",
            "journey:acompanharTarefas/abrirTarefaGestor",
            "journey:acompanharTarefas/filtrarTarefas",
            "journey:acompanharTarefas/verQuadro",
            "journey:cancelarTarefa/cancelar",
            "journey:cancelarTarefa/localizarTarefaCancelar",
            "journey:cancelarTarefaCriada/cancelarCriada",
            "journey:cancelarTarefaCriada/localizarCriadaCancelar",
            "journey:criarTarefa/adicionarChecklist",
            "journey:criarTarefa/preencherTarefa",
            "journey:editarTarefa/ajustarChecklist",
            "journey:editarTarefa/alterarCampos",
            "journey:editarTarefa/localizarTarefaEdicao",
            "journey:executarTarefa/abrirTarefa",
            "journey:executarTarefa/enviarRevisao",
            "journey:executarTarefa/iniciarTarefa",
            "journey:executarTarefa/marcarItem",
            "journey:executarTarefa/verTarefa",
            "journey:manterListas/criarLista",
            "journey:manterListas/editarLista",
            "journey:manterListas/localizarLista",
            "journey:minhasTarefas/listarMinhas",
            "journey:minhasTarefas/verDetalhe",
            "journey:reatribuirTarefa/localizarTarefaReatribuir",
            "journey:reatribuirTarefa/trocarResponsavel",
            "journey:reatribuirTarefa/verResponsavelAtual",
            "journey:reatribuirTarefaCriada/localizarCriada",
            "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
            "journey:reatribuirTarefaCriada/verResponsavelCriada",
            "journey:resumoDiario/lerResumo",
            "journey:resumoDiario/verVencendo",
            "journey:retomarTarefa/lerMotivo",
            "journey:retomarTarefa/reenviarRevisao",
            "journey:retomarTarefa/retomar",
            "journey:revisarTarefa/abrirRevisao",
            "journey:revisarTarefa/aceitarTarefa",
            "journey:revisarTarefa/conferirTarefa",
            "journey:revisarTarefa/devolverTarefa",
            "relationship:ListaTarefas/tarefaLista",
            "relationship:Tarefa/tarefaLista"
          ]
        },
        {
          "supportId": "data:Tarefa",
          "entityId": "Tarefa",
          "tableId": "tarefa",
          "dependsOn": [
            "ListaTarefas"
          ],
          "sourceRefs": [
            "grant:gestorTodasTarefas",
            "grant:membroTarefasProprias",
            "journey:acompanharTarefas/abrirTarefaGestor",
            "journey:acompanharTarefas/filtrarTarefas",
            "journey:acompanharTarefas/verQuadro",
            "journey:cancelarTarefa/cancelar",
            "journey:cancelarTarefa/localizarTarefaCancelar",
            "journey:cancelarTarefaCriada/cancelarCriada",
            "journey:cancelarTarefaCriada/localizarCriadaCancelar",
            "journey:configurarParticipantes/incluirParticipante",
            "journey:configurarParticipantes/localizarUsuario",
            "journey:configurarParticipantes/marcarPermissoes",
            "journey:criarTarefa/adicionarChecklist",
            "journey:criarTarefa/preencherTarefa",
            "journey:editarTarefa/ajustarChecklist",
            "journey:editarTarefa/alterarCampos",
            "journey:editarTarefa/localizarTarefaEdicao",
            "journey:executarTarefa/abrirTarefa",
            "journey:executarTarefa/enviarRevisao",
            "journey:executarTarefa/iniciarTarefa",
            "journey:executarTarefa/marcarItem",
            "journey:executarTarefa/verTarefa",
            "journey:manterListas/criarLista",
            "journey:manterListas/editarLista",
            "journey:manterListas/localizarLista",
            "journey:minhasTarefas/listarMinhas",
            "journey:minhasTarefas/verDetalhe",
            "journey:reatribuirTarefa/localizarTarefaReatribuir",
            "journey:reatribuirTarefa/trocarResponsavel",
            "journey:reatribuirTarefa/verResponsavelAtual",
            "journey:reatribuirTarefaCriada/localizarCriada",
            "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
            "journey:reatribuirTarefaCriada/verResponsavelCriada",
            "journey:resumoDiario/lerResumo",
            "journey:resumoDiario/verVencendo",
            "journey:retomarTarefa/lerMotivo",
            "journey:retomarTarefa/reenviarRevisao",
            "journey:retomarTarefa/retomar",
            "journey:revisarTarefa/abrirRevisao",
            "journey:revisarTarefa/aceitarTarefa",
            "journey:revisarTarefa/conferirTarefa",
            "journey:revisarTarefa/decidirRevisao",
            "journey:revisarTarefa/devolverTarefa",
            "ontology:Tarefa/lifecycleStates/aFazer",
            "ontology:Tarefa/lifecycleStates/emAndamento",
            "ontology:Tarefa/lifecycleStates/emRevisao",
            "relationship:ItemChecklist/itemChecklistTarefa",
            "relationship:ListaTarefas/tarefaLista",
            "relationship:Participante/tarefaCriador",
            "relationship:Participante/tarefaResponsavel",
            "relationship:Tarefa/itemChecklistTarefa",
            "relationship:Tarefa/tarefaCriador",
            "relationship:Tarefa/tarefaLista",
            "relationship:Tarefa/tarefaResponsavel"
          ]
        }
      ],
      "runtime": [
        {
          "supportId": "identity:gestor",
          "kind": "identity",
          "entityId": "",
          "actorRefs": [
            "gestor"
          ],
          "gap": "PERSON_ENTITY_UNDECLARED: actor gestor declares no personEntity; the test identity cannot be bound",
          "owner": "runtime"
        },
        {
          "supportId": "identity:membroEquipe",
          "kind": "identity",
          "entityId": "Participante",
          "actorRefs": [
            "membroEquipe"
          ],
          "gap": "RUNTIME_TEST_IDENTITY_UNREFERENCED: no verified runtime capability provisions an authenticated test identity for membroEquipe bound to Participante",
          "owner": "runtime"
        }
      ],
      "gaps": []
    }
  }
} as const;

export default definition;
