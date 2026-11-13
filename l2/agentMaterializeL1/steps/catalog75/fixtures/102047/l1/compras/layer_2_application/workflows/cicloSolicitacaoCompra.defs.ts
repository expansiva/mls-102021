/// <mls fileReference="_102047_/l1/compras/layer_2_application/workflows/cicloSolicitacaoCompra.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "workflowProcess",
  "artifactId": "cicloSolicitacaoCompra",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/autorizar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/createRecebimento.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/createSolicitacaoCompra.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/enviar.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/rejeitar.defs.ts",
    "_102047_/l4/compras/journeys/abrirSolicitacao.defs.ts",
    "_102047_/l4/compras/journeys/autorizarSolicitacao.defs.ts",
    "_102047_/l4/compras/journeys/registrarRecebimento.defs.ts",
    "_102047_/l4/compras/ontology/SolicitacaoCompra.defs.ts",
    "_102047_/l4/compras/workflows.defs.ts"
  ],
  "data": {
    "processId": "cicloSolicitacaoCompra",
    "trigger": {
      "kind": "manual",
      "actorRef": "comprador"
    },
    "functions": [
      "abrirOcorrenciaSolicitacao",
      "conferirCompletudeSolicitacao",
      "pesquisarOpcoesCotacao",
      "registrarDecisaoGerente",
      "verificarEntregaDiaria",
      "registrarAvancoRecebimento",
      "resolverGerenteResponsavel",
      "resolverAlmoxarifeResponsavel"
    ],
    "operations": [
      {
        "operation": "OpcaoCotacao.create",
        "steps": [
          "task:pesquisarOpcoes"
        ]
      },
      {
        "operation": "PedidoCompra.create",
        "steps": [
          "task:gerarPedido"
        ]
      },
      {
        "operation": "Recebimento.create",
        "steps": [
          "journey:registrarRecebimento/lancarRecebimento"
        ]
      },
      {
        "operation": "SolicitacaoCompra.autorizar",
        "steps": [
          "journey:autorizarSolicitacao/autorizar"
        ]
      },
      {
        "operation": "SolicitacaoCompra.create",
        "steps": [
          "journey:abrirSolicitacao/criarSolicitacao"
        ]
      },
      {
        "operation": "SolicitacaoCompra.enviar",
        "steps": [
          "journey:abrirSolicitacao/enviarSolicitacao"
        ]
      },
      {
        "operation": "SolicitacaoCompra.rejeitar",
        "steps": [
          "journey:autorizarSolicitacao/rejeitar"
        ]
      },
      {
        "operation": "SolicitacaoCompra.update",
        "steps": [
          "task:conferirCompletude"
        ]
      }
    ],
    "occurrence": {
      "entityId": "SolicitacaoCompra"
    }
  }
} as const;

export default definition;
