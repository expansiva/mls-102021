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
          },
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Profissional.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Profissional.version"
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
        "call": "update",
        "entity": "Profissional",
        "capability": "edit.platformFields"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "update",
        "entity": "Profissional",
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
      "role": "agendaClinica.Profissional",
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
              "name": "privacyConsent",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.person.privacyConsent"
              },
              "capability": "edit.platformFields",
              "path": "details.person.privacyConsent"
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
