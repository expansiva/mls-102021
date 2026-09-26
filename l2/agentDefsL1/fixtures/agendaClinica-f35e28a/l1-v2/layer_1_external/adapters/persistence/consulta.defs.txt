/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "table",
  "artifactId": "consulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts"
  ],
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
