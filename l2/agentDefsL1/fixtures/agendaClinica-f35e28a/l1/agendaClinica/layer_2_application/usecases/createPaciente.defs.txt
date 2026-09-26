/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "createPaciente",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "createPaciente",
    "entityId": "Paciente",
    "operation": "create",
    "ports": [],
    "rulesApplied": [
      "rule-foreign-namespace-refused",
      "rule-document-shape-validated",
      "rule-identity-never-in-namespace",
      "rule-person-ssn-unique-for-us",
      "rule-person-privacy-consent-required-br-eu"
    ],
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
        "kind": "rule",
        "ruleId": "rule-foreign-namespace-refused"
      },
      {
        "kind": "rule",
        "ruleId": "rule-document-shape-validated"
      },
      {
        "kind": "rule",
        "ruleId": "rule-identity-never-in-namespace"
      },
      {
        "kind": "rule",
        "ruleId": "rule-person-ssn-unique-for-us"
      },
      {
        "kind": "rule",
        "ruleId": "rule-person-privacy-consent-required-br-eu"
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
        "call": "findByContact",
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
    "rules": [
      {
        "ruleId": "rule-foreign-namespace-refused",
        "path": "/_102034_/l4/ontology/mdm.defs.ts",
        "symbol": "rule-foreign-namespace-refused"
      },
      {
        "ruleId": "rule-document-shape-validated",
        "path": "/_102034_/l4/ontology/mdm.defs.ts",
        "symbol": "rule-document-shape-validated"
      },
      {
        "ruleId": "rule-identity-never-in-namespace",
        "path": "/_102034_/l4/ontology/mdm.defs.ts",
        "symbol": "rule-identity-never-in-namespace"
      },
      {
        "ruleId": "rule-person-ssn-unique-for-us",
        "path": "/_102034_/l4/ontology/mdm.defs.ts",
        "symbol": "rule-person-ssn-unique-for-us"
      },
      {
        "ruleId": "rule-person-privacy-consent-required-br-eu",
        "path": "/_102034_/l4/ontology/mdm.defs.ts",
        "symbol": "rule-person-privacy-consent-required-br-eu"
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
          "method": "findByDocument",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "docType",
              "role": "selector",
              "path": "details.identification.docType"
            },
            {
              "name": "docId",
              "role": "selector",
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
          "method": "findByContact",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "contactType",
              "role": "selector",
              "path": "contactType"
            },
            {
              "name": "value",
              "role": "selector",
              "path": "value"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "details"
          ]
        },
        {
          "method": "create",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "aliases",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.base.aliases"
            },
            {
              "name": "notes",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.base.notes"
            },
            {
              "name": "countryCode",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.identification.countryCode"
            },
            {
              "name": "docId",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.identification.docId"
            },
            {
              "name": "docType",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.identification.docType"
            },
            {
              "name": "name",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.identification.name"
            },
            {
              "name": "privacyConsent",
              "role": "patch",
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
          "method": "attachRole",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
              "path": "id"
            },
            {
              "name": "role",
              "role": "parameter",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/createPaciente",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
      "/_102034_/l4/ontology/mdm.defs.ts",
      "l2/agendaClinica/web/contracts/pacientes.defs.ts",
      "l4/agendaClinica/ontology/Paciente.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Paciente"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md"
    ]
  }
] as const;
