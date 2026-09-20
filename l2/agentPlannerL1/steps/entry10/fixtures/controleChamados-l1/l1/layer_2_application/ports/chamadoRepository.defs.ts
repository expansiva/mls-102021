/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.defs.ts" enhancement="_blank"/>

export const chamadoRepositoryPort = {
  "schemaVersion": "2026-06-26",
  "artifactType": "repositoryPort",
  "artifactId": "ChamadoRepository",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbRepositoryPort",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Chamado",
    "interfaceName": "IChamadoRepository",
    "methods": [
      {
        "name": "getById",
        "params": [
          "id: ChamadoId"
        ],
        "returns": "Chamado | null",
        "description": "Retrieves a Chamado aggregate by its identifier."
      },
      {
        "name": "list",
        "params": [
          "filter: ChamadoListFilter"
        ],
        "returns": "Chamado[]",
        "description": "Lists Chamado aggregates matching equality filters and optional search/sort controls."
      },
      {
        "name": "save",
        "params": [
          "aggregate: Chamado"
        ],
        "returns": "void",
        "description": "Persists a Chamado aggregate."
      },
      {
        "name": "delete",
        "params": [
          "id: ChamadoId"
        ],
        "returns": "void",
        "description": "Deletes a Chamado aggregate by its identifier."
      }
    ],
    "requiredMethods": [
      "delete"
    ]
  }
} as const;

export default chamadoRepositoryPort;

export const pipeline = [
  {
    "id": "chamadoRepository__repositoryPort",
    "type": "repositoryPort",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
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
