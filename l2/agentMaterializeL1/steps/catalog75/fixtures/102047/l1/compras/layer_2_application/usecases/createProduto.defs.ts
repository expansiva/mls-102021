/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/createProduto.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createProduto",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_3_domain/entities/produto.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createProduto",
    "entityId": "Produto",
    "operation": "create",
    "rulesApplied": [
      "produtoInativoNaoSolicitado"
    ],
    "effects": [],
    "mdm": {
      "namespace": "compras",
      "role": "compras.Produto",
      "atomic": false,
      "calls": [
        {
          "id": "createPerson",
          "method": "create",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "when": [],
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
              "name": "notes",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.notes"
              },
              "capability": "register.createOrAttach",
              "path": "details.base.notes"
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
              "name": "name",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.name"
              },
              "capability": "register.createOrAttach",
              "path": "details.identification.name"
            },
            {
              "name": "brand",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.brand"
              },
              "capability": "register.createOrAttach",
              "path": "details.product.brand"
            },
            {
              "name": "category",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.category"
              },
              "capability": "register.createOrAttach",
              "path": "details.product.category"
            },
            {
              "name": "isInventoried",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.isInventoried"
              },
              "capability": "register.createOrAttach",
              "path": "details.product.isInventoried"
            },
            {
              "name": "sku",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.sku"
              },
              "capability": "register.createOrAttach",
              "path": "details.product.sku"
            },
            {
              "name": "unitOfMeasure",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.unitOfMeasure"
              },
              "capability": "register.createOrAttach",
              "path": "details.product.unitOfMeasure"
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
              "value": "compras.Produto"
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
