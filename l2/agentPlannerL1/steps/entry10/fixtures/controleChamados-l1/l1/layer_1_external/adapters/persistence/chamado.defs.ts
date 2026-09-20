/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamado.defs.ts" enhancement="_blank"/>

export const chamadoTableDefinition = {
  "schemaVersion": "2026-06-26",
  "artifactType": "table",
  "artifactId": "Chamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbPersistenceTable",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "tableId": "Chamado",
    "tableName": "controlechamados_chamado",
    "columns": [
      {
        "name": "chamado_id",
        "type": "uuid",
        "nullable": false,
        "description": "Primary key / foreign key identifier"
      },
      {
        "name": "status",
        "type": "text",
        "nullable": false,
        "description": "Chamado status"
      }
    ],
    "primaryKey": [
      "chamado_id"
    ],
    "indexes": [
      {
        "indexName": "controlechamados_chamado_status_idx",
        "columns": [
          "status"
        ],
        "unique": false
      }
    ],
    "detailsColumn": {
      "enabled": true,
      "columnName": "details",
      "childCollections": []
    },
    "appendOnly": false,
    "purpose": "controle",
    "retentionDays": 0
  }
} as const;

export default chamadoTableDefinition;

export const pipeline = [
  {
    "id": "chamado__persistenceTable",
    "type": "persistenceTable",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamado.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/persistenceTable.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
