/// <mls fileReference="_102047_/l4/tarefas/ontology/ListaTarefas.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityListaTarefas = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "entityId": "ListaTarefas",
  "title": "Lista de tarefas",
  "description": "Cadastro simples do gestor que agrupa tarefas por projeto ou área.",
  "displayField": "nome",
  "relationships": {
    "tarefas": {
      "relationshipId": "tarefaLista",
      "to": "Tarefa",
      "via": "Tarefa.listaId",
      "cardinality": "1:N",
      "title": "Tarefas da lista",
      "description": "Cada tarefa pertence a uma lista; a lista agrupa muitas tarefas.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê uma lista pelo id quando o gestor abre a lista para editar ou quando a tarefa mostra a lista a que pertence.",
    "locate.byColumn": "Lista as listas ordenadas pelo nome, paginadas, na tela de listas do gestor e no seletor de lista da tarefa, com lista vazia e erro mostrados separadamente.",
    "locate.byText": "Busca listas pelo texto digitado no nome, na caixa de busca da tela de listas e no seletor de lista da tarefa.",
    "count": "Conta as listas cadastradas para o total no cabeçalho da tela de listas do gestor.",
    "create": "Grava uma nova lista com o nome informado pelo gestor na jornada de manter listas.",
    "update": "Altera o nome ou a descrição de uma lista existente, feito pelo gestor.",
    "uniqueKey": "Recusa uma segunda lista com o mesmo nome, garantido pelo índice único no nome ao gravar."
  },
  "rules": [
    "nomeListaUnico",
    "somenteGestorMantemListas"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "tarefas_listatarefas",
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
      "nome": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Nome",
        "description": "Nome da lista, pelo qual o gestor e a equipe a reconhecem, buscam e ordenam (projeto ou área).",
        "maxLength": 120
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados da lista que ninguém filtra.",
        "fields": {
          "descricao": {
            "type": "text",
            "title": "Descrição",
            "description": "Texto livre explicando o projeto ou a área que a lista agrupa.",
            "maxLength": 2000
          },
          "quantidadeTarefasAbertas": {
            "type": "integer",
            "derived": true,
            "title": "Tarefas abertas",
            "description": "Quantidade de tarefas desta lista que ainda não foram concluídas nem canceladas."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "nome"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type TarefasEntityListaTarefasType = typeof tarefasEntityListaTarefas;

export default tarefasEntityListaTarefas;
