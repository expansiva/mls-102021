/// <mls fileReference="_102047_/l4/financeiro/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "financeiro",
  "actors": [
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Recebe títulos a receber em dinheiro, pix ou cartão, registra baixas parciais e estorna recebimentos no mesmo dia.",
      "personEntity": ""
    },
    {
      "actorId": "gerenteFinanceiro",
      "kind": "internal",
      "origin": "named",
      "title": "Gerente financeiro",
      "description": "Acompanha o painel de recebíveis por período e por origem, os títulos vencidos, e emite o extrato por pagador.",
      "personEntity": ""
    },
    {
      "actorId": "pagador",
      "kind": "external",
      "origin": "named",
      "title": "Pagador",
      "description": "Acessa o portal para ver apenas os próprios títulos e recebimentos e pagar com cartão um título em aberto.",
      "personEntity": "Pagador"
    }
  ],
  "grants": [
    {
      "grantId": "caixaTitulos",
      "actorRef": "caixa",
      "title": "Títulos a receber no caixa",
      "description": "O caixa localiza e confere os títulos a receber de toda a organização, com o nome, o documento e o contato do pagador, para registrar recebimentos.",
      "entityRefs": [
        "TituloReceber",
        "Pagador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os títulos a receber da organização e seus pagadores."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O caixa vê o título inteiro e, do pagador, a identificação, os contatos e o saldo em aberto; não vê endereços, consentimento LGPD nem campos promovidos.",
        "allowedFields": [
          "TituloReceber",
          "Pagador.details.identification",
          "Pagador.details.base.contacts",
          "Pagador.details.financeiro"
        ]
      }
    },
    {
      "grantId": "caixaRecebimentos",
      "actorRef": "caixa",
      "title": "Recebimentos e estornos no caixa",
      "description": "O caixa registra recebimentos totais ou parciais em dinheiro, pix ou cartão e estorna recebimentos do mesmo dia.",
      "entityRefs": [
        "Recebimento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os recebimentos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O caixa vê o recebimento completo, incluindo dados do Stripe e do estorno."
      }
    },
    {
      "grantId": "gerenteTitulosExtrato",
      "actorRef": "gerenteFinanceiro",
      "title": "Títulos, recebimentos e extrato por pagador",
      "description": "O gerente financeiro consulta títulos, títulos vencidos, recebimentos e estornos de toda a organização e emite o extrato por pagador.",
      "entityRefs": [
        "TituloReceber",
        "Recebimento",
        "Pagador"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os títulos, recebimentos e pagadores da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gerente vê os registros completos para análise e emissão do extrato."
      }
    },
    {
      "grantId": "gerentePainel",
      "actorRef": "gerenteFinanceiro",
      "title": "Painel de recebíveis",
      "description": "O gerente financeiro acompanha os totais a receber, recebidos, estornados, em aberto e vencidos por período e por origem.",
      "entityRefs": [
        "PainelRecebiveis"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Totais de toda a organização."
      },
      "disclosure": {
        "mode": "aggregateOnly",
        "description": "Apenas totais e contagens agrupados por período e origem."
      }
    },
    {
      "grantId": "pagadorMeusTitulos",
      "actorRef": "pagador",
      "title": "Meus títulos no portal",
      "description": "O pagador vê no portal apenas os próprios títulos, em aberto e quitados, e escolhe um em aberto para pagar.",
      "entityRefs": [
        "TituloReceber"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente os títulos cujo pagador é a pessoa da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador não vê o identificador interno da origem nem as observações internas enviadas pela origem.",
        "deniedFields": [
          "TituloReceber.origemId",
          "TituloReceber.details.observacoes"
        ]
      }
    },
    {
      "grantId": "pagadorMeusRecebimentos",
      "actorRef": "pagador",
      "title": "Meus recebimentos no portal",
      "description": "O pagador vê os recebimentos dos próprios títulos e registra o pagamento com cartão via Stripe de um título em aberto.",
      "entityRefs": [
        "Recebimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente os recebimentos de títulos do pagador da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador não vê a anotação interna do caixa, o identificador técnico do Stripe nem a indicação interna de estorno.",
        "deniedFields": [
          "Recebimento.details.observacao",
          "Recebimento.details.stripe.paymentIntentId",
          "Recebimento.details.estornavel"
        ]
      }
    },
    {
      "grantId": "pagadorMeuCadastro",
      "actorRef": "pagador",
      "title": "Meu cadastro de pagador",
      "description": "O pagador vê os próprios dados de identificação, contato e o seu saldo em aberto no portal.",
      "entityRefs": [
        "Pagador"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro da própria pessoa da sessão.",
        "anchorEntity": "Pagador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O pagador vê nome, documento, endereços, contatos, consentimento e o saldo em aberto; não vê tags, situação nem vínculos internos do cadastro.",
        "allowedFields": [
          "Pagador.details.identification.name",
          "Pagador.details.identification.docType",
          "Pagador.details.identification.docId",
          "Pagador.details.base.addresses",
          "Pagador.details.base.contacts",
          "Pagador.details.person",
          "Pagador.details.financeiro"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type FinanceiroAccessType = typeof financeiroAccess;

export default financeiroAccess;
