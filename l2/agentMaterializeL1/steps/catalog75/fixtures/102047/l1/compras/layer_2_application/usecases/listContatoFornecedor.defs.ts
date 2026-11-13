/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/listContatoFornecedor.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listContatoFornecedor",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_3_domain/entities/contatoFornecedor.defs.ts"
  ],
  "data": {
    "usecaseId": "listContatoFornecedor",
    "entityId": "ContatoFornecedor",
    "operation": "list",
    "rulesApplied": [],
    "effects": [],
    "mdm": {
      "namespace": "compras",
      "role": "compras.ContatoFornecedor",
      "atomic": false,
      "calls": [
        {
          "id": "get",
          "method": "get",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "read.byId"
          ],
          "alternative": false,
          "when": [],
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "id"
              },
              "path": "id"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "details"
          ]
        },
        {
          "id": "listByName",
          "method": "listByType",
          "target": "collection",
          "shape": "collection",
          "capabilities": [
            "locate.byName"
          ],
          "alternative": false,
          "when": [
            {
              "kind": "contract",
              "path": "details.identification.name",
              "present": true
            }
          ],
          "arguments": [
            {
              "name": "type",
              "role": "parameter",
              "origin": {
                "kind": "literal",
                "evidence": "role"
              },
              "value": "compras.ContatoFornecedor"
            },
            {
              "name": "name",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "details.identification.name"
              },
              "path": "details.identification.name"
            }
          ],
          "result": [
            "items",
            "page",
            "pageSize",
            "total"
          ]
        },
        {
          "id": "findByContact",
          "method": "findByContact",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "locate.byContact"
          ],
          "alternative": false,
          "when": [
            {
              "kind": "contract",
              "path": "details.contactChannel.contactType",
              "present": true
            },
            {
              "kind": "contract",
              "path": "details.contactChannel.value",
              "present": true
            }
          ],
          "arguments": [
            {
              "name": "contactType",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "details.contactChannel.contactType"
              },
              "path": "details.contactChannel.contactType"
            },
            {
              "name": "value",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "details.contactChannel.value"
              },
              "path": "details.contactChannel.value"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "details"
          ]
        }
      ]
    }
  }
} as const;

export default definition;
