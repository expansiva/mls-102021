/// <mls fileReference="_102039_/l1/controleChamados/layer_1_external/adapters/persistence/seeds.defs.ts" enhancement="_blank"/>

export const seedsDefs = {
  "schemaVersion": "2026-06-26",
  "artifactType": "seeds",
  "artifactId": "seeds",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbSeeds",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "version": 1,
    "language": "en",
    "plan": {
      "summary": "Three coherent comments linked to the three previously seeded open support tickets and assigned attendants.",
      "localTables": [
        {
          "tableId": "Chamado",
          "rows": [
            {
              "key": "chamado-1",
              "columns": [
                {
                  "name": "status",
                  "value": "open"
                }
              ],
              "details": [
                {
                  "name": "titulo",
                  "value": "Unable to access customer portal"
                },
                {
                  "name": "descricao",
                  "value": "The customer receives an authentication error after entering valid credentials and cannot reach the portal dashboard."
                }
              ],
              "children": []
            },
            {
              "key": "chamado-2",
              "columns": [
                {
                  "name": "status",
                  "value": "open"
                }
              ],
              "details": [
                {
                  "name": "titulo",
                  "value": "Invoice download fails"
                },
                {
                  "name": "descricao",
                  "value": "The invoice page loads, but selecting the PDF download action returns an empty response."
                }
              ],
              "children": []
            },
            {
              "key": "chamado-3",
              "columns": [
                {
                  "name": "status",
                  "value": "open"
                }
              ],
              "details": [
                {
                  "name": "titulo",
                  "value": "Request to update contact email"
                },
                {
                  "name": "descricao",
                  "value": "The customer asked support to replace the primary contact email address on the account."
                }
              ],
              "children": []
            }
          ]
        },
        {
          "tableId": "Comentario",
          "rows": [
            {
              "key": "comentario-1",
              "columns": [
                {
                  "name": "chamado_id",
                  "value": {
                    "ref": "local:Chamado.chamado-1"
                  }
                },
                {
                  "name": "atendente_id",
                  "value": {
                    "ref": "mdm:Atendente.atendente-1"
                  }
                }
              ],
              "details": [
                {
                  "name": "conteudo",
                  "value": "We are investigating the reported access issue and will provide an update shortly."
                }
              ],
              "children": []
            },
            {
              "key": "comentario-2",
              "columns": [
                {
                  "name": "chamado_id",
                  "value": {
                    "ref": "local:Chamado.chamado-2"
                  }
                },
                {
                  "name": "atendente_id",
                  "value": {
                    "ref": "mdm:Atendente.atendente-2"
                  }
                }
              ],
              "details": [
                {
                  "name": "conteudo",
                  "value": "The support team requested additional diagnostic information from the requester."
                }
              ],
              "children": []
            },
            {
              "key": "comentario-3",
              "columns": [
                {
                  "name": "chamado_id",
                  "value": {
                    "ref": "local:Chamado.chamado-3"
                  }
                },
                {
                  "name": "atendente_id",
                  "value": {
                    "ref": "mdm:Atendente.atendente-3"
                  }
                }
              ],
              "details": [
                {
                  "name": "conteudo",
                  "value": "The ticket remains in progress while the proposed configuration change is being validated."
                }
              ],
              "children": []
            }
          ]
        }
      ],
      "mdmEntities": [
        {
          "entityId": "Atendente",
          "rows": [
            {
              "key": "atendente-1",
              "fields": [
                {
                  "name": "name",
                  "value": "Atendente 1"
                },
                {
                  "name": "atendenteId",
                  "value": "atendente-1"
                },
                {
                  "name": "platformUserId",
                  "value": {
                    "ref": "actor:atendente.u1"
                  }
                }
              ],
              "relationships": []
            },
            {
              "key": "atendente-2",
              "fields": [
                {
                  "name": "name",
                  "value": "Atendente 2"
                },
                {
                  "name": "atendenteId",
                  "value": "atendente-2"
                },
                {
                  "name": "platformUserId",
                  "value": {
                    "ref": "actor:atendente.u2"
                  }
                }
              ],
              "relationships": []
            },
            {
              "key": "atendente-3",
              "fields": [
                {
                  "name": "name",
                  "value": "Atendente 3"
                },
                {
                  "name": "atendenteId",
                  "value": "atendente-3"
                },
                {
                  "name": "platformUserId",
                  "value": {
                    "ref": "actor:atendente.u3"
                  }
                }
              ],
              "relationships": []
            }
          ]
        }
      ]
    }
  }
} as const;

export default seedsDefs;

export const pipeline = [
  {
    "id": "seeds__persistenceSeeds",
    "type": "persistenceSeeds",
    "outputPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/seeds.ts",
    "defPath": "_102039_/l1/controleChamados/layer_1_external/adapters/persistence/seeds.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/persistenceSeeds.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
