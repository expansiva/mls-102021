/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/listPedidoCompra.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listPedidoCompra",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/pedidoCompraRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/pedidoCompra.defs.ts"
  ],
  "data": {
    "usecaseId": "listPedidoCompra",
    "entityId": "PedidoCompra",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
