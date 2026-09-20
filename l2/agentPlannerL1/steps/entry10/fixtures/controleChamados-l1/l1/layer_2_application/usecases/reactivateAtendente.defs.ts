/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.defs.ts" enhancement="_blank"/>

export const reactivateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "reactivateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "reactivateAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "reactivateAtendente",
        "inputTypeName": "ReactivateAtendenteInput",
        "outputTypeName": "ReactivateAtendenteOutput",
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
          "Load the Atendente master-data record by atendenteId through ctx.mdm.entity.get({ mdmId: atendenteId }).",
          "If the record does not exist, fail with a machine-readable not-found error and an English user-facing message.",
          "Reactivate the Atendente master-data record through the MDM lifecycle operation, using ctx.mdm.entity.update within the single transaction wrapper provided by ctx.data; do not create a local repository or port for this MDM entity.",
          "Return the reactivated record's atendenteId and platformUserId in the canonical output shape."
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
    ],
    "mdm": {
      "lifecycle": "reactivate"
    }
  }
} as const;

export default reactivateAtendenteUsecase;

export const pipeline = [
  {
    "id": "reactivateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.defs.ts",
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
