/// <mls fileReference="_102047_/l4/repoHost/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "repoHost",
  "actors": [
    {
      "actorId": "administrador",
      "kind": "internal",
      "origin": "named",
      "title": "Administrador",
      "description": "Pessoa da organização que configura a integração, informando qual é o repositório de conteúdo e a chave de acesso ao serviço que o hospeda.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "administradorConsultaRepositorio",
      "actorRef": "administrador",
      "title": "Consultar pastas e arquivos do repositório",
      "description": "O administrador navega pelas pastas e arquivos do repositório de conteúdo e lê um arquivo para conferir se a integração está funcionando.",
      "entityRefs": [
        "RepositoryEntry"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os itens do repositório de conteúdo da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O administrador vê o registro completo de cada pasta ou arquivo, como o serviço o apresenta."
      }
    },
    {
      "grantId": "administradorAcompanhaAvisos",
      "actorRef": "administrador",
      "title": "Acompanhar avisos de mudança do repositório",
      "description": "O administrador vê os avisos recebidos do serviço quando o repositório mudou, com a mensagem de registro, o autor e os arquivos afetados.",
      "entityRefs": [
        "RepositoryChange"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os avisos de mudança recebidos para o repositório da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O administrador vê o aviso completo: quando mudou, mensagem de registro, autor e arquivos afetados."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type RepoHostAccessType = typeof repoHostAccess;

export default repoHostAccess;
