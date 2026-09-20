/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.defs.ts" enhancement="_blank"/>

export const updateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "updateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "updateAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "updateAtendente",
        "inputTypeName": "UpdateAtendenteInput",
        "outputTypeName": "UpdateAtendenteOutput",
        "input": [
          {
            "name": "atendenteId",
            "type": "string",
            "required": true,
            "description": "Identificador estável do atendente reutilizado entre os módulos da organização.",
            "ofEntity": "Atendente",
            "fieldRef": "Atendente.atendenteId",
            "item": {
              "fields": []
            }
          },
          {
            "name": "platformUserId",
            "type": "string",
            "required": true,
            "description": "Referência ao usuário correspondente no diretório da plataforma, sem duplicar dados de login.",
            "ofEntity": "Atendente",
            "fieldRef": "Atendente.platformUserId",
            "item": {
              "fields": []
            }
          }
        ],
        "output": [
          {
            "name": "atendenteId",
            "type": "string",
            "required": true,
            "ofEntity": "Atendente"
          },
          {
            "name": "platformUserId",
            "type": "string",
            "required": true,
            "ofEntity": "Atendente"
          }
        ],
        "ports": [],
        "rulesApplied": [],
        "transactional": true,
        "steps": [
          "Load the Atendente master-data record by atendenteId through ctx.mdm.entity.get.",
          "Update platformUserId through ctx.mdm.entity.update using the Atendente master-data identifier and module details when applicable.",
          "Return atendenteId and platformUserId matching the canonical output shape."
        ],
        "outputShape": {
          "kind": "object",
          "fields": [
            {
              "name": "atendenteId",
              "type": "string",
              "required": true,
              "fieldRef": "Atendente.atendenteId"
            },
            {
              "name": "platformUserId",
              "type": "string",
              "required": true,
              "fieldRef": "Atendente.platformUserId"
            }
          ]
        }
      }
    ],
    "mdmRefs": [
      "Atendente"
    ]
  }
} as const;

export default updateAtendenteUsecase;

export const pipeline = [
  {
    "id": "updateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.defs.ts",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/applicationUsecase.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
