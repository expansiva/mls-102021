/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "createProfissional",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "createProfissional",
    "entityId": "Profissional",
    "operation": "create",
    "ports": [],
    "rulesApplied": [
      "rule-foreign-namespace-refused",
      "rule-document-shape-validated",
      "rule-identity-never-in-namespace",
      "rule-person-privacy-consent-required-br-eu"
    ],
    "functions": [
      {
        "functionName": "createProfissional",
        "input": [
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
            "route": "agendaClinica.dados_profissional.cmdCreateProfissional",
            "symbol": "CreateProfissionalOutput"
          },
          {
            "route": "agendaClinica.dados_recepcionista.cmdCreateProfissional",
            "symbol": "CreateProfissionalOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.dados_profissional.cmdCreateProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdCreateProfissional",
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
        "ruleId": "rule-person-privacy-consent-required-br-eu"
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
      "role": "agendaClinica.Profissional",
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
          "method": "create",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
          ],
          "alternative": false,
          "arguments": [
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
              "name": "occupation",
              "role": "patch",
              "capability": "register.createOrAttach",
              "path": "details.person.occupation"
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/createProfissional",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts",
      "/_102034_/l4/ontology/mdm.defs.ts",
      "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
      "l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts",
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
