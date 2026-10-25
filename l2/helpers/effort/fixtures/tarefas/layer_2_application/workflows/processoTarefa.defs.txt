/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/workflows/processoTarefa.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "workflowProcess",
  "artifactId": "processoTarefa",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/aceitar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/createItemChecklist.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/devolver.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/iniciar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/retomar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateItemChecklist.defs.ts",
    "_102047_/l4/tarefas/journeys/criarTarefa.defs.ts",
    "_102047_/l4/tarefas/journeys/executarTarefa.defs.ts",
    "_102047_/l4/tarefas/journeys/retomarTarefa.defs.ts",
    "_102047_/l4/tarefas/journeys/revisarTarefa.defs.ts",
    "_102047_/l4/tarefas/ontology/Tarefa.defs.ts",
    "_102047_/l4/tarefas/workflows.defs.ts"
  ],
  "data": {
    "processId": "processoTarefa",
    "trigger": {
      "kind": "manual",
      "actorRef": "membroEquipe"
    },
    "functions": [
      "abrirOcorrenciaTarefa",
      "avancarEtapaTarefa",
      "definirQuemAgeAgora",
      "trocarResponsavelOcorrencia",
      "cancelarOcorrenciaTarefa"
    ],
    "operations": [
      {
        "operation": "ItemChecklist.create",
        "steps": [
          "journey:criarTarefa/adicionarChecklist"
        ]
      },
      {
        "operation": "ItemChecklist.update",
        "steps": [
          "journey:executarTarefa/marcarItem"
        ]
      },
      {
        "operation": "Tarefa.aceitar",
        "steps": [
          "journey:revisarTarefa/aceitarTarefa"
        ]
      },
      {
        "operation": "Tarefa.create",
        "steps": [
          "journey:criarTarefa/preencherTarefa"
        ]
      },
      {
        "operation": "Tarefa.devolver",
        "steps": [
          "journey:revisarTarefa/devolverTarefa"
        ]
      },
      {
        "operation": "Tarefa.enviarParaRevisao",
        "steps": [
          "journey:executarTarefa/enviarRevisao",
          "journey:retomarTarefa/reenviarRevisao"
        ]
      },
      {
        "operation": "Tarefa.iniciar",
        "steps": [
          "journey:executarTarefa/iniciarTarefa"
        ]
      },
      {
        "operation": "Tarefa.retomar",
        "steps": [
          "journey:retomarTarefa/retomar"
        ]
      }
    ],
    "occurrence": {
      "entityId": "Tarefa"
    }
  }
} as const;

export default definition;
