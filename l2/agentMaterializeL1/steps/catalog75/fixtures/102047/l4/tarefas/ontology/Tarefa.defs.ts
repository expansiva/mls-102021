/// <mls fileReference="_102047_/l4/tarefas/ontology/Tarefa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityTarefa = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "entityId": "Tarefa",
  "title": "Tarefa",
  "description": "Tarefa com título, descrição, prioridade, prazo, lista, responsável, quem criou, tarefa pai opcional e etiquetas; percorre as situações a fazer, em andamento, em revisão, concluída e cancelada, como ocorrência do processo de tarefa da plataforma, com a conversa da própria tarefa.",
  "displayField": "titulo",
  "relationships": {
    "lista": {
      "relationshipId": "tarefaLista",
      "to": "ListaTarefas",
      "via": "Tarefa.listaId",
      "cardinality": "N:1",
      "title": "Lista da tarefa",
      "mode": "fk",
      "required": true
    },
    "responsavel": {
      "relationshipId": "tarefaResponsavel",
      "to": "Participante",
      "via": "Tarefa.responsavelId",
      "cardinality": "N:1",
      "title": "Responsável",
      "mode": "fk",
      "required": true
    },
    "criador": {
      "relationshipId": "tarefaCriador",
      "to": "Participante",
      "via": "Tarefa.criadorId",
      "cardinality": "N:1",
      "title": "Quem criou",
      "mode": "fk",
      "required": true
    },
    "tarefaPai": {
      "relationshipId": "tarefaPai",
      "to": "Tarefa",
      "via": "Tarefa.tarefaPaiId",
      "cardinality": "N:1",
      "title": "Tarefa pai",
      "mode": "fk",
      "required": "quando a tarefa é uma subtarefa"
    },
    "itensChecklist": {
      "relationshipId": "itemChecklistTarefa",
      "to": "ItemChecklist",
      "via": "ItemChecklist.tarefaId",
      "cardinality": "1:N",
      "title": "Itens da checklist",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre a tarefa pelo id, a partir de um aviso, do quadro ou de uma lista; usado pelo membro e pelo gestor.",
    "locate.byColumn": "Lista tarefas filtradas por lista, responsável, quem criou, prioridade, prazo e situação, paginadas; alimenta minhas tarefas do membro e a lista e o quadro por situação do gestor, com lista vazia e erro separados.",
    "locate.byText": "Busca tarefas pelo título digitado numa caixa de busca; usado pelo membro e pelo gestor.",
    "count": "Conta tarefas por situação para os cabeçalhos das colunas do quadro e os totais de minhas tarefas.",
    "listByForeignKey": "Lista as subtarefas de uma tarefa pai e as tarefas de uma lista ou de um responsável, no detalhe da tarefa e nas visões do gestor.",
    "create": "Registra a tarefa com título, descrição, prioridade, prazo, lista, tarefa pai, etiquetas e responsável; usado pelo membro que pode criar tarefas.",
    "update": "Altera os campos da tarefa sem mudar a situação, e troca o responsável quando quem criou ou o gestor reatribui.",
    "transition": "Move a tarefa entre a fazer, em andamento, em revisão, concluída e cancelada, com a regra de quem pode cada passo verificada no módulo; usado pelo responsável, por quem criou e pelo gestor.",
    "transaction": "Grava a tarefa e os itens iniciais da checklist juntos, tudo ou nada, na criação.",
    "read.mdmRecord": "Lê o nome do responsável e de quem criou no registro mestre da pessoa para mostrar nas listas, no quadro e no detalhe.",
    "tarefas.processoTarefa": "Abre a ocorrência do processo de tarefa na plataforma ao criar, avisa o responsável e, a cada mudança de situação ou reatribuição, troca e avisa quem age agora.",
    "tarefas.conversaTarefa": "Dá acesso à conversa da própria tarefa na plataforma, com os anexos nas mensagens; o módulo não guarda comentários nem anexos.",
    "tarefas.resumoDiario": "Todo dia às 8h envia a cada responsável as suas tarefas abertas que vencem hoje ou estão atrasadas, sem iniciar novo aviso para quem tem um em andamento e sem bloquear os demais."
  },
  "rules": [
    "podeCriarTarefasExigido",
    "responsavelAceitaTarefas",
    "escolhaResponsavelPeloNome",
    "apenasResponsavelExecuta",
    "apenasCriadorRevisa",
    "devolucaoExigeMotivo",
    "retomarSoAposDevolucao",
    "cancelarApenasCriadorOuGestor",
    "reatribuirApenasCriadorOuGestor",
    "edicaoNaoMudaSituacao",
    "tarefaPaiDiferenteDaPropria",
    "quemAgeAgoraPorSituacao",
    "avisarQuemAgeAgora",
    "resumoDiarioOitoHoras",
    "avisoNaoSobrepostoPorPessoa",
    "membroVeResponsavelOuCriador"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "tarefas_tarefa",
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
      "titulo": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Título",
        "description": "Título curto da tarefa, mostrado nas listas, no quadro e nos avisos; usado na busca por texto.",
        "maxLength": 200
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "aFazer",
            "title": "A fazer"
          },
          {
            "value": "emAndamento",
            "title": "Em andamento"
          },
          {
            "value": "emRevisao",
            "title": "Em revisão"
          },
          {
            "value": "concluida",
            "title": "Concluída"
          },
          {
            "value": "cancelada",
            "title": "Cancelada"
          }
        ],
        "title": "Situação",
        "description": "Situação atual da tarefa no seu ciclo; muda só pelas ações de iniciar, enviar para revisão, aceitar, devolver, retomar e cancelar, nunca pela edição dos campos."
      },
      "prioridade": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "baixa",
            "title": "Baixa"
          },
          {
            "value": "media",
            "title": "Média"
          },
          {
            "value": "alta",
            "title": "Alta"
          }
        ],
        "title": "Prioridade",
        "description": "Prioridade da tarefa, usada para filtrar e ordenar as listas e o quadro do gestor."
      },
      "prazo": {
        "type": "date",
        "indexed": true,
        "title": "Prazo",
        "description": "Data até a qual a tarefa deve ser concluída; usada no filtro do gestor e no resumo diário das 8h (vence hoje ou atrasada)."
      },
      "listaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "ListaTarefas"
        ],
        "title": "Lista",
        "description": "Lista (projeto ou área) à qual a tarefa pertence."
      },
      "responsavelId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Participante"
        ],
        "title": "Responsável",
        "description": "Participante que executa a tarefa, escolhido pelo nome numa lista com busca entre quem aceita tarefas; nunca pelo e-mail."
      },
      "criadorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Participante"
        ],
        "title": "Quem criou",
        "description": "Participante que criou a tarefa; revisa, aceita, devolve, reatribui ou cancela. Preenchido com a pessoa da sessão na criação."
      },
      "tarefaPaiId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Tarefa"
        ],
        "title": "Tarefa pai",
        "description": "Quando preenchida, esta tarefa é uma subtarefa da tarefa indicada."
      },
      "criadaEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Criada em",
        "description": "Momento em que a tarefa foi registrada, preenchido pelo sistema; usado para ordenar as listas."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Demais dados da tarefa.",
        "fields": {
          "descricao": {
            "type": "text",
            "title": "Descrição",
            "description": "Descrição livre do que deve ser feito."
          },
          "etiquetas": {
            "type": "string",
            "collection": true,
            "title": "Etiquetas",
            "description": "Etiquetas livres que ajudam a identificar a tarefa.",
            "maxLength": 40
          },
          "motivoDevolucao": {
            "type": "text",
            "title": "Motivo da devolução",
            "description": "Motivo informado por quem criou ao devolver a tarefa para o responsável; lido pelo responsável ao retomar."
          },
          "devolvidaEm": {
            "type": "timestamp",
            "title": "Devolvida em",
            "description": "Momento da última devolução, preenchido pelo sistema ao devolver."
          },
          "retomadaEm": {
            "type": "timestamp",
            "title": "Retomada em",
            "description": "Momento em que o responsável retomou a tarefa devolvida, preenchido pelo sistema."
          },
          "concluidaEm": {
            "type": "timestamp",
            "title": "Concluída em",
            "description": "Momento em que quem criou aceitou a entrega."
          },
          "canceladaEm": {
            "type": "timestamp",
            "title": "Cancelada em",
            "description": "Momento do cancelamento da tarefa."
          },
          "quemAgeAgora": {
            "type": "record",
            "to": [
              "Participante"
            ],
            "derived": true,
            "title": "Quem age agora",
            "description": "Pessoa de quem a tarefa depende agora: o responsável quando está a fazer ou em andamento, quem criou quando está em revisão, e ninguém quando está concluída ou cancelada; reatribuir troca o responsável e, com ele, quem age agora."
          },
          "aberta": {
            "type": "boolean",
            "derived": true,
            "title": "Aberta",
            "description": "Verdadeiro quando a tarefa não está concluída nem cancelada."
          },
          "venceHoje": {
            "type": "boolean",
            "derived": true,
            "title": "Vence hoje",
            "description": "Tarefa aberta cujo prazo é a data de hoje."
          },
          "atrasada": {
            "type": "boolean",
            "derived": true,
            "title": "Atrasada",
            "description": "Tarefa aberta com prazo anterior a hoje."
          },
          "devolvidaPendente": {
            "type": "boolean",
            "derived": true,
            "title": "Devolvida aguardando retomada",
            "description": "Tarefa em andamento que foi devolvida por quem criou e que o responsável ainda não retomou depois da devolução."
          },
          "quantidadeSubtarefas": {
            "type": "integer",
            "derived": true,
            "title": "Subtarefas",
            "description": "Quantidade de tarefas que apontam esta como tarefa pai."
          },
          "progressoChecklist": {
            "type": "string",
            "derived": true,
            "title": "Progresso da checklist",
            "description": "Itens marcados sobre o total de itens da checklist desta tarefa, por exemplo 3 de 5."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "aFazer",
      "reachedBy": "actor"
    },
    {
      "state": "emAndamento",
      "reachedBy": "actor"
    },
    {
      "state": "emRevisao",
      "reachedBy": "actor"
    },
    {
      "state": "concluida",
      "reachedBy": "actor"
    },
    {
      "state": "cancelada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "iniciar",
      "from": [
        "aFazer"
      ],
      "to": "emAndamento",
      "by": [
        "membroEquipe"
      ],
      "description": "O responsável inicia a tarefa; ele continua sendo quem age agora.",
      "payload": [],
      "ruleRefs": [
        "apenasResponsavelExecuta"
      ]
    },
    {
      "transitionId": "enviarParaRevisao",
      "from": [
        "emAndamento"
      ],
      "to": "emRevisao",
      "by": [
        "membroEquipe"
      ],
      "description": "O responsável envia a tarefa para revisão; quem criou passa a agir agora e é avisado.",
      "payload": [],
      "ruleRefs": [
        "apenasResponsavelExecuta",
        "avisarQuemAgeAgora"
      ]
    },
    {
      "transitionId": "aceitar",
      "from": [
        "emRevisao"
      ],
      "to": "concluida",
      "by": [
        "membroEquipe"
      ],
      "description": "Quem criou aceita a entrega e a tarefa fica concluída.",
      "payload": [],
      "ruleRefs": [
        "apenasCriadorRevisa"
      ]
    },
    {
      "transitionId": "devolver",
      "from": [
        "emRevisao"
      ],
      "to": "emAndamento",
      "by": [
        "membroEquipe"
      ],
      "description": "Quem criou devolve a tarefa com o motivo; ela volta a em andamento e o responsável é avisado.",
      "payload": [
        "details.motivoDevolucao"
      ],
      "ruleRefs": [
        "apenasCriadorRevisa",
        "devolucaoExigeMotivo",
        "avisarQuemAgeAgora"
      ]
    },
    {
      "transitionId": "retomar",
      "from": [
        "emAndamento"
      ],
      "to": "emAndamento",
      "by": [
        "membroEquipe"
      ],
      "description": "O responsável, depois de ler o motivo, retoma a tarefa devolvida para continuar o trabalho; a situação permanece em andamento.",
      "payload": [],
      "ruleRefs": [
        "apenasResponsavelExecuta",
        "retomarSoAposDevolucao"
      ]
    },
    {
      "transitionId": "cancelar",
      "from": [
        "aFazer",
        "emAndamento",
        "emRevisao"
      ],
      "to": "cancelada",
      "by": [
        "gestor",
        "membroEquipe"
      ],
      "description": "Quem criou ou o gestor cancela a tarefa; quem estava agindo é avisado.",
      "payload": [],
      "ruleRefs": [
        "cancelarApenasCriadorOuGestor",
        "avisarQuemAgeAgora"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type TarefasEntityTarefaType = typeof tarefasEntityTarefa;

export default tarefasEntityTarefa;
