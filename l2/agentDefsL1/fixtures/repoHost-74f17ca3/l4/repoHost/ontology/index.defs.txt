/// <mls fileReference="_102047_/l4/repoHost/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "repoHost",
  "businessDomain": "Integração com o serviço que hospeda o repositório de conteúdo da empresa (GitHub): listar pastas e arquivos, ler e gravar arquivos com mensagem de registro e receber os avisos de mudança do repositório, para uso de outros módulos.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "repoHost",
    "description": "Branch details.repoHost of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "RepositoryEntry",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "RepositoryChange",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "entryParentFolder",
      "from": "RepositoryEntry",
      "to": "RepositoryEntry",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "Cada pasta ou arquivo pertence a uma pasta do repositório; os itens da raiz não têm pasta.",
      "field": "RepositoryEntry.parentEntryId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type RepoHostOntologyIndexType = typeof repoHostOntologyIndex;

export default repoHostOntologyIndex;
