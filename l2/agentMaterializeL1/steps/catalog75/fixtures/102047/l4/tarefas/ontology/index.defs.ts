/// <mls fileReference="_102047_/l4/tarefas/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "businessDomain": "Gestão de tarefas da equipe: participantes escolhidos entre os usuários da organização, listas que agrupam tarefas, tarefas com responsável, prazo, prioridade, subtarefas, checklist e etiquetas, e o fluxo a fazer → em andamento → em revisão → concluída ou cancelada.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "tarefas",
    "description": "Branch details.tarefas of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Participante",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "ListaTarefas",
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
    }
  ],
  "relationships": [
    {
      "relationshipId": "tarefaLista",
      "from": "Tarefa",
      "to": "ListaTarefas",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada tarefa pertence a uma lista de tarefas.",
      "field": "Tarefa.listaId"
    },
    {
      "relationshipId": "tarefaResponsavel",
      "from": "Tarefa",
      "to": "Participante",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O responsável pela tarefa, escolhido pelo nome entre os participantes que aceitam tarefas.",
      "field": "Tarefa.responsavelId"
    },
    {
      "relationshipId": "tarefaCriador",
      "from": "Tarefa",
      "to": "Participante",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Quem criou a tarefa, que revisa, aceita, devolve, reatribui ou cancela.",
      "field": "Tarefa.criadorId"
    },
    {
      "relationshipId": "tarefaPai",
      "from": "Tarefa",
      "to": "Tarefa",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "Uma subtarefa aponta para a sua tarefa pai.",
      "field": "Tarefa.tarefaPaiId"
    },
    {
      "relationshipId": "itemChecklistTarefa",
      "from": "ItemChecklist",
      "to": "Tarefa",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada item da checklist pertence a uma tarefa.",
      "field": "ItemChecklist.tarefaId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type TarefasOntologyIndexType = typeof tarefasOntologyIndex;

export default tarefasOntologyIndex;
