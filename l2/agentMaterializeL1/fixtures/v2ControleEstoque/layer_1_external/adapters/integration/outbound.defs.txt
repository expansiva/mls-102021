/// <mls fileReference="_102047_/l1/controleEstoque/layer_1_external/adapters/integration/outbound.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "integrationOutbound",
  "artifactId": "outbound",
  "moduleName": "controleEstoque",
  "status": "blocked",
  "dependencies": [],
  "data": {
    "integrationId": "outbound",
    "events": [],
    "inbound": [
      {
        "inboundId": "recebimentoRegistrado",
        "operations": [
          "createMovimentacaoEstoque"
        ],
        "mechanism": "",
        "consumer": "createMovimentacaoEstoque"
      }
    ]
  }
} as const;

export default definition;
