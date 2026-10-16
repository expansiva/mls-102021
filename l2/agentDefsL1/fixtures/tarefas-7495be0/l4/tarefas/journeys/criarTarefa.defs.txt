/// <mls fileReference="_102047_/l4/tarefas/journeys/criarTarefa.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const criarTarefaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "criarTarefa",
  "business": {
    "actorRef": "membroEquipe",
    "title": "Criar tarefa",
    "goal": "Registrar uma nova tarefa e atribuí-la a um responsável.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarLista",
        "kind": "locate",
        "entity": "Lista",
        "title": "Escolher a lista",
        "description": "O membro escolhe a lista (projeto ou área) onde a tarefa ficará."
      },
      {
        "stepId": "preencherTarefa",
        "kind": "act",
        "entity": "Tarefa",
        "effect": "create",
        "title": "Criar a tarefa",
        "description": "Informa título, descrição, prioridade, prazo, responsável, tarefa pai opcional, checklist, etiquetas e anexos; reenviar após erro de rede não duplica a tarefa, e nascem a mensagem de origem e o acompanhamento com sua sala de discussão."
      },
      {
        "stepId": "avisarResponsavel",
        "kind": "handoff",
        "entity": "Tarefa",
        "title": "Avisar o responsável",
        "description": "O responsável é avisado de que recebeu a tarefa em situação a fazer.",
        "handoffTo": "membroEquipe"
      }
    ],
    "outcome": {
      "statement": "A tarefa existe na situação a fazer e o responsável foi avisado.",
      "evidence": [
        "Tarefa listada com situação a fazer na lista escolhida",
        "Responsável recebeu o aviso da nova tarefa",
        "Sala de discussão da tarefa aberta com a mensagem de origem"
      ]
    }
  },
  "businessHash": "sha256:7a84aba0e1e9c14142571af592a48ecce670e24ac166593b7f6747be522119cb"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CriarTarefaJourneyType = typeof criarTarefaJourney;

export default criarTarefaJourney;
