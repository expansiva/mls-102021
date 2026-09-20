/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.defs.ts" enhancement="_blank"/>

export const listAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "listAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "listAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listAtendente",
        "inputTypeName": "ListAtendenteInput",
        "outputTypeName": "ListAtendenteOutput",
        "input": [
          {
            "name": "includeInactive",
            "type": "boolean",
            "required": false,
            "description": "Include records inactivated in the MDM index; defaults to active records only.",
            "ofEntity": "",
            "fieldRef": "",
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
          "List Atendente records through ctx.mdm.collection.listByType using type controleChamados.Atendente.",
          "By default request active records only; when includeInactive is true, include inactivated records from the MDM index.",
          "Return only atendenteId and platformUserId for each record."
        ],
        "outputShape": {
          "kind": "list",
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
      "activeFilterInput": "includeInactive",
      "situationOutput": "active"
    }
  }
} as const;

export default listAtendenteUsecase;

export const pipeline = [
  {
    "id": "listAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.defs.ts",
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
