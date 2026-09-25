/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createPaciente",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Paciente.defs.ts"
  ],
  "data": {
    "usecaseId": "createPaciente",
    "entityId": "Paciente",
    "operation": "create",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createPaciente",
        "input": [
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"name\": string; \"docType\"?: \"SSN\" | \"EIN\" | \"Passport\" | \"DriversLicense\" | \"NationalId\" | \"CPF\" | \"CNPJ\" | \"VAT\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; \"base\"?: { \"aliases\": Array<string>; \"notes\"?: string; }; }",
            "fieldRef": "Paciente.details"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Paciente.id"
          },
          {
            "name": "version",
            "type": "number",
            "fieldRef": "Paciente.version"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"SSN\" | \"EIN\" | \"Passport\" | \"DriversLicense\" | \"NationalId\" | \"CPF\" | \"CNPJ\" | \"VAT\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; \"base\"?: { \"aliases\": Array<string>; \"contacts\": Array<object>; \"relationshipRefs\": object; \"notes\"?: string; }; }",
            "fieldRef": "Paciente.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.pacientes.cmdCreatePaciente",
            "symbol": "CreatePacienteOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.pacientes.cmdCreatePaciente",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
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
        "entity": "Paciente",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "create",
        "entity": "Paciente",
        "capability": "register.createOrAttach"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "attachRole",
        "entity": "Paciente",
        "capability": "register.createOrAttach"
      }
    ],
    "uses": [],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "rule-delete-blocked-by-relationships",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-delete-blocked-by-relationships",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
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
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-privacy-consent-required-br-eu",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
      {
        "ruleId": "rule-person-ssn-unique-for-us",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-ssn-unique-for-us",
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
      "role": "agendaClinica.Paciente",
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
              "name": "aliases",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.aliases"
              },
              "capability": "register.createOrAttach",
              "path": "details.base.aliases"
            },
            {
              "name": "notes",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.base.notes"
              },
              "capability": "register.createOrAttach",
              "path": "details.base.notes"
            },
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
              "value": "agendaClinica.Paciente"
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
