/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/createSolicitacaoCompra.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createSolicitacaoCompra",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/solicitacaoCompraRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/solicitacaoCompra.defs.ts"
  ],
  "data": {
    "usecaseId": "createSolicitacaoCompra",
    "entityId": "SolicitacaoCompra",
    "operation": "create",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
