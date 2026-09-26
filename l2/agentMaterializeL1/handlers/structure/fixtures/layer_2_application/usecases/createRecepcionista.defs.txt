/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createRecepcionista.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createRecepcionista",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/recepcionista.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Recepcionista.defs.ts"
  ],
  "data": {
    "usecaseId": "createRecepcionista",
    "entityId": "Recepcionista",
    "operation": "create",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createRecepcionista",
        "input": [
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
            "route": "agendaClinica.dados_recepcionista.cmdCreateRecepcionista",
            "symbol": "CreateRecepcionistaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.dados_recepcionista.cmdCreateRecepcionista",
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
        "call": "findByDocument",
        "entity": "Recepcionista",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "create",
        "entity": "Recepcionista",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "attachRole",
        "entity": "Recepcionista",
        "capability": "register.createOrAttach"
      }
    ],
    "uses": [],
    "rules": [],
    "rulePlan": [
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
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-privacy-consent-required-br-eu",
        "consumer": "operation:create",
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
              "value": "agendaClinica.Recepcionista"
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
