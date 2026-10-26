/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefasRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryAdapter",
  "artifactId": "ListaTarefasRepository",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.defs.ts"
  ],
  "data": {
    "entityId": "ListaTarefas",
    "portId": "ListaTarefasRepository",
    "tableId": "listaTarefas",
    "columns": [
      {
        "field": "id",
        "column": "id"
      },
      {
        "field": "version",
        "column": "json:version"
      },
      {
        "field": "nome",
        "column": "nome"
      },
      {
        "field": "details.descricao",
        "column": "json:details.descricao"
      },
      {
        "field": "details.quantidadeTarefasAbertas",
        "column": "json:details.quantidadeTarefasAbertas"
      }
    ]
  }
} as const;

export default definition;
