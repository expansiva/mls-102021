/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/getPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "getPaciente",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Paciente.defs.ts"
  ],
  "data": {
    "usecaseId": "getPaciente",
    "entityId": "Paciente",
    "operation": "get",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getPaciente",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Paciente.id"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Paciente.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Paciente.version"
          },
          {
            "name": "details",
            "type": "object",
            "fieldRef": "Paciente.details"
          },
          {
            "name": "details.identification",
            "type": "object",
            "fieldRef": "Paciente.details.identification"
          },
          {
            "name": "details.identification.subtype",
            "type": "enum",
            "fieldRef": "Paciente.details.identification.subtype"
          },
          {
            "name": "details.identification.name",
            "type": "string",
            "fieldRef": "Paciente.details.identification.name"
          },
          {
            "name": "details.identification.status",
            "type": "enum",
            "fieldRef": "Paciente.details.identification.status"
          },
          {
            "name": "details.identification.docType",
            "type": "enum",
            "fieldRef": "Paciente.details.identification.docType"
          },
          {
            "name": "details.identification.docId",
            "type": "string",
            "fieldRef": "Paciente.details.identification.docId"
          },
          {
            "name": "details.base",
            "type": "object",
            "fieldRef": "Paciente.details.base"
          },
          {
            "name": "details.base.contacts",
            "type": "object",
            "fieldRef": "Paciente.details.base.contacts"
          },
          {
            "name": "details.person",
            "type": "object",
            "fieldRef": "Paciente.details.person"
          },
          {
            "name": "details.person.privacyConsent",
            "type": "object",
            "fieldRef": "Paciente.details.person.privacyConsent"
          },
          {
            "name": "details.general",
            "type": "object",
            "fieldRef": "Paciente.details.general"
          },
          {
            "name": "details.agendaClinica",
            "type": "object",
            "fieldRef": "Paciente.details.agendaClinica"
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
        "entity": "Paciente",
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
      "role": "agendaClinica.Paciente",
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
