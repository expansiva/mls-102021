/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.defs.ts" enhancement="_blank"/>

export const comentarioRepositoryPort = {
  "schemaVersion": "2026-06-26",
  "artifactType": "repositoryPort",
  "artifactId": "ComentarioRepository",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbRepositoryPort",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Comentario",
    "interfaceName": "IComentarioRepository",
    "methods": [
      {
        "name": "getById",
        "params": [
          "id: ComentarioId"
        ],
        "returns": "Comentario | null",
        "description": "Retrieves a Comentario aggregate by its identifier."
      },
      {
        "name": "list",
        "params": [
          "filter: ComentarioListFilter"
        ],
        "returns": "Comentario[]",
        "description": "Lists Comentario aggregates matching equality filters and optional search/sort controls."
      },
      {
        "name": "save",
        "params": [
          "aggregate: Comentario"
        ],
        "returns": "void",
        "description": "Persists a Comentario aggregate."
      },
      {
        "name": "delete",
        "params": [
          "id: ComentarioId"
        ],
        "returns": "void",
        "description": "Deletes a Comentario aggregate by its identifier."
      }
    ],
    "requiredMethods": [
      "delete"
    ]
  }
} as const;

export default comentarioRepositoryPort;

export const pipeline = [
  {
    "id": "comentarioRepository__repositoryPort",
    "type": "repositoryPort",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/repositoryPort.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
