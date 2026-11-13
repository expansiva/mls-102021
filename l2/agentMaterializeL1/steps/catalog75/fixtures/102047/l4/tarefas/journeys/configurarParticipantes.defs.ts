/// <mls fileReference="_102047_/l4/tarefas/journeys/configurarParticipantes.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const configurarParticipantesJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "configurarParticipantes",
  "business": {
    "actorRef": "gestor",
    "title": "Configurar participantes",
    "goal": "Escolher, entre os usuários da organização, quem participa do módulo e marcar quem aceita tarefas e quem pode criar tarefas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarUsuario",
        "kind": "locate",
        "entity": "Participante",
        "title": "Buscar usuário pelo nome",
        "description": "O gestor busca o usuário na lista de usuários da organização pelo nome, sem cadastrar ninguém nem pedir dado pessoal."
      },
      {
        "stepId": "incluirParticipante",
        "kind": "act",
        "entity": "Participante",
        "effect": "create",
        "title": "Incluir participante",
        "description": "O gestor inclui o usuário como participante; enquanto não configurado, ele aceita tarefas e pode criar tarefas."
      },
      {
        "stepId": "marcarPermissoes",
        "kind": "act",
        "entity": "Participante",
        "effect": "update",
        "title": "Marcar aceita e pode criar",
        "description": "O gestor marca se o participante aceita tarefas e se pode criar tarefas; uma escolha já feita nunca é sobrescrita automaticamente."
      }
    ],
    "outcome": {
      "statement": "O usuário participa do módulo com as marcas de aceitar e criar tarefas definidas pelo gestor.",
      "evidence": [
        "O participante aparece na lista de participantes com as marcas escolhidas",
        "Só quem aceita tarefas aparece na escolha de responsável"
      ]
    }
  },
  "businessHash": "sha256:86c4ff1298cb0c8d66a7aea5b51615752da30ea29acda68fd2e9cc612ac8ed91"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfigurarParticipantesJourneyType = typeof configurarParticipantesJourney;

export default configurarParticipantesJourney;
