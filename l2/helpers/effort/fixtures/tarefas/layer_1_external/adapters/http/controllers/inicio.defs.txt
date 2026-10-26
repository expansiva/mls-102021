/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "inicio",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/inicio.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "inicio",
    "handlers": [
      {
        "route": "tarefas.inicio.aceitarTarefa",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.aceitarTarefa",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      },
      {
        "route": "tarefas.inicio.carregarInicio",
        "kind": "query",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.carregarInicio",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      },
      {
        "route": "tarefas.inicio.devolverTarefa",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.devolverTarefa",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      },
      {
        "route": "tarefas.inicio.enviarRevisao",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.enviarRevisao",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      },
      {
        "route": "tarefas.inicio.iniciarTarefa",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.iniciarTarefa",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      },
      {
        "route": "tarefas.inicio.retomarTarefa",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.inicio.retomarTarefa",
        "contractPath": "l2/tarefas/web/contracts/inicio.defs.ts",
        "contractInterface": "InicioContracts"
      }
    ]
  }
} as const;

export default definition;
