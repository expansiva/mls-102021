/// <mls fileReference="_102047_/l4/reembolsoDespesas/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "reembolsoDespesas",
  "title": "Reembolso de despesas",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "reembolsoDespesas em português. colaboradores registram despesas (data, categoria, valor, descrição, comprovante) e enviam para aprovação. o gestor da equipe aprova ou rejeita com um motivo; despesa rejeitada pode ser corrigida e reenviada uma vez. o financeiro vê as aprovadas e registra o pagamento com a data. cada colaborador vê apenas as próprias despesas; o gestor vê as da sua equipe; o financeiro vê todas as aprovadas. três perfis."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type ReembolsoDespesasModuleType = typeof reembolsoDespesasModule;

export default reembolsoDespesasModule;
