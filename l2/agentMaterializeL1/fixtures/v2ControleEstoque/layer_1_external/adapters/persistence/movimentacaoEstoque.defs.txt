/// <mls fileReference="_102047_/l1/controleEstoque/layer_1_external/adapters/persistence/movimentacaoEstoque.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "table",
  "artifactId": "movimentacaoEstoque",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_3_domain/entities/movimentacaoEstoque.defs.ts"
  ],
  "data": {
    "tableId": "movimentacaoEstoque",
    "entityId": "MovimentacaoEstoque",
    "physicalName": "controleEstoque_movimentacaoestoque",
    "primaryKey": [
      "id"
    ],
    "uniqueKeys": [],
    "indexes": [
      {
        "name": "controleEstoque_movimentacaoestoque_produtoId",
        "columns": [
          "produtoId"
        ],
        "unique": false
      },
      {
        "name": "controleEstoque_movimentacaoestoque_movimentadoEm",
        "columns": [
          "movimentadoEm"
        ],
        "unique": false
      }
    ]
  }
} as const;

export default definition;
