/// <mls fileReference="_102047_/l4/conteudo/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const conteudoIntegration = {
  "schemaVersion": "2026-11-17-ns5-integration-v3",
  "moduleName": "conteudo",
  "inbound": [
    {
      "id": "repositorioAlterado",
      "kind": "event",
      "from": "repoHost",
      "event": "repositorioAlterado",
      "writes": [],
      "effect": "update",
      "description": "Quando o repositório de conteúdo muda por fora, o módulo repoHost publica o registro RepositoryChange (inbound repositorioAlterado). O módulo conteudo usa os arquivos afetados para saber que a lista de pastas e arquivos (blog, docs, site) mudou e voltar a listá-la no repositório. Não grava nenhum registro de ContentFile: o arquivo já mudou lá fora e o conteúdo de verdade continua no repositório.",
      "entityRefs": []
    }
  ],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "github",
      "operationId": "listarConteudo",
      "direction": "call",
      "usedBy": [
        "editarConteudo.navegarPastas",
        "criarConteudo.escolherPasta"
      ],
      "entityRefs": [
        "ContentFile"
      ],
      "effect": "list",
      "description": "Lista as pastas (blog, docs, site) e os arquivos markdown de um caminho do repositório para o editor navegar ou escolher a pasta do conteúdo novo."
    },
    {
      "connectionId": "github",
      "operationId": "lerArquivo",
      "direction": "call",
      "usedBy": [
        "editarConteudo.abrirArquivo"
      ],
      "entityRefs": [
        "ContentFile"
      ],
      "effect": "read",
      "description": "Lê do repositório o texto markdown do arquivo que o editor abriu."
    },
    {
      "connectionId": "github",
      "operationId": "gravarArquivo",
      "direction": "call",
      "usedBy": [
        "editarConteudo.salvarAlteracao",
        "criarConteudo.criarArquivo"
      ],
      "entityRefs": [
        "ContentFile"
      ],
      "effect": "update",
      "description": "Grava no repositório o arquivo alterado pelo editor ou o arquivo novo na pasta escolhida, com o título, o texto e a mensagem de registro. A gravação usa o sistema GitHub que o módulo de integração repoHost declara."
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ConteudoIntegrationType = typeof conteudoIntegration;

export default conteudoIntegration;
