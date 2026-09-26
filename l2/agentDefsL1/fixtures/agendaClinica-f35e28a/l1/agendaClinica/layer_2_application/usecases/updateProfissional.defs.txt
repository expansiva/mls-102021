/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "updateProfissional",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "updateProfissional",
    "entityId": "Profissional",
    "operation": "update",
    "ports": [],
    "rulesApplied": [
      "rule-foreign-namespace-refused",
      "rule-document-shape-validated",
      "rule-identity-never-in-namespace",
      "rule-person-privacy-consent-required-br-eu"
    ],
    "functions": [
      {
        "functionName": "updateProfissional",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Profissional.id"
          },
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
            "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
            "symbol": "UpdateProfissionalOutput"
          },
          {
            "route": "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
            "symbol": "UpdateProfissionalOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
        "contractPath": "l2/agendaClinica/web/contracts/dados_profissional.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "details"
        ]
      },
      {
        "route": "agendaClinica.dados_recepcionista.cmdUpdateProfissional",
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
        "call": "update",
        "entity": "Profissional",
        "capability": "edit.platformFields"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
        "source": "input"
      }
    ],
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
      "atomic": true,
      "calls": [
        {
          "method": "update",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "edit.platformFields"
          ],
          "alternative": false,
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
              "path": "id"
            },
            {
              "name": "expectedVersion",
              "role": "parameter",
              "path": "version"
            },
            {
              "name": "countryCode",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.identification.countryCode"
            },
            {
              "name": "docId",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.identification.docId"
            },
            {
              "name": "docType",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.identification.docType"
            },
            {
              "name": "name",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.identification.name"
            },
            {
              "name": "occupation",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.person.occupation"
            },
            {
              "name": "privacyConsent",
              "role": "patch",
              "capability": "edit.platformFields",
              "path": "details.person.privacyConsent"
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/updateProfissional",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.ts",
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
