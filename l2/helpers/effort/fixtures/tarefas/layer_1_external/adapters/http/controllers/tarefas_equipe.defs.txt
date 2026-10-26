/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/tarefas_equipe.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "tarefas_equipe",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/tarefas_equipe.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "tarefas_equipe",
    "handlers": [
      {
        "route": "tarefas.tarefas_equipe.buscarResponsaveisDisponiveis",
        "kind": "query",
        "grantIds": [
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.buscarResponsaveisDisponiveis",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      },
      {
        "route": "tarefas.tarefas_equipe.cancelarTarefaEquipe",
        "kind": "command",
        "grantIds": [
          "gestorTodasTarefas"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.cancelarTarefaEquipe",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      },
      {
        "route": "tarefas.tarefas_equipe.carregarFiltrosEquipe",
        "kind": "query",
        "grantIds": [
          "gestorListas",
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.carregarFiltrosEquipe",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      },
      {
        "route": "tarefas.tarefas_equipe.listarTarefasEquipe",
        "kind": "query",
        "grantIds": [
          "gestorTodasTarefas"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.listarTarefasEquipe",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      },
      {
        "route": "tarefas.tarefas_equipe.obterTarefaEquipe",
        "kind": "query",
        "grantIds": [
          "gestorTodasTarefas"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.obterTarefaEquipe",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      },
      {
        "route": "tarefas.tarefas_equipe.trocarResponsavelTarefa",
        "kind": "command",
        "grantIds": [
          "gestorTodasTarefas"
        ],
        "serviceFunction": "tarefas.tarefas_equipe.trocarResponsavelTarefa",
        "contractPath": "l2/tarefas/web/contracts/tarefas_equipe.defs.ts",
        "contractInterface": "Tarefas_equipeContracts"
      }
    ]
  }
} as const;

export default definition;
