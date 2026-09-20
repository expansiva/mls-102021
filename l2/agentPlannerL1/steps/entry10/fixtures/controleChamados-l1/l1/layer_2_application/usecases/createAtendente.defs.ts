/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.defs.ts" enhancement="_blank"/>

export const createAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "createAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "createAtendente",
    "ports": [],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createAtendente",
        "inputTypeName": "CreateAtendenteInput",
        "outputTypeName": "CreateAtendenteOutput",
        "input": [
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
          "Validate the required platformUserId input.",
          "Create the Atendente master-data entity through ctx.mdm.entity.create using mdmType controleChamados.Atendente and the platformUserId field.",
          "Return the created atendenteId and platformUserId."
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

export default createAtendenteUsecase;

export const pipeline = [
  {
    "id": "createAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.defs.ts",
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
