/// <mls fileReference="_102047_/l1/controleEstoque/layer_1_external/auth/authorityMap.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "authorityMap",
  "artifactId": "authorityMap",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "mapId": "authorityMap",
    "entries": [
      {
        "grantId": "gerenciarEstoque",
        "actorRef": "estoquista"
      }
    ]
  }
} as const;

export default definition;
