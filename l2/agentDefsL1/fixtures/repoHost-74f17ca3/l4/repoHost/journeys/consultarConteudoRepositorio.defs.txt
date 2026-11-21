/// <mls fileReference="_102047_/l4/repoHost/journeys/consultarConteudoRepositorio.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const consultarConteudoRepositorioJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "consultarConteudoRepositorio",
  "business": {
    "actorRef": "administrador",
    "title": "Consultar conteúdo do repositório",
    "goal": "Conferir se a integração está funcionando: navegar pelas pastas e arquivos do repositório e ler um arquivo.",
    "icon": "folder-git-2",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "listarPastasArquivos",
        "kind": "locate",
        "entity": "RepositoryEntry",
        "title": "Listar pastas e arquivos",
        "description": "O administrador navega pelas pastas do repositório e vê os arquivos de cada uma.",
        "icon": "folder-tree"
      },
      {
        "stepId": "lerArquivo",
        "kind": "inspect",
        "entity": "RepositoryEntry",
        "title": "Ler arquivo",
        "description": "O administrador abre um arquivo e lê o conteúdo atual trazido do serviço que hospeda o repositório.",
        "icon": "file-text"
      }
    ],
    "outcome": {
      "statement": "O administrador confirma que o módulo acessa o repositório e lê seu conteúdo.",
      "evidence": [
        "A lista de pastas e arquivos do repositório é exibida",
        "O conteúdo do arquivo escolhido é exibido"
      ]
    }
  },
  "businessHash": "sha256:78981516bd73f226e5e0acd1ce769be16a8d31337d6f41550249c56dc15f5817"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConsultarConteudoRepositorioJourneyType = typeof consultarConteudoRepositorioJourney;

export default consultarConteudoRepositorioJourney;
