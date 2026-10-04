/// <mls fileReference="_102047_/l4/reembolsoDespesas/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "reembolsoDespesas",
  "actors": [
    {
      "actorId": "colaborador",
      "kind": "internal",
      "origin": "named",
      "title": "Colaborador",
      "description": "Registra despesas próprias e as envia para aprovação.",
      "personEntity": "Colaborador"
    },
    {
      "actorId": "gestorEquipe",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor da equipe",
      "description": "Aprova ou rejeita as despesas da sua equipe, informando o motivo da rejeição.",
      "personEntity": "GestorEquipe"
    },
    {
      "actorId": "financeiro",
      "kind": "internal",
      "origin": "named",
      "title": "Financeiro",
      "description": "Consulta as despesas aprovadas e registra a data de pagamento.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "colaboradorGerenciaPropriasDespesas",
      "actorRef": "colaborador",
      "title": "Gerenciar minhas despesas",
      "description": "Permite ao colaborador registrar, enviar, consultar, corrigir e reenviar as próprias solicitações de reembolso.",
      "entityRefs": [
        "Despesa"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente despesas vinculadas ao próprio colaborador autenticado.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O colaborador pode consultar todos os dados das suas próprias despesas, inclusive situação, motivo de rejeição e data de pagamento."
      }
    },
    {
      "grantId": "gestorAnalisaDespesasDaEquipe",
      "actorRef": "gestorEquipe",
      "title": "Analisar despesas da equipe",
      "description": "Permite ao gestor consultar e decidir as despesas dos colaboradores vinculados à sua equipe.",
      "entityRefs": [
        "Despesa",
        "Colaborador"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Somente despesas e registros de colaboradores que possuem vínculo de reporte ao gestor autenticado.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O gestor consulta a identificação e o vínculo do colaborador, além dos dados necessários para analisar, aprovar ou rejeitar despesas da equipe; a data de pagamento não é divulgada.",
        "allowedFields": [
          "Despesa.id",
          "Despesa.colaboradorId",
          "Despesa.status",
          "Despesa.details.dataDespesa",
          "Despesa.details.categoria",
          "Despesa.details.valor",
          "Despesa.details.descricao",
          "Despesa.details.motivoRejeicao",
          "Despesa.details.reenvioRealizado",
          "Colaborador.id",
          "Colaborador.details.identification",
          "Colaborador.details.base"
        ]
      }
    },
    {
      "grantId": "financeiroConsultaEpagaDespesasAprovadas",
      "actorRef": "financeiro",
      "title": "Consultar e registrar pagamento",
      "description": "Permite ao financeiro consultar despesas aprovadas que aguardam pagamento e registrar a respectiva data de pagamento.",
      "entityRefs": [
        "Despesa"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Somente despesas vinculadas a colaboradores relacionados à pessoa autenticada no financeiro, incluindo as aprovadas disponíveis para pagamento.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O financeiro consulta os dados necessários para efetuar o pagamento e sua data, sem acesso ao motivo de rejeição nem ao controle de reenvio.",
        "allowedFields": [
          "Despesa.id",
          "Despesa.colaboradorId",
          "Despesa.status",
          "Despesa.details.dataDespesa",
          "Despesa.details.categoria",
          "Despesa.details.valor",
          "Despesa.details.descricao",
          "Despesa.details.dataPagamento"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ReembolsoDespesasAccessType = typeof reembolsoDespesasAccess;

export default reembolsoDespesasAccess;
