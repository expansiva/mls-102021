/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/comentarioCatalogue.defs.ts" enhancement="_blank"/>

export const comentarioCatalogueController = {
  "schemaVersion": "2026-06-26",
  "artifactType": "httpController",
  "artifactId": "comentarioCatalogue",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbHttpController",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "pageId": "comentarioCatalogue",
    "controllerName": "ComentarioCatalogueController",
    "ownerKind": "workspace",
    "workspaceId": "comentarioCatalogue",
    "actors": [
      "atendente"
    ],
    "allowedScopes": [
      "internal"
    ],
    "handlers": [
      {
        "handlerName": "comentarioCatalogueQryListComentarioHandler",
        "command": "qryListComentario",
        "bffId": "qryListComentario",
        "route": "controleChamados.comentarioCatalogue.qryListComentario",
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
      },
      {
        "handlerName": "comentarioCatalogueCmdCreateComentarioHandler",
        "command": "cmdCreateComentario",
        "bffId": "cmdCreateComentario",
        "route": "controleChamados.comentarioCatalogue.cmdCreateComentario",
        "kind": "command",
        "usecaseRef": "createComentario",
        "usecaseRefs": [
          "createComentario"
        ],
        "inputTypeName": "CreateComentarioInput",
        "inputContract": [
          {
            "inputId": "chamadoId",
            "fieldRef": "Comentario.chamadoId",
            "required": true,
            "source": "selectedEntity",
            "description": "Chamado aberto selecionado ao qual o comentário pertence."
          },
          {
            "inputId": "atendenteId",
            "fieldRef": "Comentario.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Atendente autenticado identificado como responsável pelo registro do comentário."
          },
          {
            "inputId": "conteudo",
            "fieldRef": "Comentario.conteudo",
            "required": true,
            "source": "userInput",
            "description": "Texto de acompanhamento escrito pelo atendente para o chamado."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "comentarioId",
              "operationId": "createComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": false
            },
            {
              "name": "chamadoId",
              "operationId": "createComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "atendenteId",
              "operationId": "createComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "conteudo",
              "operationId": "createComentario",
              "path": [
                "conteudo"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "comentarioCatalogueCmdUpdateComentarioHandler",
        "command": "cmdUpdateComentario",
        "bffId": "cmdUpdateComentario",
        "route": "controleChamados.comentarioCatalogue.cmdUpdateComentario",
        "kind": "command",
        "usecaseRef": "updateComentario",
        "usecaseRefs": [
          "updateComentario"
        ],
        "inputTypeName": "UpdateComentarioInput",
        "inputContract": [
          {
            "inputId": "comentarioId",
            "fieldRef": "Comentario.comentarioId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do comentário persistido no histórico de acompanhamento."
          },
          {
            "inputId": "chamadoId",
            "fieldRef": "Comentario.chamadoId",
            "required": true,
            "source": "selectedEntity",
            "description": "Chamado aberto selecionado ao qual o comentário pertence."
          },
          {
            "inputId": "atendenteId",
            "fieldRef": "Comentario.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Atendente autenticado identificado como responsável pelo registro do comentário."
          },
          {
            "inputId": "conteudo",
            "fieldRef": "Comentario.conteudo",
            "required": true,
            "source": "userInput",
            "description": "Texto de acompanhamento escrito pelo atendente para o chamado."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "comentarioId",
              "operationId": "updateComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": false
            },
            {
              "name": "chamadoId",
              "operationId": "updateComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "atendenteId",
              "operationId": "updateComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "conteudo",
              "operationId": "updateComentario",
              "path": [
                "conteudo"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "comentarioCatalogueCmdDeleteComentarioHandler",
        "command": "cmdDeleteComentario",
        "bffId": "cmdDeleteComentario",
        "route": "controleChamados.comentarioCatalogue.cmdDeleteComentario",
        "kind": "command",
        "usecaseRef": "deleteComentario",
        "usecaseRefs": [
          "deleteComentario"
        ],
        "inputTypeName": "DeleteComentarioInput",
        "inputContract": [
          {
            "inputId": "comentarioId",
            "fieldRef": "Comentario.comentarioId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do comentário persistido no histórico de acompanhamento."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "comentarioId",
              "operationId": "deleteComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": false
            },
            {
              "name": "chamadoId",
              "operationId": "deleteComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "atendenteId",
              "operationId": "deleteComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "conteudo",
              "operationId": "deleteComentario",
              "path": [
                "conteudo"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "comentarioCatalogueQryGetComentarioHandler",
        "command": "qryGetComentario",
        "bffId": "qryGetComentario",
        "route": "controleChamados.comentarioCatalogue.qryGetComentario",
        "kind": "query",
        "usecaseRef": "getComentario",
        "usecaseRefs": [
          "getComentario"
        ],
        "inputTypeName": "GetComentarioInput",
        "inputContract": [
          {
            "inputId": "comentarioId",
            "fieldRef": "Comentario.comentarioId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do comentário persistido no histórico de acompanhamento."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "comentarioId",
              "operationId": "getComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": false
            },
            {
              "name": "chamadoId",
              "operationId": "getComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "atendenteId",
              "operationId": "getComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "conteudo",
              "operationId": "getComentario",
              "path": [
                "conteudo"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "comentarioCatalogueQryChamadoPickerHandler",
        "command": "qryChamadoPicker",
        "bffId": "qryChamadoPicker",
        "route": "controleChamados.comentarioCatalogue.qryChamadoPicker",
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
        "handlerName": "comentarioCatalogueQryAtendentePickerHandler",
        "command": "qryAtendentePicker",
        "bffId": "qryAtendentePicker",
        "route": "controleChamados.comentarioCatalogue.qryAtendentePicker",
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
      }
    ],
    "routes": [
      {
        "key": "controleChamados.comentarioCatalogue.qryListComentario",
        "handlerName": "comentarioCatalogueQryListComentarioHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.cmdCreateComentario",
        "handlerName": "comentarioCatalogueCmdCreateComentarioHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.cmdUpdateComentario",
        "handlerName": "comentarioCatalogueCmdUpdateComentarioHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.cmdDeleteComentario",
        "handlerName": "comentarioCatalogueCmdDeleteComentarioHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.qryGetComentario",
        "handlerName": "comentarioCatalogueQryGetComentarioHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.qryChamadoPicker",
        "handlerName": "comentarioCatalogueQryChamadoPickerHandler"
      },
      {
        "key": "controleChamados.comentarioCatalogue.qryAtendentePicker",
        "handlerName": "comentarioCatalogueQryAtendentePickerHandler"
      }
    ]
  }
} as const;

export default comentarioCatalogueController;

export const pipeline = [
  {
    "id": "comentarioCatalogue__httpController",
    "type": "httpController",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/comentarioCatalogue.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/comentarioCatalogue.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/usecases/listComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--qryListComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/createComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--cmdCreateComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/updateComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--cmdUpdateComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--cmdDeleteComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/getComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--qryGetComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--qryChamadoPicker.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/comentarioCatalogue--qryAtendentePicker.defs.ts"
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
