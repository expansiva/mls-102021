/// <mls fileReference="_102047_/l4/controleEstoque/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "businessDomain": "Controle de estoque",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "controleEstoque",
    "description": "Branch details.controleEstoque of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Produto",
      "kind": "role",
      "subtype": "Product"
    },
    {
      "entityId": "MovimentacaoEstoque",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "movimentacaoEstoqueProduto",
      "from": "MovimentacaoEstoque",
      "to": "Produto",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada movimentação de estoque registra uma entrada ou saída para um único produto.",
      "field": "MovimentacaoEstoque.produtoId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ControleEstoqueOntologyIndexType = typeof controleEstoqueOntologyIndex;

export default controleEstoqueOntologyIndex;
