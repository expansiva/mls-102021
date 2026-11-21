/// <mls fileReference="_102047_/l4/repoHost/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostIntegration = {
  "schemaVersion": "2026-11-19-ns5-integration-v4",
  "moduleName": "repoHost",
  "inbound": [
    {
      "id": "gravarArquivoRepositorio",
      "kind": "moduleEndpoint",
      "from": "conteudo",
      "writes": [
        "RepositoryEntry"
      ],
      "effect": "create",
      "description": "O módulo conteudo pede a este módulo para gravar um arquivo novo ou alterado no repositório, com o caminho, o conteúdo e a mensagem de registro; o módulo grava no GitHub pela operação gravarArquivo e registra ou atualiza o RepositoryEntry correspondente.",
      "entityRefs": []
    }
  ],
  "outbound": [
    {
      "id": "repositorioAlterado",
      "kind": "event",
      "to": "conteudo",
      "event": "repositorioAlterado",
      "on": "RepositoryChange.create",
      "description": "Avisa o módulo conteudo de que o repositório mudou, com o registro da mudança recebida do GitHub, para que ele atualize seus arquivos de conteúdo.",
      "entityRefs": [
        "RepositoryChange"
      ]
    }
  ],
  "plugins": [],
  "connections": [
    {
      "connectionId": "github",
      "operationId": "listarConteudo",
      "direction": "call",
      "usedBy": [
        "consultarConteudoRepositorio.listarPastasArquivos"
      ],
      "entityRefs": [
        "RepositoryEntry"
      ],
      "effect": "list",
      "description": "Lista as pastas e os arquivos do repositório para consulta."
    },
    {
      "connectionId": "github",
      "operationId": "lerArquivo",
      "direction": "call",
      "usedBy": [
        "consultarConteudoRepositorio.lerArquivo"
      ],
      "entityRefs": [
        "RepositoryEntry"
      ],
      "effect": "read",
      "description": "Lê o conteúdo de um arquivo do repositório."
    },
    {
      "connectionId": "github",
      "operationId": "repositorioMudou",
      "direction": "serve",
      "usedBy": [
        "Registra o aviso de mudança do repositório e atualiza as entradas afetadas."
      ],
      "entityRefs": [
        "RepositoryChange",
        "RepositoryEntry"
      ],
      "effect": "create",
      "description": "Ao receber o aviso do GitHub, cria um RepositoryChange e registra ou atualiza os RepositoryEntry dos arquivos afetados."
    }
  ],
  "externalSystems": [
    {
      "id": "github",
      "title": "GitHub",
      "description": "Serviço que hospeda o repositório de conteúdo da empresa. O módulo lista pastas e arquivos, lê arquivos, grava arquivos novos ou alterados com mensagem de registro e recebe o aviso quando o repositório muda.",
      "settings": [
        {
          "id": "repositorio",
          "title": "Repositório",
          "description": "Qual é o repositório de conteúdo da empresa no GitHub (dono e nome do repositório).",
          "secret": false
        },
        {
          "id": "chaveAcesso",
          "title": "Chave de acesso",
          "description": "Chave que dá ao módulo acesso de leitura e gravação ao repositório.",
          "secret": true
        },
        {
          "id": "segredoAviso",
          "title": "Segredo dos avisos",
          "description": "Segredo combinado com o GitHub para conferir que os avisos de mudança vêm realmente dele.",
          "secret": true
        }
      ],
      "operations": [
        {
          "operationId": "listarConteudo",
          "direction": "call",
          "description": "Pede a lista de pastas e arquivos de um caminho do repositório."
        },
        {
          "operationId": "lerArquivo",
          "direction": "call",
          "description": "Pede o conteúdo de um arquivo do repositório."
        },
        {
          "operationId": "gravarArquivo",
          "direction": "call",
          "description": "Grava um arquivo novo ou alterado no repositório, com a mensagem de registro."
        },
        {
          "operationId": "repositorioMudou",
          "direction": "serve",
          "description": "O GitHub avisa que o repositório mudou, informando o registro da mudança e os arquivos afetados."
        }
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type RepoHostIntegrationType = typeof repoHostIntegration;

export default repoHostIntegration;
