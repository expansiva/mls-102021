/// <mls fileReference="_102047_/l4/repoHost/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "repoHost",
  "rules": {
    "repoHostUniquePath": "Cada pasta ou arquivo do repositório é identificado por um caminho completo único a partir da raiz; não podem existir dois itens com o mesmo caminho.",
    "repoHostFolderHasNoContent": "Uma pasta não tem conteúdo, tamanho nem tipo de mídia; só um arquivo pode ser lido ou gravado.",
    "repoHostParentMustBeFolder": "O item ao qual uma pasta ou um arquivo pertence deve ser uma pasta, e o caminho do item deve começar pelo caminho dessa pasta; itens da raiz não têm pasta de origem.",
    "repoHostNameFromPath": "O nome de uma pasta ou de um arquivo é sempre o último trecho do seu caminho.",
    "repoHostWriteRequiresMessage": "Gravar um arquivo novo ou alterado no repositório exige uma mensagem de registro que não esteja vazia.",
    "repoHostWriteOverCurrentVersion": "A gravação de um arquivo alterado só é aceita se for feita sobre a versão atual do conteúdo informada pelo serviço; se o arquivo tiver mudado desde a leitura, a gravação é recusada.",
    "repoHostChangesNewestFirst": "Os avisos de mudança do repositório são apresentados do mais recente ao mais antigo, pelo momento em que o serviço informou a mudança."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type RepoHostRulesType = typeof repoHostRules;

export default repoHostRules;
