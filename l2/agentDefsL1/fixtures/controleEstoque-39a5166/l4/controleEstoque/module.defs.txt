/// <mls fileReference="_102047_/l4/controleEstoque/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "controleEstoque",
  "title": "Controle de estoque",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "controle de estoque: produtos, entradas e saídas, saldo atual por produto e aviso quando o saldo ficar abaixo do mínimo. movimentação não pode ser alterada depois de registrada. um perfil: estoquista."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type ControleEstoqueModuleType = typeof controleEstoqueModule;

export default controleEstoqueModule;
