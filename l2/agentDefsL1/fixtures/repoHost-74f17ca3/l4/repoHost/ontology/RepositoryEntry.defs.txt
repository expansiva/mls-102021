/// <mls fileReference="_102047_/l4/repoHost/ontology/RepositoryEntry.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostEntityRepositoryEntry = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "repoHost",
  "entityId": "RepositoryEntry",
  "title": "Item do repositório",
  "description": "Pasta ou arquivo do repositório de conteúdo, como o serviço que o hospeda o apresenta: caminho, tipo (pasta ou arquivo) e a versão atual do conteúdo. O conteúdo é trazido do serviço ao ler e gravado nele com uma mensagem de registro.",
  "displayField": "path",
  "relationships": {
    "parentFolder": {
      "relationshipId": "entryParentFolder",
      "to": "RepositoryEntry",
      "via": "RepositoryEntry.parentEntryId",
      "cardinality": "N:1",
      "title": "Pasta pai",
      "description": "Cada pasta ou arquivo pertence a uma pasta do repositório; os itens da raiz não têm pasta.",
      "mode": "fk",
      "required": "quando o item não está na raiz do repositório"
    }
  },
  "capabilities": {
    "read.byId": "Lê um item do repositório pelo id já conhecido, usado pelo administrador ao abrir um arquivo para ler o conteúdo.",
    "locate.byColumn": "Lista os itens filtrando por pasta pai, tipo ou caminho, ordenados e paginados; é como o administrador navega pelas pastas e arquivos.",
    "locate.byText": "Busca itens cujo caminho contém o texto digitado, para achar um arquivo sem percorrer todas as pastas.",
    "count": "Conta os itens de uma pasta ou do filtro aplicado, para mostrar o total na listagem.",
    "listByForeignKey": "Lista os itens que pertencem a uma pasta, pela chave da pasta pai, mostrando o conteúdo de cada pasta.",
    "create": "Registra um item novo trazido do serviço que hospeda o repositório ou criado por uma gravação, feito pela integração.",
    "update": "Atualiza caminho, versão do conteúdo e dados de um item quando o serviço informa mudança ou após uma gravação.",
    "uniqueKey": "Impede dois itens com o mesmo caminho no repositório, garantido pelo motor na gravação.",
    "repoHost.readFileContent": "Traz do serviço que hospeda o repositório o conteúdo atual de um arquivo; o conteúdo não é guardado aqui. Usado pelo administrador e por outros módulos.",
    "repoHost.writeFileContent": "Grava no serviço um arquivo novo ou alterado com uma mensagem de registro e atualiza a versão do item; usado por outros módulos.",
    "repoHost.receiveChangeNotice": "Recebe o aviso do serviço de que o repositório mudou e atualiza os itens afetados, executado pela integração."
  },
  "rules": [
    "repoHostUniquePath",
    "repoHostFolderHasNoContent",
    "repoHostParentMustBeFolder"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "repoHost_repositoryentry",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "path": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Caminho",
        "description": "Caminho completo da pasta ou do arquivo dentro do repositório, a partir da raiz.",
        "maxLength": 1024
      },
      "entryType": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "folder",
            "title": "Pasta"
          },
          {
            "value": "file",
            "title": "Arquivo"
          }
        ],
        "title": "Tipo",
        "description": "Indica se o item é uma pasta ou um arquivo."
      },
      "parentEntryId": {
        "type": "record",
        "indexed": true,
        "to": [
          "RepositoryEntry"
        ],
        "title": "Pasta pai",
        "description": "Pasta do repositório à qual o item pertence; vazio para itens da raiz."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do item como o serviço que hospeda o repositório os apresenta.",
        "fields": {
          "name": {
            "type": "string",
            "required": true,
            "title": "Nome",
            "description": "Nome da pasta ou do arquivo, último trecho do caminho.",
            "maxLength": 255
          },
          "contentVersion": {
            "type": "string",
            "title": "Versão do conteúdo",
            "description": "Identificador da versão atual do conteúdo informado pelo serviço, usado para saber se o arquivo mudou e para gravar sobre a versão correta.",
            "maxLength": 128
          },
          "sizeBytes": {
            "type": "integer",
            "title": "Tamanho em bytes",
            "description": "Tamanho do arquivo informado pelo serviço; não se aplica a pastas.",
            "min": 0
          },
          "mimeType": {
            "type": "string",
            "title": "Tipo de conteúdo",
            "description": "Tipo de mídia do arquivo, quando informado pelo serviço.",
            "maxLength": 127
          },
          "lastSyncedAt": {
            "type": "timestamp",
            "title": "Última sincronização",
            "description": "Momento em que o item foi trazido ou confirmado pelo serviço pela última vez."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "path"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type RepoHostEntityRepositoryEntryType = typeof repoHostEntityRepositoryEntry;

export default repoHostEntityRepositoryEntry;
