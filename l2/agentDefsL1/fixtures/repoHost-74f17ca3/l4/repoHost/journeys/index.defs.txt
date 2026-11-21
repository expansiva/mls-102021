/// <mls fileReference="_102047_/l4/repoHost/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const repoHostJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "repoHost",
  "journeys": [
    {
      "journeyId": "consultarConteudoRepositorio",
      "actorRef": "administrador",
      "title": "Consultar conteúdo do repositório"
    },
    {
      "journeyId": "acompanharAvisosMudanca",
      "actorRef": "administrador",
      "title": "Acompanhar avisos de mudança"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type RepoHostJourneyIndexType = typeof repoHostJourneyIndex;

export default repoHostJourneyIndex;
