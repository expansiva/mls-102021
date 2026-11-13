/// <mls fileReference="_102047_/l4/tarefas/journeys/criarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const criarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Criar tarefa",
    "goal": "Registrar uma tarefa com responsável, prazo e prioridade para que seja executada.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "preencherTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "create",
        "title": "Nova tarefa",
        "description": "O membro que pode criar tarefas informa título, descrição, prioridade, prazo, lista, tarefa pai opcional, etiquetas e escolhe o responsável pelo nome numa lista com busca entre quem aceita tarefas; o responsável é avisado."
      },
      {
        "stepId": "adicionarChecklist",
        "kind": "act",
        "entity": "ItemChecklist",
        "effect": "create",
        "title": "Adicionar itens da checklist",
        "description": "O membro adiciona itens marcáveis à checklist da tarefa."
      }
    ],
    "outcome": {
      "statement": "A tarefa existe na situação a fazer e o responsável foi avisado.",
      "evidence": [
        "A tarefa aparece em a fazer nas tarefas criadas pelo membro",
        "O responsável recebe o aviso da nova tarefa"
      ]
    }
  },
  "businessHash": "sha256:a48a45820c70b44c615adc0d80a9d2ee7ec1a85d963aa064d317380a2b2222bb"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CriarTarefaJourneyType = typeof criarTarefaJourney;

export default criarTarefaJourney;
