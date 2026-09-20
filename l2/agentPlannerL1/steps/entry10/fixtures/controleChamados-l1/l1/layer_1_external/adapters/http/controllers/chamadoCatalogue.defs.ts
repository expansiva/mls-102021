/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoCatalogue.defs.ts" enhancement="_blank"/>

export const chamadoCatalogueController = {
  "schemaVersion": "2026-06-26",
  "artifactType": "httpController",
  "artifactId": "chamadoCatalogue",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbHttpController",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "pageId": "chamadoCatalogue",
    "controllerName": "ChamadoCatalogueController",
    "ownerKind": "workspace",
    "workspaceId": "chamadoCatalogue",
    "actors": [
      "atendente"
    ],
    "allowedScopes": [
      "internal"
    ],
    "handlers": [
      {
        "handlerName": "chamadoCatalogueQryListChamadoHandler",
        "command": "qryListChamado",
        "bffId": "qryListChamado",
        "route": "controleChamados.chamadoCatalogue.qryListChamado",
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
        "handlerName": "chamadoCatalogueCmdCreateChamadoHandler",
        "command": "cmdCreateChamado",
        "bffId": "cmdCreateChamado",
        "route": "controleChamados.chamadoCatalogue.cmdCreateChamado",
        "kind": "command",
        "usecaseRef": "createChamado",
        "usecaseRefs": [
          "createChamado"
        ],
        "inputTypeName": "CreateChamadoInput",
        "inputContract": [
          {
            "inputId": "titulo",
            "fieldRef": "Chamado.titulo",
            "required": true,
            "source": "userInput",
            "description": "Resumo do assunto ou solicitação de atendimento registrada no chamado."
          },
          {
            "inputId": "descricao",
            "fieldRef": "Chamado.descricao",
            "required": true,
            "source": "userInput",
            "description": "Detalhamento da solicitação de atendimento registrada no chamado."
          },
          {
            "inputId": "status",
            "fieldRef": "Chamado.status",
            "required": true,
            "source": "systemDefault",
            "description": "Situação atual do acompanhamento do chamado.",
            "enumValues": [
              "open",
              "closed"
            ]
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "chamadoId",
              "operationId": "createChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "titulo",
              "operationId": "createChamado",
              "path": [
                "titulo"
              ],
              "fromItems": false
            },
            {
              "name": "descricao",
              "operationId": "createChamado",
              "path": [
                "descricao"
              ],
              "fromItems": false
            },
            {
              "name": "status",
              "operationId": "createChamado",
              "path": [
                "status"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "chamadoCatalogueCmdUpdateChamadoHandler",
        "command": "cmdUpdateChamado",
        "bffId": "cmdUpdateChamado",
        "route": "controleChamados.chamadoCatalogue.cmdUpdateChamado",
        "kind": "command",
        "usecaseRef": "updateChamado",
        "usecaseRefs": [
          "updateChamado"
        ],
        "inputTypeName": "UpdateChamadoInput",
        "inputContract": [
          {
            "inputId": "chamadoId",
            "fieldRef": "Chamado.chamadoId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do chamado, transportado entre as etapas de acompanhamento."
          },
          {
            "inputId": "titulo",
            "fieldRef": "Chamado.titulo",
            "required": true,
            "source": "userInput",
            "description": "Resumo do assunto ou solicitação de atendimento registrada no chamado."
          },
          {
            "inputId": "descricao",
            "fieldRef": "Chamado.descricao",
            "required": true,
            "source": "userInput",
            "description": "Detalhamento da solicitação de atendimento registrada no chamado."
          },
          {
            "inputId": "status",
            "fieldRef": "Chamado.status",
            "required": true,
            "source": "systemDefault",
            "description": "Situação atual do acompanhamento do chamado.",
            "enumValues": [
              "open",
              "closed"
            ]
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "chamadoId",
              "operationId": "updateChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "titulo",
              "operationId": "updateChamado",
              "path": [
                "titulo"
              ],
              "fromItems": false
            },
            {
              "name": "descricao",
              "operationId": "updateChamado",
              "path": [
                "descricao"
              ],
              "fromItems": false
            },
            {
              "name": "status",
              "operationId": "updateChamado",
              "path": [
                "status"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "chamadoCatalogueCmdDeleteChamadoHandler",
        "command": "cmdDeleteChamado",
        "bffId": "cmdDeleteChamado",
        "route": "controleChamados.chamadoCatalogue.cmdDeleteChamado",
        "kind": "command",
        "usecaseRef": "deleteChamado",
        "usecaseRefs": [
          "deleteChamado"
        ],
        "inputTypeName": "DeleteChamadoInput",
        "inputContract": [
          {
            "inputId": "chamadoId",
            "fieldRef": "Chamado.chamadoId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do chamado, transportado entre as etapas de acompanhamento."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "chamadoId",
              "operationId": "deleteChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "titulo",
              "operationId": "deleteChamado",
              "path": [
                "titulo"
              ],
              "fromItems": false
            },
            {
              "name": "descricao",
              "operationId": "deleteChamado",
              "path": [
                "descricao"
              ],
              "fromItems": false
            },
            {
              "name": "status",
              "operationId": "deleteChamado",
              "path": [
                "status"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "chamadoCatalogueQryGetChamadoHandler",
        "command": "qryGetChamado",
        "bffId": "qryGetChamado",
        "route": "controleChamados.chamadoCatalogue.qryGetChamado",
        "kind": "query",
        "usecaseRef": "getChamado",
        "usecaseRefs": [
          "getChamado"
        ],
        "inputTypeName": "GetChamadoInput",
        "inputContract": [
          {
            "inputId": "chamadoId",
            "fieldRef": "Chamado.chamadoId",
            "required": true,
            "source": "selectedEntity",
            "description": "Identificador estável do chamado, transportado entre as etapas de acompanhamento."
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "chamadoId",
              "operationId": "getChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "titulo",
              "operationId": "getChamado",
              "path": [
                "titulo"
              ],
              "fromItems": false
            },
            {
              "name": "descricao",
              "operationId": "getChamado",
              "path": [
                "descricao"
              ],
              "fromItems": false
            },
            {
              "name": "status",
              "operationId": "getChamado",
              "path": [
                "status"
              ],
              "fromItems": false
            }
          ]
        },
        "optionalUses": []
      },
      {
        "handlerName": "chamadoCatalogueQryLocateChamadoHandler",
        "command": "qryLocateChamado",
        "bffId": "qryLocateChamado",
        "route": "controleChamados.chamadoCatalogue.qryLocateChamado",
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
        "handlerName": "chamadoCatalogueCmdCloseChamadoHandler",
        "command": "cmdCloseChamado",
        "bffId": "cmdCloseChamado",
        "route": "controleChamados.chamadoCatalogue.cmdCloseChamado",
        "kind": "command",
        "usecaseRef": "closeChamado",
        "usecaseRefs": [
          "closeChamado"
        ],
        "inputTypeName": "CloseChamadoInput",
        "inputContract": [
          {
            "inputId": "chamadoId",
            "fieldRef": "Chamado.chamadoId",
            "required": true,
            "source": "routeParam",
            "description": "Chamado"
          },
          {
            "inputId": "status",
            "fieldRef": "Chamado.status",
            "required": true,
            "source": "userInput",
            "description": "Decisão tomada.",
            "enumValues": [
              "closed"
            ]
          }
        ],
        "projection": {
          "kind": "object",
          "arrayFieldName": null,
          "itemFields": [],
          "topFields": [
            {
              "name": "chamadoId",
              "operationId": "closeChamado",
              "path": [
                "chamadoId"
              ],
              "fromItems": false
            },
            {
              "name": "titulo",
              "operationId": "closeChamado",
              "path": [
                "titulo"
              ],
              "fromItems": false
            },
            {
              "name": "descricao",
              "operationId": "closeChamado",
              "path": [
                "descricao"
              ],
              "fromItems": false
            },
            {
              "name": "status",
              "operationId": "closeChamado",
              "path": [
                "status"
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
        "key": "controleChamados.chamadoCatalogue.qryListChamado",
        "handlerName": "chamadoCatalogueQryListChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.cmdCreateChamado",
        "handlerName": "chamadoCatalogueCmdCreateChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.cmdUpdateChamado",
        "handlerName": "chamadoCatalogueCmdUpdateChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.cmdDeleteChamado",
        "handlerName": "chamadoCatalogueCmdDeleteChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.qryGetChamado",
        "handlerName": "chamadoCatalogueQryGetChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.qryLocateChamado",
        "handlerName": "chamadoCatalogueQryLocateChamadoHandler"
      },
      {
        "key": "controleChamados.chamadoCatalogue.cmdCloseChamado",
        "handlerName": "chamadoCatalogueCmdCloseChamadoHandler"
      }
    ]
  }
} as const;

export default chamadoCatalogueController;

export const pipeline = [
  {
    "id": "chamadoCatalogue__httpController",
    "type": "httpController",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoCatalogue.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/http/controllers/chamadoCatalogue.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--qryListChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/createChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--cmdCreateChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--cmdUpdateChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/deleteChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--cmdDeleteChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/getChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--qryGetChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/locateChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--qryLocateChamado.defs.ts",
      "_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.d.ts",
      "_102039_/l4/controleChamados/contracts/chamadoCatalogue--cmdCloseChamado.defs.ts"
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
