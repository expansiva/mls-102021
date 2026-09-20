/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoHub.defs.ts" enhancement="_blank"/>

export const chamadoHubController = {
  "schemaVersion": "2026-06-26",
  "artifactType": "httpController",
  "artifactId": "chamadoHub",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbHttpController",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "pageId": "chamadoHub",
    "controllerName": "ChamadoHubController",
    "ownerKind": "workspace",
    "workspaceId": "chamadoHub",
    "actors": [
      "atendente"
    ],
    "allowedScopes": [
      "internal"
    ],
    "handlers": [
      {
        "handlerName": "chamadoHubQryListChamadoHandler",
        "command": "qryListChamado",
        "bffId": "qryListChamado",
        "route": "controleChamados.chamadoHub.qryListChamado",
        "kind": "query",
        "usecaseRef": "listChamado",
        "usecaseRefs": [
          "listChamado"
        ],
        "inputTypeName": "ListChamadoInput",
        "inputContract": [
          {
            "inputId": "sortBy",
            "fieldRef": "Chamado.status",
            "required": false,
            "source": "userInput",
            "description": "Campo de ordenação da listagem.",
            "enumValues": [
              "status"
            ]
          },
          {
            "inputId": "sortOrder",
            "fieldRef": "Chamado.status",
            "required": false,
            "source": "userInput",
            "description": "Direção da ordenação.",
            "enumValues": [
              "asc",
              "desc"
            ]
          }
        ],
        "projection": {
          "kind": "list",
          "arrayFieldName": null,
          "itemFields": [
            {
              "name": "chamadoId",
              "operationId": "listChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": true
            },
            {
              "name": "titulo",
              "operationId": "listChamado",
              "path": [
                "titulo"
              ],
              "fromItems": true
            },
            {
              "name": "descricao",
              "operationId": "listChamado",
              "path": [
                "descricao"
              ],
              "fromItems": true
            },
            {
              "name": "status",
              "operationId": "listChamado",
              "path": [
                "status"
              ],
              "fromItems": true
            }
          ],
          "topFields": []
        },
        "optionalUses": []
      },
      {
        "handlerName": "chamadoHubQryListComentarioHandler",
        "command": "qryListComentario",
        "bffId": "qryListComentario",
        "route": "controleChamados.chamadoHub.qryListComentario",
        "kind": "query",
        "usecaseRef": "listComentario",
        "usecaseRefs": [
          "listComentario"
        ],
        "inputTypeName": "ListComentarioInput",
        "inputContract": [],
        "projection": {
          "kind": "list",
          "arrayFieldName": null,
          "itemFields": [
            {
              "name": "comentarioId",
              "operationId": "listComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": true
            },
            {
              "name": "chamadoId",
              "operationId": "listComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": true
            },
            {
              "name": "atendenteId",
              "operationId": "listComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": true
            },
            {
              "name": "conteudo",
              "operationId": "listComentario",
              "path": [
                "conteudo"
              ],
              "fromItems": true
            }
          ],
          "topFields": []
        },
        "optionalUses": []
      }
    ],
    "routes": [
      {
        "key": "controleChamados.chamadoHub.qryListChamado",
        "handlerName": "chamadoHubQryListChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoHub.qryListComentario",
        "handlerName": "chamadoHubQryListComentarioHandler"
      }
    ]
  }
} as const;

export default chamadoHubController;

export const pipeline = [
  {
    "id": "chamadoHub__httpController",
    "type": "httpController",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoHub.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoHub.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoHub--qryListChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/listComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoHub--qryListComentario.defs.ts"
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
