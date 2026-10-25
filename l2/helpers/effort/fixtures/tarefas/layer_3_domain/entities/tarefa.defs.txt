/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "Tarefa",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/participante.defs.ts"
  ],
  "data": {
    "entityId": "Tarefa",
    "storageTarget": "moduleDatabase",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "titulo",
        "type": "string"
      },
      {
        "name": "status",
        "type": "enum"
      },
      {
        "name": "prioridade",
        "type": "enum"
      },
      {
        "name": "prazo",
        "type": "date"
      },
      {
        "name": "listaId",
        "type": "record",
        "ref": "ListaTarefas"
      },
      {
        "name": "responsavelId",
        "type": "record",
        "ref": "Participante"
      },
      {
        "name": "criadorId",
        "type": "record",
        "ref": "Participante"
      },
      {
        "name": "tarefaPaiId",
        "type": "record",
        "ref": "Tarefa"
      },
      {
        "name": "criadaEm",
        "type": "timestamp",
        "derived": true
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.descricao",
        "type": "text"
      },
      {
        "name": "details.etiquetas",
        "type": "string"
      },
      {
        "name": "details.motivoDevolucao",
        "type": "text"
      },
      {
        "name": "details.devolvidaEm",
        "type": "timestamp"
      },
      {
        "name": "details.retomadaEm",
        "type": "timestamp"
      },
      {
        "name": "details.concluidaEm",
        "type": "timestamp"
      },
      {
        "name": "details.canceladaEm",
        "type": "timestamp"
      },
      {
        "name": "details.quemAgeAgora",
        "type": "record",
        "derived": true,
        "ref": "Participante"
      },
      {
        "name": "details.aberta",
        "type": "boolean",
        "derived": true
      },
      {
        "name": "details.venceHoje",
        "type": "boolean",
        "derived": true
      },
      {
        "name": "details.atrasada",
        "type": "boolean",
        "derived": true
      },
      {
        "name": "details.devolvidaPendente",
        "type": "boolean",
        "derived": true
      },
      {
        "name": "details.quantidadeSubtarefas",
        "type": "integer",
        "derived": true
      },
      {
        "name": "details.progressoChecklist",
        "type": "string",
        "derived": true
      }
    ],
    "lifecycle": {
      "states": [
        {
          "state": "aFazer",
          "reachedBy": "actor"
        },
        {
          "state": "emAndamento",
          "reachedBy": "actor"
        },
        {
          "state": "emRevisao",
          "reachedBy": "actor"
        },
        {
          "state": "concluida",
          "reachedBy": "actor"
        },
        {
          "state": "cancelada",
          "reachedBy": "actor"
        }
      ],
      "transitions": [
        {
          "transitionId": "iniciar",
          "from": [
            "aFazer"
          ],
          "to": "emAndamento",
          "by": [
            "membroEquipe"
          ],
          "ruleRefs": [
            "apenasResponsavelExecuta"
          ]
        },
        {
          "transitionId": "enviarParaRevisao",
          "from": [
            "emAndamento"
          ],
          "to": "emRevisao",
          "by": [
            "membroEquipe"
          ],
          "ruleRefs": [
            "apenasResponsavelExecuta",
            "avisarQuemAgeAgora"
          ]
        },
        {
          "transitionId": "aceitar",
          "from": [
            "emRevisao"
          ],
          "to": "concluida",
          "by": [
            "membroEquipe"
          ],
          "ruleRefs": [
            "apenasCriadorRevisa"
          ]
        },
        {
          "transitionId": "devolver",
          "from": [
            "emRevisao"
          ],
          "to": "emAndamento",
          "by": [
            "membroEquipe"
          ],
          "ruleRefs": [
            "apenasCriadorRevisa",
            "devolucaoExigeMotivo",
            "avisarQuemAgeAgora"
          ]
        },
        {
          "transitionId": "retomar",
          "from": [
            "emAndamento"
          ],
          "to": "emAndamento",
          "by": [
            "membroEquipe"
          ],
          "ruleRefs": [
            "apenasResponsavelExecuta",
            "retomarSoAposDevolucao"
          ]
        },
        {
          "transitionId": "cancelar",
          "from": [
            "aFazer",
            "emAndamento",
            "emRevisao"
          ],
          "to": "cancelada",
          "by": [
            "gestor",
            "membroEquipe"
          ],
          "ruleRefs": [
            "cancelarApenasCriadorOuGestor",
            "avisarQuemAgeAgora"
          ]
        }
      ]
    },
    "invariants": [
      "podeCriarTarefasExigido",
      "responsavelAceitaTarefas",
      "escolhaResponsavelPeloNome",
      "reatribuirApenasCriadorOuGestor",
      "edicaoNaoMudaSituacao",
      "tarefaPaiDiferenteDaPropria",
      "quemAgeAgoraPorSituacao",
      "resumoDiarioOitoHoras",
      "avisoNaoSobrepostoPorPessoa",
      "membroVeResponsavelOuCriador"
    ],
    "imports": []
  }
} as const;

export default definition;
