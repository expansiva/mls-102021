/// <mls fileReference="_102047_/l4/tarefas/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "tarefas",
  "actors": [
    {
      "actorId": "membroEquipe",
      "kind": "internal",
      "origin": "named",
      "title": "Membro da equipe",
      "description": "Cria tarefas, executa as que lhe são atribuídas (inicia e envia para revisão) e revisa as que criou (aceita, devolve com motivo ou cancela).",
      "personEntity": "MembroEquipe"
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor",
      "description": "Faz tudo o que o membro faz e, além disso, vê e acompanha todas as tarefas da equipe, mantém as listas, reatribui e cancela tarefas.",
      "personEntity": "MembroEquipe"
    }
  ],
  "grants": [
    {
      "grantId": "membroTarefasProprias",
      "actorRef": "membroEquipe",
      "title": "Tarefas que criei ou que me foram atribuídas",
      "description": "O membro cria tarefas, executa as que lhe são atribuídas, revisa, devolve, cancela e reatribui as que criou e edita os campos das tarefas que vê, junto com a checklist.",
      "entityRefs": [
        "Tarefa",
        "ItemChecklist"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Tarefas em que o membro da sessão é o responsável ou o criador, e os itens de checklist dessas tarefas.",
        "anchorEntity": "MembroEquipe"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O membro vê a tarefa completa, incluindo motivo de devolução, andamento e checklist."
      }
    },
    {
      "grantId": "membroAvisosProprios",
      "actorRef": "membroEquipe",
      "title": "Meus avisos diários de vencimento",
      "description": "O membro consulta o aviso diário com as suas tarefas abertas que vencem hoje ou estão atrasadas.",
      "entityRefs": [
        "AvisoVencimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente os avisos em que o membro da sessão é o responsável.",
        "anchorEntity": "MembroEquipe"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O membro vê o aviso inteiro com as tarefas listadas."
      }
    },
    {
      "grantId": "membroConsultaListas",
      "actorRef": "membroEquipe",
      "title": "Escolher a lista da tarefa",
      "description": "O membro consulta as listas para escolher onde a nova tarefa ficará.",
      "entityRefs": [
        "Lista"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as listas da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, situação, tipo e descrição da lista; os indicadores de acompanhamento ficam com o gestor.",
        "allowedFields": [
          "Lista.nome",
          "Lista.ativa",
          "Lista.details.tipo",
          "Lista.details.descricao"
        ]
      }
    },
    {
      "grantId": "membroEscolheResponsavel",
      "actorRef": "membroEquipe",
      "title": "Escolher responsável na equipe",
      "description": "O membro vê os nomes das pessoas da equipe para atribuir ou reatribuir a tarefa.",
      "entityRefs": [
        "MembroEquipe"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as pessoas da equipe."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Somente nome e situação (ativo ou inativo) de cada membro.",
        "allowedFields": [
          "MembroEquipe.details.identification.name",
          "MembroEquipe.details.identification.status"
        ]
      }
    },
    {
      "grantId": "gestorTarefasEquipe",
      "actorRef": "gestor",
      "title": "Todas as tarefas da equipe",
      "description": "O gestor vê, acompanha, edita, reatribui e cancela qualquer tarefa da equipe, além de fazer tudo o que o membro faz, com a checklist.",
      "entityRefs": [
        "Tarefa",
        "ItemChecklist"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as tarefas e itens de checklist da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê a tarefa completa em lista ou em quadro por situação."
      }
    },
    {
      "grantId": "gestorListas",
      "actorRef": "gestor",
      "title": "Manter listas",
      "description": "O gestor cadastra, altera e acompanha as listas que agrupam tarefas por projeto ou área.",
      "entityRefs": [
        "Lista"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as listas da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê a lista inteira, incluindo a quantidade de tarefas abertas."
      }
    },
    {
      "grantId": "gestorMembros",
      "actorRef": "gestor",
      "title": "Pessoas da equipe",
      "description": "O gestor mantém o cadastro das pessoas da equipe neste módulo e escolhe responsáveis ao reatribuir.",
      "entityRefs": [
        "MembroEquipe"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as pessoas da equipe."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados de identificação e contato do membro, sem o registro de consentimento de privacidade.",
        "deniedFields": [
          "MembroEquipe.details.person.privacyConsent"
        ]
      }
    },
    {
      "grantId": "gestorAvisosProprios",
      "actorRef": "gestor",
      "title": "Meus avisos diários de vencimento",
      "description": "Como responsável de tarefas, o gestor consulta o seu aviso diário de tarefas que vencem hoje ou estão atrasadas.",
      "entityRefs": [
        "AvisoVencimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente os avisos em que o gestor da sessão é o responsável.",
        "anchorEntity": "MembroEquipe"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor vê o aviso inteiro com as tarefas listadas."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type TarefasAccessType = typeof tarefasAccess;

export default tarefasAccess;
