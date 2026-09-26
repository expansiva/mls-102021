/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateProfissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Profissional.defs.ts"
  ],
  "data": {
    "usecaseId": "updateProfissional",
    "entityId": "Profissional",
    "operation": "update",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "updateProfissional",
        "input": [
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
            "fieldRef": "Profissional.details"
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
            "fieldRef": "Profissional.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
            "symbol": "UpdateProfissionalOutput"
          },
          {
            "route": "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
            "symbol": "UpdateProfissionalOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
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
        "entity": "Profissional",
        "capability": "edit.platformFields"
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
      "role": "agendaClinica.Profissional",
      "atomic": true,
      "calls": [
        {
          "id": "update",
          "method": "update",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "edit.platformFields"
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
              "name": "occupation",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.person.occupation"
              },
              "capability": "edit.platformFields",
              "path": "details.person.occupation"
            },
            {
              "name": "privacyConsent",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.person.privacyConsent"
              },
              "capability": "edit.platformFields",
              "path": "details.person.privacyConsent"
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
