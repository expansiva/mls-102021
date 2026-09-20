/// <mls fileReference="_102039_/l5/controleChamados/todoBackend.defs.ts" enhancement="_blank"/>

import type { Ns4L5TodoBackendArtifact } from '/_102020_/l2/agentNewSolution/types.js';

export const controleChamadosTodoBackend = {
  "schemaVersion": "2026-08-13-ns4-todo-backend-v1",
  "layer": "backend",
  "moduleName": "controleChamados",
  "owners": [
    {
      "ownerType": "useCase",
      "ownerId": "closeChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "createAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "createChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "createComentario",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "deleteChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "deleteComentario",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "getAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "getChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "getComentario",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "inactivateAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "listAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "listChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "listComentario",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "locateChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "reactivateAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "registerComentario",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "updateAtendente",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "updateChamado",
      "statusBackend": "done"
    },
    {
      "ownerType": "useCase",
      "ownerId": "updateComentario",
      "statusBackend": "done"
    }
  ]
} as const satisfies Ns4L5TodoBackendArtifact;

export type ControleChamadosTodoBackendType = typeof controleChamadosTodoBackend;

export default controleChamadosTodoBackend;
