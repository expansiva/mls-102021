/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.ts" enhancement="_blank"/>
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinition = {
  "moduleId": "agendaClinica",
  "repositoryName": "consulta",
  "tableName": "agendaClinica_consulta",
  "purpose": "transacao",
  "description": "agendaClinica_consulta",
  "backupHot": false,
  "storageProfile": "postgres",
  "writeMode": "sync",
  "columns": [
    {
      "name": "id",
      "postgresType": "TEXT"
    },
    {
      "name": "pacienteId",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "profissionalId",
      "postgresType": "TEXT"
    },
    {
      "name": "scheduledAt",
      "postgresType": "TIMESTAMPTZ"
    },
    {
      "name": "status",
      "postgresType": "TEXT",
      "nullable": true
    },
    {
      "name": "details",
      "postgresType": "JSONB",
      "defaultSql": "'{}'::jsonb"
    }
  ],
  "primaryKey": [
    "id"
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
      ]
    },
    {
      "name": "agendaClinica_consulta_profissionalId",
      "columns": [
        "profissionalId"
      ]
    },
    {
      "name": "agendaClinica_consulta_scheduledAt",
      "columns": [
        "scheduledAt"
      ]
    },
    {
      "name": "agendaClinica_consulta_status",
      "columns": [
        "status"
      ]
    }
  ],
  "version": 1
} satisfies TableDefinition;

export const migrationPlan = {
  "format": "102034-schema-snapshot",
  "applied": false,
  "steps": [
    {
      "op": "createTable",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta"
    },
    {
      "op": "createIndex",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta_profissionalId_scheduledAt"
    },
    {
      "op": "createIndex",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta_pacienteId"
    },
    {
      "op": "createIndex",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta_profissionalId"
    },
    {
      "op": "createIndex",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta_scheduledAt"
    },
    {
      "op": "createIndex",
      "tableName": "agendaClinica_consulta",
      "name": "agendaClinica_consulta_status"
    }
  ],
  "blocked": []
} as const;
