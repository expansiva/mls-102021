/// <mls fileReference="_102047_/l1/controleEstoque/layer_2_application/scope/accessScope.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "accessScope",
  "artifactId": "accessScope",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [],
  "data": {
    "scopeId": "accessScope",
    "grants": [
      {
        "grantId": "gerenciarEstoque",
        "actorRef": "estoquista",
        "entityRefs": [
          "Produto",
          "MovimentacaoEstoque"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Produto",
            "steps": [],
            "pending": ""
          },
          {
            "entityId": "MovimentacaoEstoque",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      }
    ]
  }
} as const;

export default definition;
