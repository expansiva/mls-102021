/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/listas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "listas_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/listas_tarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "listas_tarefas",
    "handlers": [
      {
        "route": "tarefas.listas_tarefas.cmdCriarLista",
        "kind": "command",
        "grantIds": [
          "gestorListas"
        ],
        "serviceFunction": "tarefas.listas_tarefas.cmdCriarLista",
        "contractPath": "l2/tarefas/web/contracts/listas_tarefas.defs.ts",
        "contractInterface": "Listas_tarefasContracts"
      },
      {
        "route": "tarefas.listas_tarefas.cmdSalvarLista",
        "kind": "command",
        "grantIds": [
          "gestorListas"
        ],
        "serviceFunction": "tarefas.listas_tarefas.cmdSalvarLista",
        "contractPath": "l2/tarefas/web/contracts/listas_tarefas.defs.ts",
        "contractInterface": "Listas_tarefasContracts"
      },
      {
        "route": "tarefas.listas_tarefas.qryListasTarefas",
        "kind": "query",
        "grantIds": [
          "gestorListas"
        ],
        "serviceFunction": "tarefas.listas_tarefas.qryListasTarefas",
        "contractPath": "l2/tarefas/web/contracts/listas_tarefas.defs.ts",
        "contractInterface": "Listas_tarefasContracts"
      }
    ]
  }
} as const;

export default definition;
