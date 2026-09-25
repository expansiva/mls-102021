/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "listPaciente",
  "moduleName": "agendaClinica",
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
        "call": "listByType",
        "entity": "Paciente",
        "capability": "locate.byName"
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
        "call": "findByContact",
        "entity": "Paciente",
        "capability": "locate.byContact"
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
    "transaction": {
      "boundary": "none"
    },
    "mdm": {
      "namespace": "agendaClinica",
      "role": "agendaClinica.Paciente",
      "atomic": false,
      "calls": [
        {
          "method": "get",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "read.byId"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
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
          "method": "findByDocument",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "locate.byDocument"
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
          "method": "listByType",
          "target": "collection",
          "shape": "collection",
          "capabilities": [
            "locate.byName"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "type",
              "role": "parameter",
              "value": "agendaClinica.Paciente"
            },
            {
              "name": "name",
              "role": "selector",
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
          "method": "findByContact",
          "target": "entity",
          "shape": "point",
          "capabilities": [
            "locate.byContact"
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
          "method": "relatedOfMany",
          "target": "collection",
          "shape": "collection",
          "capabilities": [
            "listLinks"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "mdmIds",
              "role": "selector",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/listPaciente",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
      "l2/agendaClinica/web/contracts/pacientes.defs.ts",
      "l2/agendaClinica/web/contracts/profissionais.defs.ts",
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
