/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentario.defs.ts" enhancement="_blank"/>

export const comentarioTableDefinition = {
  "schemaVersion": "2026-06-26",
  "artifactType": "table",
  "artifactId": "Comentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbPersistenceTable",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "tableId": "Comentario",
    "tableName": "controlechamados_comentario",
    "columns": [
      {
        "name": "comentario_id",
        "type": "uuid",
        "nullable": false,
        "description": "Primary key / foreign key identifier"
      },
      {
        "name": "chamado_id",
        "type": "uuid",
        "nullable": false,
        "description": "Chamado foreign key"
      },
      {
        "name": "atendente_id",
        "type": "uuid",
        "nullable": false,
        "description": "Atendente foreign key"
      }
    ],
    "primaryKey": [
      "comentario_id"
    ],
    "indexes": [
      {
        "indexName": "controlechamados_comentario_chamado_id_idx",
        "columns": [
          "chamado_id"
        ],
        "unique": false
      },
      {
        "indexName": "controlechamados_comentario_atendente_id_idx",
        "columns": [
          "atendente_id"
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

export default comentarioTableDefinition;

export const pipeline = [
  {
    "id": "comentario__persistenceTable",
    "type": "persistenceTable",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentario.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
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
