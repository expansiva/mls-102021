/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "table",
  "artifactId": "Consulta",
  "moduleName": "agendaClinica",
  "data": {
    "tableId": "consulta",
    "entityId": "Consulta",
    "physicalName": "agendaClinica_consulta",
    "primaryKey": [
      "id"
    ],
    "uniqueKeys": [
      [
        "professionalId",
        "scheduledAt"
      ]
    ],
    "indexes": [
      {
        "name": "agendaClinica_consulta_professionalId_scheduledAt",
        "columns": [
          "professionalId",
          "scheduledAt"
        ],
        "unique": true
      },
      {
        "name": "agendaClinica_consulta_patientId",
        "columns": [
          "patientId"
        ],
        "unique": false
      },
      {
        "name": "agendaClinica_consulta_professionalId",
        "columns": [
          "professionalId"
        ],
        "unique": false
      },
      {
        "name": "agendaClinica_consulta_scheduledAt",
        "columns": [
          "scheduledAt"
        ],
        "unique": false
      },
      {
        "name": "agendaClinica_consulta_status",
        "columns": [
          "status"
        ],
        "unique": false
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/table/consulta",
    "type": "table",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Consulta"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/table.md"
    ]
  }
] as const;
