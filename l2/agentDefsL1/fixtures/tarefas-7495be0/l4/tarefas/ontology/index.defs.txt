/// <mls fileReference="_102047_/l4/tarefas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "businessDomain": "Gestão de tarefas da equipe (estilo ClickUp simples): listas, tarefas com subtarefas, checklist, revisão pelo criador e aviso diário de vencimentos.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "tarefas",
    "description": "Branch details.tarefas of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "MembroEquipe",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Lista",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "Tarefa",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ItemChecklist",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "AvisoVencimento",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "tarefaLista",
      "from": "Tarefa",
      "to": "Lista",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A tarefa pertence a uma lista (projeto ou área).",
      "field": "Tarefa.listaId"
    },
    {
      "relationshipId": "tarefaResponsavel",
      "from": "Tarefa",
      "to": "MembroEquipe",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Pessoa da equipe responsável por executar a tarefa.",
      "field": "Tarefa.responsavelId"
    },
    {
      "relationshipId": "tarefaCriador",
      "from": "Tarefa",
      "to": "MembroEquipe",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Pessoa da equipe que criou a tarefa e a revisa.",
      "field": "Tarefa.criadorId"
    },
    {
      "relationshipId": "tarefaPai",
      "from": "Tarefa",
      "to": "Tarefa",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "Tarefa pai, quando a tarefa é uma subtarefa.",
      "field": "Tarefa.tarefaPaiId"
    },
    {
      "relationshipId": "itemChecklistTarefa",
      "from": "ItemChecklist",
      "to": "Tarefa",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Item da checklist pertence a uma tarefa.",
      "field": "ItemChecklist.tarefaId"
    },
    {
      "relationshipId": "avisoResponsavel",
      "from": "AvisoVencimento",
      "to": "MembroEquipe",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Responsável que recebe o aviso diário de vencimentos.",
      "field": "AvisoVencimento.responsavelId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type TarefasOntologyIndexType = typeof tarefasOntologyIndex;

export default tarefasOntologyIndex;
