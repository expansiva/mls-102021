/// <mls fileReference="_102047_/l4/tarefas/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "tarefas",
  "inbound": [],
  "outbound": [
    {
      "id": "tarefaConcluida",
      "kind": "event",
      "to": "any",
      "event": "tarefaConcluida",
      "on": "Tarefa.aceitar",
      "description": "Publicado quando quem criou aceita a revisão e a tarefa fica concluída. Outros módulos podem usar o registro da tarefa (lista, responsável, prazo) para indicadores ou acompanhamento.",
      "entityRefs": [
        "Tarefa",
        "ListaTarefas"
      ]
    },
    {
      "id": "tarefaCancelada",
      "kind": "event",
      "to": "any",
      "event": "tarefaCancelada",
      "on": "Tarefa.cancelar",
      "description": "Publicado quando quem criou ou o gestor cancela a tarefa. Outros módulos podem usar o registro da tarefa para encerrar o que dependia dela.",
      "entityRefs": [
        "Tarefa",
        "ListaTarefas"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type TarefasIntegrationType = typeof tarefasIntegration;

export default tarefasIntegration;
