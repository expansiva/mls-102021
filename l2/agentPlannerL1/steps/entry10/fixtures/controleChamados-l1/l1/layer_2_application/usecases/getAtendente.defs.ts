/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.defs.ts" enhancement="_blank"/>

export const getAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "getAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "getAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getAtendente",
        "inputTypeName": "GetAtendenteInput",
        "outputTypeName": "GetAtendenteOutput",
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
        "transactional": false,
        "steps": [
          "Read the Atendente master-data record by atendenteId through ctx.mdm.entity.get({ mdmId: atendenteId }).",
          "Return atendenteId and platformUserId from the retrieved Atendente record.",
          "If no record is found, return the platform's standard not-found result."
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
      "situationOutput": "active"
    }
  }
} as const;

export default getAtendenteUsecase;

export const pipeline = [
  {
    "id": "getAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.defs.ts",
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
