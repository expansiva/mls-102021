/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "listProfissional",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "listProfissional",
    "entityId": "Profissional",
    "operation": "list",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listProfissional",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Profissional.id"
          },
          {
            "name": "details",
            "type": "{ \"identification\"?: { \"subtype\": \"Person\"; \"name\": string; \"status\": \"Active\" | \"Inactive\" | \"Merged\" | \"Blocked\"; \"docType\"?: \"SSN\" | \"EIN\" | \"Passport\" | \"DriversLicense\" | \"NationalId\" | \"CPF\" | \"CNPJ\" | \"VAT\" | \"Other\"; \"docId\"?: string; \"countryCode\": string; }; }",
            "fieldRef": "Profissional.details"
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
            "route": "agendaClinica.consultas_recepcionista.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          },
          {
            "route": "agendaClinica.dados_profissional.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          },
          {
            "route": "agendaClinica.dados_recepcionista.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          },
          {
            "route": "agendaClinica.pacientes.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          },
          {
            "route": "agendaClinica.profissionais.qryListProfissional",
            "symbol": "ListProfissionalOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_recepcionista.qryListProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.dados_profissional.qryListProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.qryListProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.pacientes.qryListProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListProfissional",
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
        "entity": "Profissional",
        "capability": "read.byId"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "findByDocument",
        "entity": "Profissional",
        "capability": "locate.byDocument"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "listByType",
        "entity": "Profissional",
        "capability": "locate.byName"
      },
      {
        "kind": "mdm",
        "namespace": "agendaClinica",
        "call": "listByType",
        "entity": "Profissional",
        "capability": "locate.byTag"
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
      "role": "agendaClinica.Profissional",
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
              "value": "agendaClinica.Profissional"
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
          "method": "listByType",
          "target": "collection",
          "shape": "collection",
          "capabilities": [
            "locate.byTag"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "type",
              "role": "parameter",
              "value": "agendaClinica.Profissional"
            }
          ],
          "result": [
            "items",
            "page",
            "pageSize",
            "total"
          ]
        }
      ]
    }
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/listProfissional",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
      "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
      "l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
      "l2/agendaClinica/web/contracts/pacientes.defs.ts",
      "l2/agendaClinica/web/contracts/profissionais.defs.ts",
      "l4/agendaClinica/ontology/Profissional.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Profissional"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md"
    ]
  }
] as const;
