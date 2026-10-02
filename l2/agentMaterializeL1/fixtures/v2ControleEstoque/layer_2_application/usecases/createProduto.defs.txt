/// <mls fileReference="_102047_/l1/controleEstoque/layer_2_application/usecases/createProduto.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createProduto",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/controleEstoque/layer_3_domain/entities/produto.defs.ts",
    "_102047_/l4/controleEstoque/ontology/Produto.defs.ts",
    "_102047_/l4/controleEstoque/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createProduto",
    "entityId": "Produto",
    "operation": "create",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createProduto",
        "input": [
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
            "name": "details.identification.name",
            "type": "string",
            "fieldRef": "Produto.details.identification.name"
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
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Produto.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Produto.version"
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
        "call": "create",
        "entity": "Produto",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "controleEstoque",
        "call": "attachRole",
        "entity": "Produto",
        "capability": "register.createOrAttach"
      }
    ],
    "uses": [],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "avisoSaldoMinimoProduto",
        "origin": "l4/controleEstoque/rules.defs.ts#avisoSaldoMinimoProduto",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
      },
      {
        "ruleId": "quantidadeMinimaValida",
        "origin": "l4/controleEstoque/rules.defs.ts#quantidadeMinimaValida",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
      },
      {
        "ruleId": "rule-document-shape-validated",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-document-shape-validated",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-foreign-namespace-refused",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-foreign-namespace-refused",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-identity-never-in-namespace",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-identity-never-in-namespace",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "saldoAtualProduto",
        "origin": "l4/controleEstoque/rules.defs.ts#saldoAtualProduto",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
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
              "value": "controleEstoque.Produto"
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
