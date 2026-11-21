/// <mls fileReference="_102047_/l4/repoHost/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "repoHost",
  "title": "Integração com o repositório de conteúdo (GitHub)",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "Módulo de integração com o serviço que hospeda o repositório de conteúdo da empresa (GitHub). Não tem telas próprias de negócio. Ele lista as pastas e os arquivos do repositório, lê um arquivo, grava um arquivo novo ou alterado com uma mensagem de registro, e recebe o aviso do serviço quando o repositório muda. O administrador informa qual é o repositório e a chave de acesso. Outros módulos usam este módulo para ler e gravar no repositório."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type RepoHostModuleType = typeof repoHostModule;

export default repoHostModule;
