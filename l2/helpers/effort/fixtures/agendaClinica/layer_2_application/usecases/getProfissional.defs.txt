/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/getProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "getProfissional",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Profissional.defs.ts"
  ],
  "data": {
    "usecaseId": "getProfissional",
    "entityId": "Profissional",
    "operation": "get",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getProfissional",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Profissional.id"
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
        "call": "get",
        "entity": "Profissional",
        "capability": "read.byId"
      }
    ],
    "uses": [
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
        "consumer": "operation:get",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-foreign-namespace-refused",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-foreign-namespace-refused",
        "consumer": "operation:get",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-identity-never-in-namespace",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-identity-never-in-namespace",
        "consumer": "operation:get",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-privacy-consent-required-br-eu",
        "consumer": "operation:get",
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
        }
      ]
    }
  }
} as const;

export default definition;
