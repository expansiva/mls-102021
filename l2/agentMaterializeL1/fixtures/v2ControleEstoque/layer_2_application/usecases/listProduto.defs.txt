/// <mls fileReference="_102047_/l1/controleEstoque/layer_2_application/usecases/listProduto.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listProduto",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/controleEstoque/layer_3_domain/entities/produto.defs.ts",
    "_102047_/l4/controleEstoque/ontology/Produto.defs.ts"
  ],
  "data": {
    "usecaseId": "listProduto",
    "entityId": "Produto",
    "operation": "list",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listProduto",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Produto.id"
          },
          {
            "name": "details",
            "type": "object",
            "fieldRef": "Produto.details"
          },
          {
            "name": "details.identification",
            "type": "object",
            "fieldRef": "Produto.details.identification"
          },
          {
            "name": "details.identification.subtype",
            "type": "enum",
            "fieldRef": "Produto.details.identification.subtype"
          },
          {
            "name": "details.identification.name",
            "type": "string",
            "fieldRef": "Produto.details.identification.name"
          },
          {
            "name": "details.identification.status",
            "type": "enum",
            "fieldRef": "Produto.details.identification.status"
          },
          {
            "name": "details.base",
            "type": "object",
            "fieldRef": "Produto.details.base"
          },
          {
            "name": "details.product",
            "type": "object",
            "fieldRef": "Produto.details.product"
          },
          {
            "name": "details.product.unitOfMeasure",
            "type": "string",
            "fieldRef": "Produto.details.product.unitOfMeasure"
          },
          {
            "name": "details.general",
            "type": "object",
            "fieldRef": "Produto.details.general"
          },
          {
            "name": "details.controleEstoque",
            "type": "object",
            "fieldRef": "Produto.details.controleEstoque"
          },
          {
            "name": "details.controleEstoque.quantidadeMinima",
            "type": "number",
            "fieldRef": "Produto.details.controleEstoque.quantidadeMinima"
          },
          {
            "name": "details.controleEstoque.saldoAtual",
            "type": "number",
            "fieldRef": "Produto.details.controleEstoque.saldoAtual"
          },
          {
            "name": "details.controleEstoque.saldoAbaixoDoMinimo",
            "type": "boolean",
            "fieldRef": "Produto.details.controleEstoque.saldoAbaixoDoMinimo"
          },
          {
            "name": "page",
            "type": "number"
          },
          {
            "name": "pageSize",
            "type": "number"
          }
        ],
        "output": [
          {
            "name": "items",
            "type": "Produto"
          },
          {
            "name": "hasMore",
            "type": "boolean"
          }
        ]
      }
    ],
    "portCalls": [],
    "transactional": false,
    "effects": [],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "mdm",
        "namespace": "controleEstoque",
        "call": "get",
        "entity": "Produto",
        "capability": "read.byId"
      },
      {
        "kind": "mdm",
        "namespace": "controleEstoque",
        "call": "listByType",
        "entity": "Produto",
        "capability": "locate.byName"
      }
    ],
    "uses": [
      {
        "path": "details.controleEstoque.saldoAbaixoDoMinimo",
        "role": "filter",
        "source": "input"
      },
      {
        "path": "details.controleEstoque.saldoAtual",
        "role": "filter",
        "source": "input"
      },
      {
        "path": "details.identification.status",
        "role": "filter",
        "source": "input"
      },
      {
        "path": "details.identification.subtype",
        "role": "filter",
        "source": "input"
      },
      {
        "path": "id",
        "role": "filter",
        "source": "input"
      }
    ],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "rule-document-shape-validated",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-document-shape-validated",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-foreign-namespace-refused",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-foreign-namespace-refused",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-identity-never-in-namespace",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-identity-never-in-namespace",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "mdm": {
      "namespace": "controleEstoque",
      "role": "controleEstoque.Produto",
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
              "value": "controleEstoque.Produto"
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
        }
      ]
    }
  }
} as const;

export default definition;
