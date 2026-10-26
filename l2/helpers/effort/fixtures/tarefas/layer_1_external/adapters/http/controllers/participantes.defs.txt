/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/participantes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "participantes",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/participantes.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "participantes",
    "handlers": [
      {
        "route": "tarefas.participantes.buscarUsuarios",
        "kind": "query",
        "grantIds": [
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.participantes.buscarUsuarios",
        "contractPath": "l2/tarefas/web/contracts/participantes.defs.ts",
        "contractInterface": "ParticipantesContracts"
      },
      {
        "route": "tarefas.participantes.incluirParticipante",
        "kind": "command",
        "grantIds": [
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.participantes.incluirParticipante",
        "contractPath": "l2/tarefas/web/contracts/participantes.defs.ts",
        "contractInterface": "ParticipantesContracts"
      },
      {
        "route": "tarefas.participantes.listarParticipantes",
        "kind": "query",
        "grantIds": [
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.participantes.listarParticipantes",
        "contractPath": "l2/tarefas/web/contracts/participantes.defs.ts",
        "contractInterface": "ParticipantesContracts"
      },
      {
        "route": "tarefas.participantes.salvarMarcas",
        "kind": "command",
        "grantIds": [
          "gestorParticipantes"
        ],
        "serviceFunction": "tarefas.participantes.salvarMarcas",
        "contractPath": "l2/tarefas/web/contracts/participantes.defs.ts",
        "contractInterface": "ParticipantesContracts"
      }
    ]
  }
} as const;

export default definition;
