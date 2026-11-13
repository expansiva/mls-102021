/// <mls fileReference="_102047_/l4/compras/ontology/OpcaoCotacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityOpcaoCotacao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "OpcaoCotacao",
  "title": "Opção pesquisada",
  "description": "Estimativa de fornecedor e preço pesquisada por IA para uma solicitação (até três), com preço unitário, moeda, prazo de entrega, fonte e data da pesquisa; nunca autoriza nem compra.",
  "displayField": "fornecedorNome",
  "relationships": {
    "solicitacao": {
      "relationshipId": "opcaoSolicitacao",
      "to": "SolicitacaoCompra",
      "via": "OpcaoCotacao.solicitacaoId",
      "cardinality": "N:1",
      "title": "Solicitação de compra",
      "description": "A opção pesquisada pertence a uma solicitação.",
      "mode": "fk",
      "required": true
    },
    "fornecedor": {
      "relationshipId": "opcaoFornecedor",
      "to": "Fornecedor",
      "via": "OpcaoCotacao.fornecedorId",
      "cardinality": "N:1",
      "title": "Fornecedor",
      "description": "Fornecedor registrado apontado pela opção.",
      "mode": "fk",
      "required": "quando a fonte é um fornecedor cadastrado ou uma compra anterior"
    },
    "pedidoOrigem": {
      "relationshipId": "opcaoPedidoAnterior",
      "to": "PedidoCompra",
      "via": "OpcaoCotacao.pedidoOrigemId",
      "cardinality": "N:1",
      "title": "Compra anterior de origem",
      "mode": "fk",
      "required": "quando a fonte é uma compra anterior"
    },
    "solicitacoesQueEscolheram": {
      "relationshipId": "solicitacaoOpcaoEscolhida",
      "to": "SolicitacaoCompra",
      "via": "SolicitacaoCompra.opcaoEscolhidaId",
      "cardinality": "1:N",
      "title": "Escolhida na autorização",
      "description": "Solicitação cujo gerente escolheu esta opção ao autorizar.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma opção pesquisada pelo id, quando o gerente abre a opção escolhida ou o pedido gerado mostra sua origem.",
    "listByForeignKey": "Lista as até três opções de uma solicitação pela coluna solicitacaoId, e de várias solicitações de uma vez nas listas; usado pelo comprador e pelo gerente de compras na tela da solicitação.",
    "locate.byColumn": "Filtra opções por fornecedor, tipo de fonte e data da pesquisa, ordenadas pela posição; usado pelo comprador e pelo gerente ao comparar estimativas.",
    "locate.byText": "Procura opções pelo nome do fornecedor digitado, na pesquisa de solicitações por fornecedor do comprador e do gerente.",
    "count": "Conta as opções de uma solicitação para mostrar quantas estimativas existem e garantir o limite de três.",
    "create": "Grava cada opção encontrada pela etapa de pesquisa por IA do processo da solicitação; nenhuma pessoa cria opções.",
    "transaction": "Grava as até três opções de uma pesquisa de uma só vez, tudo ou nada, pelo processo da solicitação.",
    "uniqueKey": "Recusa duas opções com a mesma posição na mesma solicitação (solicitacaoId + posicao), aplicado pelo motor na gravação.",
    "read.mdmRecord": "Lê o cadastro do fornecedor apontado pela opção para mostrar razão social e contato ao gerente de compras.",
    "comment": "Permite ao gerente de compras deixar uma nota sobre a opção ao analisá-la."
  },
  "rules": [
    "opcaoMaximoTresPorSolicitacao",
    "opcaoSomenteEstimativa",
    "opcaoFonteObrigatoria",
    "opcaoPedidoOrigemQuandoCompraAnterior",
    "opcaoGravadaSomentePelaPesquisa"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_opcaocotacao",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "solicitacaoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "SolicitacaoCompra"
        ],
        "title": "Solicitação",
        "description": "Solicitação de compra para a qual esta opção foi pesquisada."
      },
      "posicao": {
        "type": "integer",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Posição",
        "description": "Ordem da opção dentro da solicitação (1 a 3), atribuída pela pesquisa; impede mais de três opções por solicitação.",
        "min": 1,
        "max": 3
      },
      "fornecedorId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Fornecedor"
        ],
        "title": "Fornecedor cadastrado",
        "description": "Fornecedor do módulo apontado pela opção, quando ele já está registrado."
      },
      "fornecedorNome": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Fornecedor",
        "description": "Nome do fornecedor como encontrado pela pesquisa; para fornecedor cadastrado é o nome lido do cadastro no momento da pesquisa, para fornecedor da web é o nome encontrado na página. Usado na pesquisa de solicitações por fornecedor.",
        "maxLength": 200
      },
      "pedidoOrigemId": {
        "type": "record",
        "indexed": true,
        "to": [
          "PedidoCompra"
        ],
        "title": "Compra anterior de origem",
        "description": "Pedido de compra anterior usado como fonte, quando a opção vem do histórico do módulo."
      },
      "tipoFonte": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "web",
            "title": "Página da web"
          },
          {
            "value": "previousPurchase",
            "title": "Compra anterior"
          },
          {
            "value": "registeredSupplier",
            "title": "Fornecedor cadastrado (preço combinado)"
          }
        ],
        "title": "Tipo de fonte",
        "description": "De onde veio a opção pesquisada."
      },
      "dataPesquisa": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Data da pesquisa",
        "description": "Momento em que a IA pesquisou esta opção, gravado pelo sistema."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes da opção",
        "description": "Dados da estimativa exibidos na solicitação.",
        "fields": {
          "precoUnitario": {
            "type": "money",
            "required": true,
            "title": "Preço unitário",
            "description": "Preço unitário estimado do produto nesta opção.",
            "min": 0
          },
          "moeda": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "BRL",
                "title": "Real (BRL)"
              },
              {
                "value": "USD",
                "title": "Dólar (USD)"
              },
              {
                "value": "EUR",
                "title": "Euro (EUR)"
              }
            ],
            "title": "Moeda",
            "description": "Moeda do preço unitário encontrado."
          },
          "prazoEntregaDias": {
            "type": "integer",
            "title": "Prazo de entrega (dias)",
            "description": "Prazo de entrega informado pela fonte, em dias corridos.",
            "min": 0
          },
          "fonte": {
            "type": "object",
            "required": true,
            "title": "Fonte",
            "description": "Referência que permite conferir de onde veio a estimativa.",
            "fields": {
              "url": {
                "type": "string",
                "title": "Endereço da página",
                "description": "Endereço da página da web consultada, quando a fonte é a web.",
                "pattern": "^https?://",
                "maxLength": 2000
              },
              "descricao": {
                "type": "text",
                "title": "Descrição da fonte",
                "description": "Resumo do que a IA encontrou na fonte (oferta, compra anterior ou preço combinado).",
                "maxLength": 1000
              }
            }
          },
          "estimativa": {
            "type": "boolean",
            "required": true,
            "title": "Estimativa",
            "description": "Sempre verdadeiro: a opção é apenas uma estimativa e nunca autoriza nem compra nada."
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Ressalvas da pesquisa sobre a opção (disponibilidade, frete, condições).",
            "maxLength": 1000
          },
          "escolhida": {
            "type": "boolean",
            "derived": true,
            "title": "Escolhida",
            "description": "Verdadeiro quando o gerente de compras escolheu esta opção ao autorizar a solicitação."
          },
          "valorTotalEstimado": {
            "type": "money",
            "derived": true,
            "title": "Valor total estimado",
            "description": "Preço unitário desta opção multiplicado pela quantidade pedida na solicitação, na moeda da opção."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "solicitacaoId",
      "posicao"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityOpcaoCotacaoType = typeof comprasEntityOpcaoCotacao;

export default comprasEntityOpcaoCotacao;
