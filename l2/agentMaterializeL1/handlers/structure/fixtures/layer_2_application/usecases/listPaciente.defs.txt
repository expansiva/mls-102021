/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listPaciente",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102034_/l4/ontology/mdm.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/profissionais.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Paciente.defs.ts"
  ],
  "data": {
    "usecaseId": "listPaciente",
    "entityId": "Paciente",
    "operation": "list",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listPaciente",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Paciente.id"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"SSN\" | \"EIN\" | \"Passport\" | \"DriversLicense\" | \"NationalId\" | \"CPF\" | \"CNPJ\" | \"VAT\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; }",
            "fieldRef": "Paciente.details"
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
            "route": "agendaClinica.consultas_recepcionista.qryListPaciente",
            "symbol": "ListPacienteOutput"
          },
          {
            "route": "agendaClinica.pacientes.qryListPaciente",
            "symbol": "ListPacienteOutput"
          },
          {
            "route": "agendaClinica.profissionais.qryListPaciente",
            "symbol": "ListPacienteOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_recepcionista.qryListPaciente",
        "contractPath": "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListPaciente",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListPaciente",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
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
        "entity": "Paciente",
        "capability": "read.byId"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "findByDocument",
        "entity": "Paciente",
        "capability": "locate.byDocument"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "listByType",
        "entity": "Paciente",
        "capability": "locate.byName"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "relatedOfMany",
        "entity": "Paciente",
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
        "ruleId": "rule-delete-blocked-by-relationships",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-delete-blocked-by-relationships",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "DELEGATION_UNPROVEN"
      },
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
      },
      {
        "ruleId": "rule-person-ssn-unique-for-us",
        "origin": "/_102034_/l4/ontology/mdm.defs.ts#rule-person-ssn-unique-for-us",
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
      "role": "agendaClinica.Paciente",
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
              "value": "agendaClinica.Paciente"
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
