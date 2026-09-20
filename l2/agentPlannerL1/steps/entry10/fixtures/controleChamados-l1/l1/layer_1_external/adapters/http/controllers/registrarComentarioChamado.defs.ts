/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/registrarComentarioChamado.defs.ts" enhancement="_blank"/>

export const registrarComentarioChamadoController = {
  "schemaVersion": "2026-06-26",
  "artifactType": "httpController",
  "artifactId": "registrarComentarioChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbHttpController",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "pageId": "registrarComentarioChamado",
    "controllerName": "RegistrarComentarioChamadoController",
    "ownerKind": "workspace",
    "workspaceId": "registrarComentarioChamado",
    "actors": [
      "atendente"
    ],
    "allowedScopes": [
      "internal"
    ],
    "handlers": [
      {
        "handlerName": "registrarComentarioChamadoQryLocateChamadoHandler",
        "command": "qryLocateChamado",
        "bffId": "qryLocateChamado",
        "route": "controleChamados.registrarComentarioChamado.qryLocateChamado",
        "kind": "query",
        "usecaseRef": "locateChamado",
        "usecaseRefs": [
          "locateChamado"
        ],
        "inputTypeName": "LocateChamadoInput",
        "inputContract": [],
        "projection": {
          "kind": "list",
          "arrayFieldName": null,
          "itemFields": [
            {
              "name": "chamadoId",
              "operationId": "locateChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": true
            },
            {
              "name": "titulo",
              "operationId": "locateChamado",
              "path": [
                "titulo"
              ],
              "fromItems": true
            },
            {
              "name": "descricao",
              "operationId": "locateChamado",
              "path": [
                "descricao"
              ],
              "fromItems": true
            },
            {
              "name": "status",
              "operationId": "locateChamado",
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
        "handlerName": "registrarComentarioChamadoCmdRegisterComentarioHandler",
        "command": "cmdRegisterComentario",
        "bffId": "cmdRegisterComentario",
        "route": "controleChamados.registrarComentarioChamado.cmdRegisterComentario",
        "kind": "command",
        "usecaseRef": "registerComentario",
        "usecaseRefs": [
          "registerComentario"
        ],
        "inputTypeName": "RegisterComentarioInput",
        "inputContract": [
          {
            "inputId": "atendenteId",
            "fieldRef": "Atendente.atendenteId",
            "required": true,
            "source": "selectedEntity",
            "description": "Atendente"
          },
          {
            "inputId": "chamadoId",
            "fieldRef": "Chamado.chamadoId",
            "required": true,
            "source": "routeParam",
            "description": "Chamado"
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
              "operationId": "registerComentario",
              "path": [
                "comentarioId"
              ],
              "fromItems": false
            },
            {
              "name": "chamadoId",
              "operationId": "registerComentario",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "atendenteId",
              "operationId": "registerComentario",
              "path": [
                "atendenteId"
              ],
              "fromItems": false
            },
            {
              "name": "conteudo",
              "operationId": "registerComentario",
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
        "handlerName": "registrarComentarioChamadoQryAtendentePickerHandler",
        "command": "qryAtendentePicker",
        "bffId": "qryAtendentePicker",
        "route": "controleChamados.registrarComentarioChamado.qryAtendentePicker",
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
        "key": "controleChamados.registrarComentarioChamado.qryLocateChamado",
        "handlerName": "registrarComentarioChamadoQryLocateChamadoHandler"
      },
      {
        "key": "controleChamados.registrarComentarioChamado.cmdRegisterComentario",
        "handlerName": "registrarComentarioChamadoCmdRegisterComentarioHandler"
      },
      {
        "key": "controleChamados.registrarComentarioChamado.qryAtendentePicker",
        "handlerName": "registrarComentarioChamadoQryAtendentePickerHandler"
      }
    ]
  }
} as const;

export default registrarComentarioChamadoController;

export const pipeline = [
  {
    "id": "registrarComentarioChamado__httpController",
    "type": "httpController",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/registrarComentarioChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/registrarComentarioChamado.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/usecases/locateChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/registrarComentarioChamado--qryLocateChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.d.ts",
      "_102039_/l4/controleChamados/contracts/registrarComentarioChamado--cmdRegisterComentario.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.d.ts",
      "_102039_/l4/controleChamados/contracts/registrarComentarioChamado--qryAtendentePicker.defs.ts"
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
