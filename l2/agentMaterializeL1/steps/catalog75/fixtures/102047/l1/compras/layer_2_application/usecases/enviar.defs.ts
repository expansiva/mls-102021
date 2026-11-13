/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/enviar.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "enviar",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/solicitacaoCompraRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/solicitacaoCompra.defs.ts",
    "_102047_/l4/compras/ontology/SolicitacaoCompra.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "enviar",
    "entityId": "SolicitacaoCompra",
    "operation": "transition",
    "rulesApplied": [
      "quantidadePositiva",
      "solicitacaoCompletaParaEnviar"
    ],
    "effects": [],
    "transitionRef": "enviar"
  }
} as const;

export default definition;
