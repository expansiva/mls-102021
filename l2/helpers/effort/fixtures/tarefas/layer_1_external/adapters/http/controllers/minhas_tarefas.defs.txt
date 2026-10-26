/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/minhas_tarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "minhas_tarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "minhas_tarefas",
    "handlers": [
      {
        "route": "tarefas.minhas_tarefas.cmdAceitar",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdAceitar",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist",
        "kind": "command",
        "grantIds": [
          "membroChecklistPropria",
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdAjustarChecklist",
        "kind": "command",
        "grantIds": [
          "membroChecklistPropria",
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdAjustarChecklist",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdCancelar",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdCancelar",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdCriarTarefa",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdCriarTarefa",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdDevolver",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdDevolver",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdEnviarParaRevisao",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdEnviarParaRevisao",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdIniciar",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdIniciar",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdRetomar",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdRetomar",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.cmdSalvarAlteracoes",
        "kind": "command",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.cmdSalvarAlteracoes",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.qryListas",
        "kind": "query",
        "grantIds": [
          "membroConsultarListas"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.qryListas",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.qryMinhasTarefas",
        "kind": "query",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.qryMinhasTarefas",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.qryResponsaveis",
        "kind": "query",
        "grantIds": [
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.qryResponsaveis",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.qryTarefa",
        "kind": "query",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel",
          "membroChecklistPropria"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.qryTarefa",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      },
      {
        "route": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
        "kind": "query",
        "grantIds": [
          "membroTarefasProprias",
          "membroConsultarListas",
          "membroEscolherResponsavel"
        ],
        "serviceFunction": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
        "contractPath": "l2/tarefas/web/contracts/minhas_tarefas.defs.ts",
        "contractInterface": "Minhas_tarefasContracts"
      }
    ]
  }
} as const;

export default definition;
