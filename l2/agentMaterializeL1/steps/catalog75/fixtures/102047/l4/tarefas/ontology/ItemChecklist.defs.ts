/// <mls fileReference="_102047_/l4/tarefas/ontology/ItemChecklist.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityItemChecklist = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "entityId": "ItemChecklist",
  "title": "Item da checklist",
  "description": "Item marcável da checklist de uma tarefa, adicionado por quem cria ou edita e marcado pelo responsável.",
  "displayField": "details.descricao",
  "relationships": {
    "tarefa": {
      "relationshipId": "itemChecklistTarefa",
      "to": "Tarefa",
      "via": "ItemChecklist.tarefaId",
      "cardinality": "N:1",
      "title": "Tarefa do item",
      "description": "Cada item da checklist pertence a uma tarefa.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um item da checklist pelo id quando o membro abre ou edita o item na tela da tarefa.",
    "listByForeignKey": "Lista os itens de uma tarefa pela coluna tarefaId, em ordem, para mostrar a checklist na tela da tarefa; findManyByValues preenche a contagem de itens nas listas e no quadro.",
    "locate.byColumn": "Filtra os itens de uma tarefa por tarefa e ordem, paginado, para o responsável percorrer checklists longas.",
    "count": "Conta itens totais e concluídos de uma tarefa para o indicador de progresso da checklist mostrado ao membro e ao gestor.",
    "create": "Adiciona um item marcável à checklist quando o membro cria ou edita a tarefa.",
    "update": "Altera a descrição ou marca e desmarca o item, pelo responsável ou por quem vê a tarefa, sem mudar a situação da tarefa.",
    "delete": "Remove um item da checklist quando o membro que edita a tarefa o retira.",
    "transaction": "Grava a tarefa e os itens iniciais da checklist juntos ao criar a tarefa, tudo ou nada."
  },
  "rules": [
    "itemChecklistSoQuemVeTarefa",
    "marcarItemNaoMudaSituacao",
    "itemChecklistTarefaNaoEncerrada"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "tarefas_itemchecklist",
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
      "tarefaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tarefa"
        ],
        "title": "Tarefa",
        "description": "Tarefa a que este item da checklist pertence."
      },
      "ordem": {
        "type": "integer",
        "required": true,
        "indexed": true,
        "title": "Ordem",
        "description": "Posição do item na checklist da tarefa; a checklist é mostrada nessa ordem.",
        "min": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do item",
        "description": "Conteúdo do item da checklist.",
        "fields": {
          "descricao": {
            "type": "string",
            "required": true,
            "title": "Descrição",
            "description": "Texto do item marcável, como aparece na checklist da tarefa.",
            "maxLength": 300
          },
          "concluido": {
            "type": "boolean",
            "required": true,
            "title": "Concluído",
            "description": "Marcado quando o item foi feito; o responsável ou quem vê a tarefa marca e desmarca sem mudar a situação da tarefa."
          },
          "concluidoEm": {
            "type": "timestamp",
            "derived": true,
            "title": "Concluído em",
            "description": "Momento em que o item foi marcado como concluído, preenchido pelo sistema ao marcar e limpo ao desmarcar."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type TarefasEntityItemChecklistType = typeof tarefasEntityItemChecklist;

export default tarefasEntityItemChecklist;
