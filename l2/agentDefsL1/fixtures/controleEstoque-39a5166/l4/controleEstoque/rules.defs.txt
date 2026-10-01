/// <mls fileReference="_102047_/l4/controleEstoque/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "controleEstoque",
  "rules": {
    "quantidadeMinimaValida": "A quantidade mínima definida para um produto deve ser maior ou igual a zero.",
    "saldoAtualProduto": "O saldo atual de cada produto é calculado pela soma das quantidades das entradas menos a soma das quantidades das saídas registradas para esse produto.",
    "avisoSaldoMinimoProduto": "Um produto deve ser sinalizado com aviso de saldo baixo quando seu saldo atual for menor que sua quantidade mínima definida.",
    "movimentacaoEstoqueImutavel": "Uma movimentação de estoque não pode ser alterada depois de registrada.",
    "quantidadeMovimentadaPositiva": "A quantidade registrada em uma movimentação de estoque deve ser um número inteiro positivo.",
    "registroMovimentacaoAtualizaSaldo": "O registro de uma entrada ou saída deve atualizar o saldo atual do produto correspondente conforme o tipo e a quantidade movimentada."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ControleEstoqueRulesType = typeof controleEstoqueRules;

export default controleEstoqueRules;
