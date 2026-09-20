/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamadoRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const chamadoRepositoryAdapter = {
  "schemaVersion": "2026-06-26",
  "artifactType": "repositoryAdapter",
  "artifactId": "ChamadoRepositoryAdapter",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbRepositoryAdapter",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Chamado",
    "className": "ChamadoRepositoryAdapter",
    "portRef": "IChamadoRepository",
    "tableRef": "chamados",
    "mdmReads": [],
    "notes": [
      "Implement async delete(id), getById(id), list(filter?), and save(aggregate) using only ctx.data.moduleData.getTable<Row>('chamados').",
      "Map columns chamadoId -> chamado_id and status -> status; map details.titulo and details.descricao with verbatim camelCase JSONB keys.",
      "getById/list hydrate domain aggregates from chamado_id, status, and details; save writes only real columns plus details JSONB, preserving fieldId keys.",
      "list must apply filter.sortBy/sortOrder; status must be sorted in memory by the declared domain enum order, not SQL text.",
      "The requested search behavior cannot be implemented against a real title/name column because Chamado declares no title/name column and titulo is a details field; do not invent a table column or snake_case a details key.",
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

export default chamadoRepositoryAdapter;

export const pipeline = [
  {
    "id": "chamadoRepositoryAdapter__repositoryAdapter",
    "type": "repositoryAdapter",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamadoRepositoryAdapter.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamadoRepositoryAdapter.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.d.ts",
      "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/chamado.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
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
