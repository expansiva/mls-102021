/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/createFornecedor.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createFornecedor",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_3_domain/entities/fornecedor.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createFornecedor",
    "entityId": "Fornecedor",
    "operation": "create",
    "rulesApplied": [
      "fornecedorCnpjObrigatorio"
    ],
    "effects": [],
    "mdm": {
      "namespace": "compras",
      "role": "compras.Fornecedor",
      "atomic": false,
      "calls": [
        {
          "id": "findDocument",
          "method": "findByDocument",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "when": [
            {
              "kind": "contract",
              "path": "details.identification.docType",
              "present": true
            },
            {
              "kind": "contract",
              "path": "details.identification.docId",
              "present": true
            }
          ],
          "arguments": [
            {
              "name": "docType",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docType"
              },
              "path": "details.identification.docType"
            },
            {
              "name": "docId",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docId"
              },
              "path": "details.identification.docId"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "details"
          ]
        },
        {
          "id": "createPerson",
          "method": "create",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "when": [
            {
              "kind": "prior",
              "path": "mdmId",
              "call": "findDocument",
              "present": false
            }
          ],
          "arguments": [
            {
              "name": "aliases",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.aliases"
              },
              "capability": "register.createOrAttach",
              "path": "details.base.aliases"
            },
            {
              "name": "companyKind",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.company.companyKind"
              },
              "capability": "register.createOrAttach",
              "path": "details.company.companyKind"
            },
            {
              "name": "legalName",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.company.legalName"
              },
              "capability": "register.createOrAttach",
              "path": "details.company.legalName"
            },
            {
              "name": "tradeName",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.company.tradeName"
              },
              "capability": "register.createOrAttach",
              "path": "details.company.tradeName"
            },
            {
              "name": "countryCode",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.countryCode"
              },
              "capability": "register.createOrAttach",
              "path": "details.identification.countryCode"
            },
            {
              "name": "docId",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docId"
              },
              "capability": "register.createOrAttach",
              "path": "details.identification.docId"
            },
            {
              "name": "docType",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docType"
              },
              "capability": "register.createOrAttach",
              "path": "details.identification.docType"
            },
            {
              "name": "name",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.name"
              },
              "capability": "register.createOrAttach",
              "path": "details.identification.name"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "alreadyExists"
          ]
        },
        {
          "id": "attachRole",
          "method": "attachRole",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "when": [],
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
              "origin": {
                "kind": "prior",
                "path": "mdmId",
                "calls": [
                  "findDocument",
                  "createPerson"
                ]
              }
            },
            {
              "name": "role",
              "role": "parameter",
              "origin": {
                "kind": "literal",
                "evidence": "role"
              },
              "value": "compras.Fornecedor"
            }
          ],
          "result": [
            "mdmId",
            "version"
          ]
        }
      ]
    }
  }
} as const;

export default definition;
