/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/registerRepositories.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryRegistration",
  "artifactId": "registerRepositories",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/itemChecklistRepositoryAdapter.defs.ts",
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefasRepositoryAdapter.defs.ts",
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefaRepositoryAdapter.defs.ts"
  ],
  "data": {
    "registrationId": "registerRepositories",
    "adapters": [
      {
        "portId": "ItemChecklistRepository",
        "adapterArtifactId": "ItemChecklistRepository"
      },
      {
        "portId": "ListaTarefasRepository",
        "adapterArtifactId": "ListaTarefasRepository"
      },
      {
        "portId": "TarefaRepository",
        "adapterArtifactId": "TarefaRepository"
      }
    ]
  }
} as const;

export default definition;
