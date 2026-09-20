/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentarioRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const comentarioRepositoryAdapter = {
  "schemaVersion": "2026-06-26",
  "artifactType": "repositoryAdapter",
  "artifactId": "ComentarioRepositoryAdapter",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbRepositoryAdapter",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Comentario",
    "className": "ComentarioRepositoryAdapter",
    "portRef": "IComentarioRepository",
    "tableRef": "comentarios",
    "mdmReads": [
      "Resolve atendenteId through ctx.mdm.collection.listByType/getMany/hydrateMany/relatedOfMany as appropriate for the canonical Atendente type; never call ctx.mdm.entity.get inside a loop. Persist only atendente_id locally and do not create a local MDM table."
    ],
    "notes": [
      "Implement async delete(id), getById(id), list(filter?), and save(aggregate) using only ctx.data.moduleData.getTable<Row>('comentarios').",
      "Map columns comentarioId -> comentario_id, chamadoId -> chamado_id, and atendenteId -> atendente_id; map details.conteudo with the verbatim camelCase JSONB key.",
      "Bulk-resolve distinct atendenteId values before mapping rows; use the collection APIs and attach the resolved Atendente representation expected by the domain without inventing entityId/entityType or relationship columns.",
      "save writes only comentario_id, chamado_id, atendente_id, and details; details must contain conteudo and no snake_case JSONB keys.",
      "Apply filter.sortBy/sortOrder with orderBy for non-enum fields; enum fields, if declared by the domain, must be sorted in memory by declared enum order. Search must use a real title/name column only if one is declared; otherwise do not invent one.",
      "Implement every port method: delete, getById, list, save."
    ],
    "portMethods": [
      "delete",
      "getById",
      "list",
      "save"
    ]
  }
} as const;

export default comentarioRepositoryAdapter;

export const pipeline = [
  {
    "id": "comentarioRepositoryAdapter__repositoryAdapter",
    "type": "repositoryAdapter",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentarioRepositoryAdapter.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentarioRepositoryAdapter.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.d.ts",
      "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/comentario.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/repositoryAdapter.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
