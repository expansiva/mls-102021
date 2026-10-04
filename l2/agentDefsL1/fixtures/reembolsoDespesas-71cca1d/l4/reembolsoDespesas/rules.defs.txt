/// <mls fileReference="_102047_/l4/reembolsoDespesas/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "reembolsoDespesas",
  "rules": {
    "proofRequiredBeforeSubmission": "Uma despesa somente pode ser enviada para aprovação quando possuir comprovante.",
    "expenseOwnerOnly": "Cada colaborador somente pode consultar, corrigir ou reenviar despesas que tenha registrado.",
    "validExpenseData": "Uma despesa deve conter data, categoria, valor e descrição para ser registrada ou enviada para aprovação.",
    "singleResubmission": "Uma despesa rejeitada somente pode ser corrigida e reenviada uma vez.",
    "managerTeamExpenseAccess": "O gestor da equipe somente pode consultar, aprovar ou rejeitar despesas de colaboradores de sua própria equipe.",
    "rejectionReasonRequired": "A rejeição de uma despesa exige o registro de um motivo pelo gestor da equipe.",
    "financeApprovedExpenseAccess": "O financeiro somente pode consultar despesas aprovadas.",
    "paymentDateRequired": "O registro de pagamento de uma despesa aprovada exige a data de pagamento."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ReembolsoDespesasRulesType = typeof reembolsoDespesasRules;

export default reembolsoDespesasRules;
