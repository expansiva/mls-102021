/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createProfissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Profissional.defs.ts"
  ],
  "data": {
    "usecaseId": "createProfissional",
    "entityId": "Profissional",
    "operation": "create",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createProfissional",
        "input": [
          {
            "name": "details",
            "type": "object",
            "fieldRef": "Profissional.details"
          },
          {
            "name": "details.identification",
            "type": "object",
            "fieldRef": "Profissional.details.identification"
          },
          {
            "name": "details.identification.name",
            "type": "string",
            "fieldRef": "Profissional.details.identification.name"
          },
          {
            "name": "details.identification.docType",
            "type": "enum",
            "fieldRef": "Profissional.details.identification.docType"
          },
          {
            "name": "details.identification.docId",
            "type": "string",
            "fieldRef": "Profissional.details.identification.docId"
          },
          {
            "name": "details.identification.countryCode",
            "type": "string",
            "fieldRef": "Profissional.details.identification.countryCode"
          },
          {
            "name": "details.base",
            "type": "object",
            "fieldRef": "Profissional.details.base"
          },
          {
            "name": "details.person",
            "type": "object",
            "fieldRef": "Profissional.details.person"
          },
          {
            "name": "details.person.privacyConsent",
            "type": "object",
            "fieldRef": "Profissional.details.person.privacyConsent"
          },
          {
            "name": "details.general",
            "type": "object",
            "fieldRef": "Profissional.details.general"
          },
          {
            "name": "details.agendaClinica",
            "type": "object",
            "fieldRef": "Profissional.details.agendaClinica"
          },
          {
            "name": "details.agendaClinica.professionalType",
            "type": "enum",
            "fieldRef": "Profissional.details.agendaClinica.professionalType"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Profissional.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Profissional.version"
          },
          {
            "name": "details",
            "type": "object",
            "fieldRef": "Profissional.details"
          },
          {
            "name": "details.identification",
            "type": "object",
            "fieldRef": "Profissional.details.identification"
          },
          {
            "name": "details.identification.subtype",
            "type": "enum",
            "fieldRef": "Profissional.details.identification.subtype"
          },
          {
            "name": "details.identification.name",
            "type": "string",
            "fieldRef": "Profissional.details.identification.name"
          },
          {
            "name": "details.identification.status",
            "type": "enum",
            "fieldRef": "Profissional.details.identification.status"
          },
          {
            "name": "details.identification.docType",
            "type": "enum",
            "fieldRef": "Profissional.details.identification.docType"
          },
          {
            "name": "details.identification.docId",
            "type": "string",
            "fieldRef": "Profissional.details.identification.docId"
          },
          {
            "name": "details.identification.countryCode",
            "type": "string",
            "fieldRef": "Profissional.details.identification.countryCode"
          },
          {
            "name": "details.base",
            "type": "object",
            "fieldRef": "Profissional.details.base"
          },
          {
            "name": "details.person",
            "type": "object",
            "fieldRef": "Profissional.details.person"
          },
          {
            "name": "details.person.privacyConsent",
            "type": "object",
            "fieldRef": "Profissional.details.person.privacyConsent"
          },
          {
            "name": "details.general",
            "type": "object",
            "fieldRef": "Profissional.details.general"
          },
          {
            "name": "details.agendaClinica",
            "type": "object",
            "fieldRef": "Profissional.details.agendaClinica"
          },
          {
            "name": "details.agendaClinica.professionalType",
            "type": "enum",
            "fieldRef": "Profissional.details.agendaClinica.professionalType"
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
        "namespace": "agendaClinica",
        "call": "findByDocument",
        "entity": "Profissional",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "create",
        "entity": "Profissional",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "attachRole",
        "entity": "Profissional",
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
      "role": "agendaClinica.Profissional",
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
            },
            {
              "name": "privacyConsent",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.person.privacyConsent"
              },
              "capability": "register.createOrAttach",
              "path": "details.person.privacyConsent"
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
              "value": "agendaClinica.Profissional"
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
