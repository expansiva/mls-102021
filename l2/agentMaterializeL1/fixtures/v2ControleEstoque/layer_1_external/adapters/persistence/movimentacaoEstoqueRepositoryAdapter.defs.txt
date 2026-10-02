/// <mls fileReference="_102047_/l1/controleEstoque/layer_1_external/adapters/persistence/movimentacaoEstoqueRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryAdapter",
  "artifactId": "MovimentacaoEstoqueRepository",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_1_external/adapters/persistence/movimentacaoEstoque.defs.ts",
    "_102047_/l1/controleEstoque/layer_2_application/ports/movimentacaoEstoqueRepository.defs.ts"
  ],
  "data": {
    "entityId": "MovimentacaoEstoque",
    "portId": "MovimentacaoEstoqueRepository",
    "tableId": "movimentacaoEstoque",
    "columns": [
      {
        "field": "id",
        "column": "id"
      },
      {
        "field": "version",
        "column": "json:version"
      },
      {
        "field": "produtoId",
        "column": "produtoId"
      },
      {
        "field": "movimentadoEm",
        "column": "movimentadoEm"
      },
      {
        "field": "details.tipo",
        "column": "json:details.tipo"
      },
      {
        "field": "details.quantidade",
        "column": "json:details.quantidade"
      }
    ]
  }
} as const;

export default definition;
