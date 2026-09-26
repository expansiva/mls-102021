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
        "profissionalId",
        "scheduledAt"
      ]
    ],
    "indexes": [
      {
        "name": "agendaClinica_consulta_profissionalId_scheduledAt",
        "columns": [
          "profissionalId",
          "scheduledAt"
        ],
        "unique": true
      },
      {
        "name": "agendaClinica_consulta_pacienteId",
        "columns": [
          "pacienteId"
        ],
        "unique": false
      },
      {
        "name": "agendaClinica_consulta_profissionalId",
        "columns": [
          "profissionalId"
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
