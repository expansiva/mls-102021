/// <mls fileReference="_102047_/l4/repoHost/journeys/acompanharAvisosMudanca.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const acompanharAvisosMudancaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "acompanharAvisosMudanca",
  "business": {
    "actorRef": "administrador",
    "title": "Acompanhar avisos de mudança",
    "goal": "Ver os avisos recebidos do serviço quando o repositório mudou.",
    "icon": "git-commit-horizontal",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarAvisos",
        "kind": "locate",
        "entity": "RepositoryChange",
        "title": "Listar avisos recebidos",
        "description": "O administrador vê os avisos de mudança recebidos do serviço, do mais recente ao mais antigo.",
        "icon": "list"
      },
      {
        "stepId": "verAviso",
        "kind": "inspect",
        "entity": "RepositoryChange",
        "title": "Ver detalhes do aviso",
        "description": "O administrador abre um aviso e vê quando o repositório mudou, a mensagem de registro e os arquivos afetados.",
        "icon": "eye"
      }
    ],
    "outcome": {
      "statement": "O administrador sabe quais mudanças o serviço avisou no repositório.",
      "evidence": [
        "A lista de avisos de mudança recebidos é exibida",
        "Os detalhes do aviso escolhido, com mensagem de registro e arquivos afetados, são exibidos"
      ]
    }
  },
  "businessHash": "sha256:e1eaa1d4debc2781578b9c16f8650860415c45c8730f587edabad5e90fd59c52"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AcompanharAvisosMudancaJourneyType = typeof acompanharAvisosMudancaJourney;

export default acompanharAvisosMudancaJourney;
