/// <mls fileReference="_102047_/l1/controleEstoque/layer_1_external/adapters/persistence/registerRepositories.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryRegistration",
  "artifactId": "registerRepositories",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_1_external/adapters/persistence/movimentacaoEstoqueRepositoryAdapter.defs.ts"
  ],
  "data": {
    "registrationId": "registerRepositories",
    "adapters": [
      {
        "portId": "MovimentacaoEstoqueRepository",
        "adapterArtifactId": "MovimentacaoEstoqueRepository"
      }
    ]
  }
} as const;

export default definition;
