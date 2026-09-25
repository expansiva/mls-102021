/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listProfissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Profissional.defs.ts"
  ],
  "data": {
    "usecaseId": "listProfissional",
    "entityId": "Profissional",
    "operation": "list",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listProfissional",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Profissional.id"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"CPF\" | \"Passport\" | \"NationalId\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; }",
            "fieldRef": "Profissional.details"
          },
          {
            "name": "page",
            "type": "number"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Profissional.id"
          },
          {
            "name": "version",
            "type": "number",
            "fieldRef": "Profissional.version"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"CPF\" | \"Passport\" | \"NationalId\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; \"base\"?: object; \"person\"?: { \"occupation\"?: string; }; \"general\"?: object; \"agendaClinica\"?: object; }",
            "fieldRef": "Profissional.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.consultas.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas.qryListProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
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
        "call": "get",
        "entity": "Profissional",
        "capability": "read.byId"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "listByType",
        "entity": "Profissional",
        "capability": "locate.byName"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "findByDocument",
        "entity": "Profissional",
        "capability": "locate.byDocument"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "relatedOfMany",
        "entity": "Profissional",
        "capability": "listLinks"
      }
    ],
    "uses": [
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
      },
      {
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-privacy-consent-required-br-eu",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "mdm": {
      "namespace": "agendaClinica",
      "role": "agendaClinica.Profissional",
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
          "id": "findByDocument",
          "method": "findByDocument",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "locate.byDocument"
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
              "value": "agendaClinica.Profissional"
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
          "id": "listLinks",
          "method": "relatedOfMany",
          "target": "collection",
          "shape": "collection",
          "capabilities": [
            "listLinks"
          ],
          "alternative": false,
          "when": [],
          "arguments": [
            {
              "name": "mdmIds",
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
            "relationshipId",
            "type",
            "direction"
          ]
        }
      ]
    }
  }
} as const;

export default definition;
