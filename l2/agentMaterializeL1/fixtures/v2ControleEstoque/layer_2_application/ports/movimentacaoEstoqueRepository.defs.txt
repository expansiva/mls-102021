/// <mls fileReference="_102047_/l1/controleEstoque/layer_2_application/ports/movimentacaoEstoqueRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryPort",
  "artifactId": "MovimentacaoEstoqueRepository",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_3_domain/entities/movimentacaoEstoque.defs.ts"
  ],
  "data": {
    "entityId": "MovimentacaoEstoque",
    "interfaceName": "MovimentacaoEstoqueRepository",
    "methods": [
      {
        "name": "create",
        "params": [
          "MovimentacaoEstoque"
        ],
        "returns": "MovimentacaoEstoque"
      },
      {
        "name": "list",
        "params": [
          "MovimentacaoEstoqueFilter"
        ],
        "returns": "MovimentacaoEstoque[]"
      }
    ]
  }
} as const;

export default definition;
