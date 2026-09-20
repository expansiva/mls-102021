/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/atendenteCatalogue.defs.ts" enhancement="_blank"/>

export const atendenteCatalogueController = {
  "schemaVersion": "2026-06-26",
  "artifactType": "httpController",
  "artifactId": "atendenteCatalogue",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbHttpController",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "pageId": "atendenteCatalogue",
    "controllerName": "AtendenteCatalogueController",
    "ownerKind": "workspace",
    "workspaceId": "atendenteCatalogue",
    "actors": [
      "atendente"
    ],
    "allowedScopes": [
      "internal"
    ],
    "handlers": [
      {
        "handlerName": "atendenteCatalogueQryListAtendenteHandler",
        "command": "qryListAtendente",
        "bffId": "qryListAtendente",
        "route": "controleChamados.atendenteCatalogue.qryListAtendente",
        "kind": "query",
        "usecaseRef": "listAtendente",
        "usecaseRefs": [
          "listAtendente"
        ],
        "inputTypeName": "ListAtendenteInput",
        "inputContract": [
          {
            "inputId": "includeInactive",
            "fieldRef": "",
            "type": "boolean",
            "required": false,
            "source": "userInput",
            "description": "Include records inactivated in the MDM index (default: only active ones)."
          }
        ],
        "projection": {
          "kind": "list",
          "arrayFieldName": null,
          "itemFields": [
            {
              "name": "atendenteId",
              "operationId": "listAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": true
            },
            {
              "name": "platformUserId",
              "operationId": "listAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": true
            }
          ],
          "topFields": []
        },
        "optionalUses": []
      },
      {
        "handlerName": "atendenteCatalogueCmdCreateAtendenteHandler",
        "command": "cmdCreateAtendente",
        "bffId": "cmdCreateAtendente",
        "route": "controleChamados.atendenteCatalogue.cmdCreateAtendente",
        "kind": "command",
        "usecaseRef": "createAtendente",
        "usecaseRefs": [
          "createAtendente"
        ],
        "inputTypeName": "CreateAtendenteInput",
        "inputContract": [
          {
            "inputId": "platformUserId",
            "fieldRef": "Atendente.platformUserId",
            "required": true,
            "source": "userInput",
            "description": "Referência ao usuário correspondente no diretório da plataforma, sem duplicar dados de login."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "atendenteId",
              "operationId": "createAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "platformUserId",
              "operationId": "createAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "atendenteCatalogueCmdUpdateAtendenteHandler",
        "command": "cmdUpdateAtendente",
        "bffId": "cmdUpdateAtendente",
        "route": "controleChamados.atendenteCatalogue.cmdUpdateAtendente",
        "kind": "command",
        "usecaseRef": "updateAtendente",
        "usecaseRefs": [
          "updateAtendente"
        ],
        "inputTypeName": "UpdateAtendenteInput",
        "inputContract": [
          {
            "inputId": "atendenteId",
            "fieldRef": "Atendente.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do atendente reutilizado entre os módulos da organização."
          },
          {
            "inputId": "platformUserId",
            "fieldRef": "Atendente.platformUserId",
            "required": true,
            "source": "userInput",
            "description": "Referência ao usuário correspondente no diretório da plataforma, sem duplicar dados de login."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "atendenteId",
              "operationId": "updateAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "platformUserId",
              "operationId": "updateAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "atendenteCatalogueCmdInactivateAtendenteHandler",
        "command": "cmdInactivateAtendente",
        "bffId": "cmdInactivateAtendente",
        "route": "controleChamados.atendenteCatalogue.cmdInactivateAtendente",
        "kind": "command",
        "usecaseRef": "inactivateAtendente",
        "usecaseRefs": [
          "inactivateAtendente"
        ],
        "inputTypeName": "InactivateAtendenteInput",
        "inputContract": [
          {
            "inputId": "atendenteId",
            "fieldRef": "Atendente.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do atendente reutilizado entre os módulos da organização."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "atendenteId",
              "operationId": "inactivateAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "platformUserId",
              "operationId": "inactivateAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "atendenteCatalogueCmdReactivateAtendenteHandler",
        "command": "cmdReactivateAtendente",
        "bffId": "cmdReactivateAtendente",
        "route": "controleChamados.atendenteCatalogue.cmdReactivateAtendente",
        "kind": "command",
        "usecaseRef": "reactivateAtendente",
        "usecaseRefs": [
          "reactivateAtendente"
        ],
        "inputTypeName": "ReactivateAtendenteInput",
        "inputContract": [
          {
            "inputId": "atendenteId",
            "fieldRef": "Atendente.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do atendente reutilizado entre os módulos da organização."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "atendenteId",
              "operationId": "reactivateAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "platformUserId",
              "operationId": "reactivateAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "atendenteCatalogueQryGetAtendenteHandler",
        "command": "qryGetAtendente",
        "bffId": "qryGetAtendente",
        "route": "controleChamados.atendenteCatalogue.qryGetAtendente",
        "kind": "query",
        "usecaseRef": "getAtendente",
        "usecaseRefs": [
          "getAtendente"
        ],
        "inputTypeName": "GetAtendenteInput",
        "inputContract": [
          {
            "inputId": "atendenteId",
            "fieldRef": "Atendente.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do atendente reutilizado entre os módulos da organização."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "atendenteId",
              "operationId": "getAtendente",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "platformUserId",
              "operationId": "getAtendente",
              "path": [
                "platformUserId"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      }
    ],
    "routes": [
      {
        "key": "controleChamados.atendenteCatalogue.qryListAtendente",
        "handlerName": "atendenteCatalogueQryListAtendenteHandler"
      },
      {
        "key": "controleChamados.atendenteCatalogue.cmdCreateAtendente",
        "handlerName": "atendenteCatalogueCmdCreateAtendenteHandler"
      },
      {
        "key": "controleChamados.atendenteCatalogue.cmdUpdateAtendente",
        "handlerName": "atendenteCatalogueCmdUpdateAtendenteHandler"
      },
      {
        "key": "controleChamados.atendenteCatalogue.cmdInactivateAtendente",
        "handlerName": "atendenteCatalogueCmdInactivateAtendenteHandler"
      },
      {
        "key": "controleChamados.atendenteCatalogue.cmdReactivateAtendente",
        "handlerName": "atendenteCatalogueCmdReactivateAtendenteHandler"
      },
      {
        "key": "controleChamados.atendenteCatalogue.qryGetAtendente",
        "handlerName": "atendenteCatalogueQryGetAtendenteHandler"
      }
    ]
  }
} as const;

export default atendenteCatalogueController;

export const pipeline = [
  {
    "id": "atendenteCatalogue__httpController",
    "type": "httpController",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/atendenteCatalogue.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/atendenteCatalogue.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--qryListAtendente.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--cmdCreateAtendente.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--cmdUpdateAtendente.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--cmdInactivateAtendente.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--cmdReactivateAtendente.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/atendenteCatalogue--qryGetAtendente.defs.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/httpController.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
