/// <mls fileReference="_102047_/l4/controleEstoque/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "controleEstoque",
  "actors": [
    {
      "actorId": "estoquista",
      "kind": "internal",
      "origin": "named",
      "title": "Estoquista",
      "description": "Registra e acompanha as movimentações e os saldos do estoque.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "gerenciarEstoque",
      "actorRef": "estoquista",
      "title": "Gerenciar estoque",
      "description": "Permite ao estoquista cadastrar produtos acompanhados, registrar movimentações de entrada e saída e consultar saldos, quantidades mínimas e avisos de saldo baixo de toda a organização.",
      "entityRefs": [
        "Produto",
        "MovimentacaoEstoque"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os produtos e as movimentações de estoque de toda a organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Permite visualizar todos os dados dos produtos acompanhados e das movimentações de estoque, inclusive saldo atual, quantidade mínima e aviso de saldo abaixo do mínimo."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ControleEstoqueAccessType = typeof controleEstoqueAccess;

export default controleEstoqueAccess;
