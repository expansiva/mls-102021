/// <mls fileReference="_102047_/l4/comandaRestaurante/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "comandaRestaurante",
  "rules": {
    "pagamentoObrigatorioNoFechamento": "A comanda só pode ser fechada com uma forma de pagamento registrada.",
    "descontoNaoExcedeSubtotal": "O desconto aplicado no fechamento não pode exceder o subtotal da comanda.",
    "fechamentoLiberaMesa": "O fechamento da comanda deve deixar disponível a mesa a ela vinculada.",
    "itemComandaOperacaoSomenteComandaAberta": "Um item lançado só pode ser cancelado enquanto sua comanda estiver aberta.",
    "mesaDisponivelParaAbrirComanda": "Uma comanda só pode ser aberta para uma mesa disponível.",
    "umaComandaAbertaPorMesa": "Uma mesa não pode ter mais de uma comanda aberta simultaneamente.",
    "itensSomenteEmComandaAberta": "Um item só pode ser lançado em uma comanda aberta.",
    "precoUnitarioRegistradoNoLancamento": "O preço unitário do item da comanda deve corresponder ao preço vigente do item do cardápio no momento do lançamento.",
    "valorTotalItemComandaCalculado": "O valor total de um item da comanda deve ser calculado pela multiplicação da quantidade pelo preço unitário registrado.",
    "subtotalComandaCalculado": "O subtotal da comanda deve ser calculado pela soma dos valores dos itens não cancelados.",
    "totalComandaCalculado": "O total da comanda deve ser calculado pela subtração do desconto aplicado ao subtotal."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ComandaRestauranteRulesType = typeof comandaRestauranteRules;

export default comandaRestauranteRules;
