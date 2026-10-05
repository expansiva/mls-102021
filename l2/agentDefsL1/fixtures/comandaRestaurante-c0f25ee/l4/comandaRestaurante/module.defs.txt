/// <mls fileReference="_102047_/l4/comandaRestaurante/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "comandaRestaurante",
  "title": "Comanda de Restaurante",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "módulo comandaRestaurante, português. o restaurante tem mesas e um cardápio com itens e preços. o garçom abre uma comanda para uma mesa, lança itens (com quantidade e observação), e pode cancelar um item lançado por engano enquanto a comanda estiver aberta. o caixa fecha a comanda: vê o total, aplica desconto opcional, registra a forma de pagamento e a mesa fica livre. perfis: garçom e caixa."
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;

export type ComandaRestauranteModuleType = typeof comandaRestauranteModule;

export default comandaRestauranteModule;
