/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/listRecebimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listRecebimento",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/recebimentoRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/recebimento.defs.ts"
  ],
  "data": {
    "usecaseId": "listRecebimento",
    "entityId": "Recebimento",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
