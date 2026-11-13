/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/listProdutoFornecido.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listProdutoFornecido",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/produtoFornecidoRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/produtoFornecido.defs.ts"
  ],
  "data": {
    "usecaseId": "listProdutoFornecido",
    "entityId": "ProdutoFornecido",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
