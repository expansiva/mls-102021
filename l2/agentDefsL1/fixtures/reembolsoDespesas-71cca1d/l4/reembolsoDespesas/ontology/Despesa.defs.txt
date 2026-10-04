/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Despesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityDespesa = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "Despesa",
  "title": "Despesa",
  "description": "Solicitação de reembolso registrada por um colaborador, submetida à aprovação e posteriormente ao pagamento.",
  "displayField": "id",
  "relationships": {
    "colaborador": {
      "relationshipId": "expenseCollaborator",
      "to": "Colaborador",
      "via": "Despesa.colaboradorId",
      "cardinality": "N:1",
      "title": "Colaborador responsável",
      "description": "Cada despesa é registrada por um único colaborador.",
      "mode": "fk",
      "required": "sempre",
      "role": "registrante"
    },
    "gestorDaEquipe": {
      "relationshipId": "managerTeamExpenses",
      "to": "GestorEquipe",
      "via": "Despesa",
      "cardinality": "N:1",
      "title": "Gestor da equipe",
      "description": "O gestor acessa esta despesa por meio da relação ReportsTo com o colaborador que a registrou.",
      "mode": "throughTable",
      "path": "GestorEquipe <-[ReportsTo]- Colaborador <-[Despesa.colaboradorId]- Despesa",
      "derived": true,
      "direction": "to",
      "required": "quando o colaborador estiver vinculado a um gestor por ReportsTo",
      "role": "aprovadorDaEquipe"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma despesa pelo identificador da linha no repositório da tabela, para colaborador responsável, gestor da equipe ou financeiro conforme o escopo de acesso.",
    "locate.byColumn": "Lista despesas por situação e colaborador em colunas indexadas, para o colaborador acompanhar as próprias, o gestor analisar as da equipe e o financeiro consultar as aprovadas.",
    "count": "Conta as despesas que atendem aos filtros de situação e escopo de acesso, para os cabeçalhos das listas de colaborador, gestor e financeiro.",
    "listByForeignKey": "Lista despesas pelo vínculo indexado com um colaborador, inclusive para vários colaboradores da equipe, para as telas de acompanhamento e aprovação.",
    "create": "Cria uma despesa em rascunho com os dados informados pelo colaborador, para o próprio colaborador iniciar uma solicitação de reembolso.",
    "update": "Atualiza os dados de uma despesa rejeitada sem alterar seu vínculo de colaborador, para o colaborador corrigi-la antes do único reenvio permitido.",
    "transition": "Move a despesa entre as situações do fluxo por atualização da coluna de situação, para colaborador enviar ou reenviar, gestor aprovar ou rejeitar e financeiro registrar o pagamento.",
    "read.mdmRecord": "Lê o registro mestre do colaborador apontado pela chave estrangeira, para identificar o responsável pela despesa nas telas autorizadas.",
    "attach.document": "Anexa o comprovante à linha da despesa por categoria de documento, para o colaborador apresentar evidência e gestor ou financeiro autorizado consultá-la."
  },
  "rules": [
    "expenseOwnerOnly",
    "managerTeamExpenseAccess",
    "financeApprovedExpenseAccess",
    "validExpenseData",
    "proofRequiredBeforeSubmission",
    "rejectionReasonRequired",
    "singleResubmission",
    "paymentDateRequired"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "reembolsoDespesas_despesa",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "colaboradorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Colaborador"
        ],
        "title": "Colaborador",
        "description": "Colaborador que registrou a solicitação de reembolso.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "draft",
            "title": "Rascunho",
            "description": "Despesa registrada e ainda não enviada para aprovação."
          },
          {
            "value": "awaitingApproval",
            "title": "Aguardando aprovação",
            "description": "Despesa enviada e disponível para decisão do gestor da equipe."
          },
          {
            "value": "rejected",
            "title": "Rejeitada",
            "description": "Despesa recusada pelo gestor, com motivo informado."
          },
          {
            "value": "approved",
            "title": "Aprovada",
            "description": "Despesa aprovada e aguardando o registro do pagamento."
          },
          {
            "value": "paid",
            "title": "Paga",
            "description": "Pagamento da despesa registrado pelo financeiro."
          }
        ],
        "title": "Situação",
        "description": "Etapa atual da despesa no fluxo de aprovação e pagamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da despesa",
        "description": "Informações declaradas para o reembolso, a rejeição e o pagamento da despesa.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "dataDespesa": {
            "type": "date",
            "required": true,
            "of": "ContactSummary",
            "title": "Data da despesa",
            "description": "Data em que a despesa foi realizada.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "categoria": {
            "type": "string",
            "required": true,
            "of": "ContactSummary",
            "title": "Categoria",
            "description": "Categoria informada pelo colaborador para classificar a despesa.",
            "maxLength": 120,
            "min": 0,
            "max": 0
          },
          "valor": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Valor",
            "description": "Valor solicitado para reembolso.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "descricao": {
            "type": "text",
            "required": true,
            "of": "ContactSummary",
            "title": "Descrição",
            "description": "Descrição da despesa informada pelo colaborador.",
            "maxLength": 2000,
            "min": 0,
            "max": 0
          },
          "motivoRejeicao": {
            "type": "text",
            "of": "ContactSummary",
            "title": "Motivo da rejeição",
            "description": "Justificativa informada pelo gestor ao rejeitar a despesa.",
            "maxLength": 2000,
            "min": 0,
            "max": 0
          },
          "reenvioRealizado": {
            "type": "boolean",
            "required": true,
            "of": "ContactSummary",
            "title": "Reenvio realizado",
            "description": "Indica se a despesa rejeitada já foi corrigida e reenviada para uma nova aprovação.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "dataPagamento": {
            "type": "date",
            "of": "ContactSummary",
            "title": "Data de pagamento",
            "description": "Data em que o financeiro registrou o pagamento da despesa aprovada.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "draft",
      "reachedBy": "actor"
    },
    {
      "state": "awaitingApproval",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "paid",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "enviarParaAprovacao",
      "from": [
        "draft"
      ],
      "to": "awaitingApproval",
      "by": [
        "colaborador"
      ],
      "description": "Envia a despesa registrada para análise do gestor da equipe.",
      "payload": [],
      "ruleRefs": [
        "proofRequiredBeforeSubmission",
        "expenseOwnerOnly",
        "validExpenseData"
      ]
    },
    {
      "transitionId": "reenviarParaAprovacao",
      "from": [
        "rejected"
      ],
      "to": "awaitingApproval",
      "by": [
        "colaborador"
      ],
      "description": "Reenvia para análise uma despesa rejeitada que foi corrigida pelo colaborador.",
      "payload": [],
      "ruleRefs": [
        "expenseOwnerOnly",
        "singleResubmission",
        "proofRequiredBeforeSubmission",
        "validExpenseData"
      ]
    },
    {
      "transitionId": "aprovarDespesa",
      "from": [
        "awaitingApproval"
      ],
      "to": "approved",
      "by": [
        "gestorEquipe"
      ],
      "description": "Aprova a despesa da equipe para disponibilizá-la ao financeiro.",
      "payload": [],
      "ruleRefs": [
        "managerTeamExpenseAccess"
      ]
    },
    {
      "transitionId": "rejeitarDespesa",
      "from": [
        "awaitingApproval"
      ],
      "to": "rejected",
      "by": [
        "gestorEquipe"
      ],
      "description": "Rejeita a despesa da equipe e registra a justificativa da decisão.",
      "payload": [
        "details.motivoRejeicao"
      ],
      "ruleRefs": [
        "managerTeamExpenseAccess",
        "rejectionReasonRequired"
      ]
    },
    {
      "transitionId": "registrarPagamento",
      "from": [
        "approved"
      ],
      "to": "paid",
      "by": [
        "financeiro"
      ],
      "description": "Registra o pagamento da despesa aprovada.",
      "payload": [
        "details.dataPagamento"
      ],
      "ruleRefs": [
        "financeApprovedExpenseAccess",
        "paymentDateRequired"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ReembolsoDespesasEntityDespesaType = typeof reembolsoDespesasEntityDespesa;

export default reembolsoDespesasEntityDespesa;
