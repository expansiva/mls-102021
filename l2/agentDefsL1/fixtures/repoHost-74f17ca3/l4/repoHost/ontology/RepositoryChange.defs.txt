/// <mls fileReference="_102047_/l4/repoHost/ontology/RepositoryChange.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostEntityRepositoryChange = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "repoHost",
  "entityId": "RepositoryChange",
  "title": "Aviso de mudança",
  "description": "Aviso enviado pelo serviço que hospeda o repositório quando ele muda: quando mudou, a mensagem de registro, o autor e a lista dos arquivos afetados (incluídos, alterados ou removidos).",
  "displayField": "details.commitMessage",
  "relationships": {},
  "capabilities": {
    "create": "Grava o aviso quando o serviço do repositório avisa que ele mudou; é escrito pelo recebimento do aviso, não por uma pessoa.",
    "locate.byColumn": "Lista os avisos de mudança ordenados pelo momento em que o repositório mudou, do mais recente ao mais antigo, para o administrador acompanhar.",
    "read.byId": "Abre um aviso pelo id para mostrar quando o repositório mudou, a mensagem de registro e os arquivos afetados ao administrador.",
    "count": "Conta os avisos recebidos para o administrador dimensionar o que foi recebido.",
    "locate.byText": "Permite ao administrador procurar avisos por trecho da mensagem de registro."
  },
  "rules": [],
  "writer": "inbound",
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "repoHost_repositorychange",
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
      "changedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Mudou em",
        "description": "Momento em que o serviço informou que o repositório mudou; é a ordem da lista de avisos, do mais recente ao mais antigo."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes do aviso",
        "description": "Conteúdo do aviso recebido do serviço que hospeda o repositório.",
        "fields": {
          "commitMessage": {
            "type": "text",
            "required": true,
            "title": "Mensagem de registro",
            "description": "Mensagem de registro (commit) que acompanha a mudança no repositório."
          },
          "author": {
            "type": "string",
            "title": "Autor",
            "description": "Nome de quem fez a mudança, como informado pelo serviço do repositório.",
            "maxLength": 200
          },
          "files": {
            "type": "object",
            "collection": true,
            "title": "Arquivos afetados",
            "description": "Lista dos arquivos afetados pela mudança, cada um com seu caminho e o tipo de alteração.",
            "fields": {
              "path": {
                "type": "string",
                "required": true,
                "title": "Caminho",
                "description": "Caminho do arquivo dentro do repositório.",
                "maxLength": 1000
              },
              "change": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "added",
                    "title": "Incluído"
                  },
                  {
                    "value": "modified",
                    "title": "Alterado"
                  },
                  {
                    "value": "removed",
                    "title": "Removido"
                  }
                ],
                "title": "Tipo de alteração",
                "description": "O que aconteceu com o arquivo nesta mudança."
              }
            }
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type RepoHostEntityRepositoryChangeType = typeof repoHostEntityRepositoryChange;

export default repoHostEntityRepositoryChange;
