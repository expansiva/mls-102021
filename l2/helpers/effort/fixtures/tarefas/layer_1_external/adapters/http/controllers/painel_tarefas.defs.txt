/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/painel_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "painel_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/painel_tarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "painel_tarefas",
    "handlers": [
      {
        "route": "tarefas.painel_tarefas.carregarPainelTarefas",
        "kind": "query",
        "grantIds": [
          "gestorListas",
          "gestorTodasTarefas"
        ],
        "serviceFunction": "tarefas.painel_tarefas.carregarPainelTarefas",
        "contractPath": "l2/tarefas/web/contracts/painel_tarefas.defs.ts",
        "contractInterface": "Painel_tarefasContracts"
      }
    ]
  }
} as const;

export default definition;
