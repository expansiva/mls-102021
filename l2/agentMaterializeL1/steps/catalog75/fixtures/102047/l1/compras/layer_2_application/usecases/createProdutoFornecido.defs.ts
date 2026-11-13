/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/createProdutoFornecido.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createProdutoFornecido",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/produtoFornecidoRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/produtoFornecido.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createProdutoFornecido",
    "entityId": "ProdutoFornecido",
    "operation": "create",
    "rulesApplied": [
      "precoCombinadoPositivo",
      "produtoFornecidoUnicoPorFornecedor"
    ],
    "effects": []
  }
} as const;

export default definition;
