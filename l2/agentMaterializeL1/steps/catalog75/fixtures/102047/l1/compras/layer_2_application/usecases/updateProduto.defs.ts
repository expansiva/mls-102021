/// <mls fileReference="_102047_/l1/compras/layer_2_application/usecases/updateProduto.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateProduto",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_3_domain/entities/produto.defs.ts",
    "_102047_/l4/compras/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "updateProduto",
    "entityId": "Produto",
    "operation": "update",
    "rulesApplied": [
      "produtoInativoNaoSolicitado"
    ],
    "effects": [],
    "mdm": {
      "namespace": "compras",
      "role": "compras.Produto",
      "atomic": true,
      "calls": [
        {
          "id": "update",
          "method": "update",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "edit.platformFields",
            "edit.moduleNamespace"
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
            },
            {
              "name": "expectedVersion",
              "role": "parameter",
              "origin": {
                "kind": "contract",
                "path": "version",
                "evidence": "writePrecondition"
              },
              "path": "version"
            },
            {
              "name": "aliases",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.aliases"
              },
              "capability": "edit.platformFields",
              "path": "details.base.aliases"
            },
            {
              "name": "notes",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.notes"
              },
              "capability": "edit.platformFields",
              "path": "details.base.notes"
            },
            {
              "name": "countryCode",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.countryCode"
              },
              "capability": "edit.platformFields",
              "path": "details.identification.countryCode"
            },
            {
              "name": "name",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.name"
              },
              "capability": "edit.platformFields",
              "path": "details.identification.name"
            },
            {
              "name": "brand",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.brand"
              },
              "capability": "edit.platformFields",
              "path": "details.product.brand"
            },
            {
              "name": "category",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.category"
              },
              "capability": "edit.platformFields",
              "path": "details.product.category"
            },
            {
              "name": "isInventoried",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.isInventoried"
              },
              "capability": "edit.platformFields",
              "path": "details.product.isInventoried"
            },
            {
              "name": "sku",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.sku"
              },
              "capability": "edit.platformFields",
              "path": "details.product.sku"
            },
            {
              "name": "unitOfMeasure",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.product.unitOfMeasure"
              },
              "capability": "edit.platformFields",
              "path": "details.product.unitOfMeasure"
            },
            {
              "name": "compras",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.compras"
              },
              "capability": "edit.moduleNamespace",
              "path": "details.compras"
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
