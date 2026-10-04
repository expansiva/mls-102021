/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "businessDomain": "Reembolso de despesas corporativas",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "reembolsoDespesas",
    "description": "Branch details.reembolsoDespesas of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Colaborador",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "GestorEquipe",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Despesa",
      "kind": "entity",
      "class": "core"
    }
  ],
  "relationships": [
    {
      "relationshipId": "expenseCollaborator",
      "from": "Despesa",
      "to": "Colaborador",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada despesa é registrada por um único colaborador.",
      "field": "Despesa.colaboradorId"
    },
    {
      "relationshipId": "collaboratorReportsToManager",
      "from": "Colaborador",
      "to": "GestorEquipe",
      "type": "manyToOne",
      "required": true,
      "mode": "mdmRelationship",
      "description": "O colaborador se reporta ao gestor responsável por sua equipe.",
      "catalogType": "ReportsTo",
      "roles": [
        "direct-report"
      ]
    },
    {
      "relationshipId": "managerTeamExpenses",
      "from": "GestorEquipe",
      "to": "Despesa",
      "type": "oneToMany",
      "required": false,
      "mode": "throughTable",
      "description": "O gestor acessa as despesas registradas pelos colaboradores que se reportam a ele.",
      "through": "Despesa",
      "path": "GestorEquipe <-[ReportsTo]- Colaborador <-[Despesa.colaboradorId]- Despesa",
      "derived": true
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type ReembolsoDespesasOntologyIndexType = typeof reembolsoDespesasOntologyIndex;

export default reembolsoDespesasOntologyIndex;
