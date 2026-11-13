/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/listOpcaoCotacao.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listOpcaoCotacao",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/ports/opcaoCotacaoRepository.defs.ts",
    "_102047_/l1/compras/layer_3_domain/entities/opcaoCotacao.defs.ts"
  ],
  "data": {
    "usecaseId": "listOpcaoCotacao",
    "entityId": "OpcaoCotacao",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
