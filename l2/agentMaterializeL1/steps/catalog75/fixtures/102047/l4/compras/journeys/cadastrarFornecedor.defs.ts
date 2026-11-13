/// <mls fileReference="_102047_/l4/compras/journeys/cadastrarFornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarFornecedorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarFornecedor",
  "business": {
    "actorRef": "comprador",
    "title": "Cadastrar fornecedor e produtos",
    "goal": "Registrar um fornecedor e os produtos que ele fornece com preço combinado.",
    "icon": "building-2",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarFornecedor",
        "kind": "locate",
        "entity": "Fornecedor",
        "title": "Buscar fornecedor",
        "description": "O comprador procura o fornecedor pelo CNPJ ou razão social para evitar duplicidade.",
        "icon": "search"
      },
      {
        "stepId": "registrarFornecedor",
        "kind": "act",
        "entity": "Fornecedor",
        "effect": "create",
        "title": "Cadastrar fornecedor",
        "description": "O comprador informa CNPJ, razão social e contato do fornecedor, que é criado ou vinculado ao cadastro existente.",
        "icon": "building-2"
      },
      {
        "stepId": "registrarProdutoFornecido",
        "kind": "act",
        "entity": "ProdutoFornecido",
        "effect": "create",
        "title": "Adicionar produto fornecido",
        "description": "O comprador associa um produto ao fornecedor com o preço combinado.",
        "icon": "package-plus"
      }
    ],
    "outcome": {
      "statement": "O fornecedor está cadastrado com os produtos que fornece e seus preços combinados.",
      "evidence": [
        "Fornecedor aparece na lista com CNPJ e razão social",
        "Produtos fornecidos listados com preço combinado"
      ]
    }
  },
  "businessHash": "sha256:ab11370cc966b69c703cf84ee84dffc12353b36cd66a6142bdb79efc26cb5719"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarFornecedorJourneyType = typeof cadastrarFornecedorJourney;

export default cadastrarFornecedorJourney;
