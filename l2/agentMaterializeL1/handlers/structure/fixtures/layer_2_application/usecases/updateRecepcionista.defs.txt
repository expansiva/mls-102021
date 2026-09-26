/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/updateRecepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateRecepcionista",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/recepcionista.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Recepcionista.defs.ts"
  ],
  "data": {
    "usecaseId": "updateRecepcionista",
    "entityId": "Recepcionista",
    "operation": "update",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "updateRecepcionista",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Recepcionista.id"
          },
          {
            "name": "version",
            "type": "number",
            "fieldRef": "Recepcionista.version"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"name\": string; \"docType\"?: \"CPF\" | \"Passport\" | \"NationalId\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; \"base\"?: object; \"person\"?: object; \"general\"?: object; \"agendaClinica\"?: object; }",
            "fieldRef": "Recepcionista.details"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Recepcionista.id"
          },
          {
            "name": "version",
            "type": "number",
            "fieldRef": "Recepcionista.version"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"CPF\" | \"Passport\" | \"NationalId\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; \"base\"?: object; \"person\"?: object; \"general\"?: object; \"agendaClinica\"?: object; }",
            "fieldRef": "Recepcionista.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.dados_recepcionista.cmdUpdateRecepcionista",
            "symbol": "UpdateRecepcionistaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.dados_recepcionista.cmdUpdateRecepcionista",
        "contractPath": "l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
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
        "namespace": "agendaClinica",
        "call": "update",
        "entity": "Recepcionista",
        "capability": "edit.platformFields"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "update",
        "entity": "Recepcionista",
        "capability": "edit.moduleNamespace"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
        "source": "input"
      },
      {
        "path": "version",
        "role": "concurrency",
        "source": "input"
      }
    ],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "rule-document-shape-validated",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-document-shape-validated",
        "consumer": "operation:update",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-foreign-namespace-refused",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-foreign-namespace-refused",
        "consumer": "operation:update",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-identity-never-in-namespace",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-identity-never-in-namespace",
        "consumer": "operation:update",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-privacy-consent-required-br-eu",
        "consumer": "operation:update",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "mdm": {
      "namespace": "agendaClinica",
      "role": "agendaClinica.Recepcionista",
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
              "name": "docId",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docId"
              },
              "capability": "edit.platformFields",
              "path": "details.identification.docId"
            },
            {
              "name": "docType",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.identification.docType"
              },
              "capability": "edit.platformFields",
              "path": "details.identification.docType"
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
              "name": "agendaClinica",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.agendaClinica"
              },
              "capability": "edit.moduleNamespace",
              "path": "details.agendaClinica"
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
