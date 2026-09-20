/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.defs.ts" enhancement="_blank"/>

export const inactivateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "inactivateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "inactivateAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "inactivateAtendente",
        "inputTypeName": "InactivateAtendenteInput",
        "outputTypeName": "InactivateAtendenteOutput",
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
          "If the Atendente record does not exist, return the documented master-data not-found error.",
          "In the same transaction wrapper, inactivate the Atendente master-data record through ctx.mdm.entity.inactivate({ mdmId: atendenteId, mdmType: \"controleChamados.Atendente\" }).",
          "Return atendenteId and platformUserId from the loaded record."
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
      "lifecycle": "inactivate"
    }
  }
} as const;

export default inactivateAtendenteUsecase;

export const pipeline = [
  {
    "id": "inactivateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.defs.ts",
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
