/// <mls fileReference="_102047_/l4/compras/ontology/SolicitacaoCompra.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntitySolicitacaoCompra = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "SolicitacaoCompra",
  "title": "Solicitação de compra",
  "description": "Necessidade de compra com produto, quantidade, justificativa e data em que precisa; enviada, conferida, pesquisada e autorizada ou rejeitada.",
  "displayField": "numero",
  "relationships": {
    "produto": {
      "relationshipId": "solicitacaoProduto",
      "to": "Produto",
      "via": "SolicitacaoCompra.produtoId",
      "cardinality": "N:1",
      "title": "Produto solicitado",
      "description": "A solicitação pede um produto.",
      "mode": "fk",
      "required": true
    },
    "comprador": {
      "relationshipId": "solicitacaoComprador",
      "to": "Comprador",
      "via": "SolicitacaoCompra.compradorId",
      "cardinality": "N:1",
      "title": "Comprador",
      "description": "A solicitação foi aberta por um comprador.",
      "mode": "fk",
      "required": true
    },
    "opcoes": {
      "relationshipId": "opcaoSolicitacao",
      "to": "OpcaoCotacao",
      "via": "OpcaoCotacao.solicitacaoId",
      "cardinality": "1:N",
      "title": "Opções pesquisadas",
      "description": "Até três opções de fornecedor e preço pesquisadas para a solicitação, exibidas como estimativa.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "opcaoEscolhida": {
      "relationshipId": "solicitacaoOpcaoEscolhida",
      "to": "OpcaoCotacao",
      "via": "SolicitacaoCompra.opcaoEscolhidaId",
      "cardinality": "N:1",
      "title": "Opção escolhida",
      "description": "Opção escolhida pelo gerente ao autorizar.",
      "mode": "fk",
      "required": "quando a solicitação está autorizada"
    },
    "pedido": {
      "relationshipId": "pedidoSolicitacao",
      "to": "PedidoCompra",
      "via": "PedidoCompra.solicitacaoId",
      "cardinality": "1:1",
      "title": "Pedido de compra gerado",
      "description": "Pedido gerado a partir da solicitação autorizada.",
      "mode": "fk",
      "direction": "to",
      "required": "quando a solicitação está autorizada"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma solicitação pelo id ao abrir a tela de análise do gerente ou o detalhe do comprador.",
    "locate.byColumn": "Lista solicitações por situação, produto, comprador, opção escolhida e data de necessidade ou envio; usada pelo comprador e pelo gerente nas pesquisas e para localizar as aguardando autorização.",
    "locate.byText": "Busca solicitações pelo texto digitado, como o número, em caixas de pesquisa do comprador e do gerente.",
    "count": "Conta as solicitações de um filtro, alimentando o total de aguardando autorização do painel do gerente.",
    "listByForeignKey": "Lista as solicitações de um produto ou de um comprador, e as de um fornecedor pela opção escolhida.",
    "create": "O comprador cria a solicitação em rascunho com produto, quantidade, justificativa e data de necessidade.",
    "update": "O comprador edita o rascunho e o sistema grava pendências, datas de conferência, pesquisa e decisão.",
    "transition": "Move a solicitação entre rascunho, enviada, em pesquisa, aguardando autorização, autorizada e rejeitada; enviar pelo comprador, autorizar e rejeitar pelo gerente.",
    "uniqueKey": "Garante que o número da solicitação nunca se repita, por índice único na coluna numero.",
    "transaction": "Ao autorizar, grava a mudança de situação e o pedido de compra gerado juntos, tudo ou nada.",
    "read.mdmRecord": "Lê o produto e o comprador do cadastro mestre para mostrar nomes e unidade de medida na solicitação.",
    "sequence.next": "Emite o número da solicitação de compra na criação, em sequência do módulo.",
    "comment": "Permite registrar observações do comprador e do gerente na solicitação.",
    "compras.conferirCompletude": "Ao enviar, o sistema confere se produto, quantidade, justificativa e data estão preenchidos e devolve a solicitação com pendências ou segue para a pesquisa."
  },
  "rules": [
    "solicitacaoCompletaParaEnviar",
    "quantidadePositiva",
    "pesquisaNaoAutoriza",
    "maximoTresOpcoes",
    "autorizacaoExigeOpcao",
    "opcaoDaMesmaSolicitacao",
    "rejeicaoExigeMotivo",
    "apenasGerenteDecide"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_solicitacaocompra",
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
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Número",
        "description": "Número da solicitação que as pessoas citam, emitido pelo sistema na criação."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "rascunho",
            "title": "Rascunho",
            "description": "Em preenchimento pelo comprador ou devolvida por estar incompleta."
          },
          {
            "value": "enviada",
            "title": "Enviada",
            "description": "Enviada pelo comprador, aguardando a conferência de completude."
          },
          {
            "value": "emPesquisa",
            "title": "Em pesquisa",
            "description": "Completa; a IA pesquisa até três opções de fornecedor e preço."
          },
          {
            "value": "aguardandoAutorizacao",
            "title": "Aguardando autorização",
            "description": "Com as opções pesquisadas, aguardando decisão do gerente de compras."
          },
          {
            "value": "autorizada",
            "title": "Autorizada",
            "description": "Autorizada com uma opção escolhida; gera o pedido de compra."
          },
          {
            "value": "rejeitada",
            "title": "Rejeitada",
            "description": "Rejeitada pelo gerente com motivo."
          }
        ],
        "title": "Situação",
        "description": "Situação da solicitação no ciclo de compra."
      },
      "produtoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Produto"
        ],
        "title": "Produto",
        "description": "Produto que a solicitação pede."
      },
      "compradorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Comprador"
        ],
        "title": "Comprador",
        "description": "Comprador que abriu a solicitação."
      },
      "opcaoEscolhidaId": {
        "type": "record",
        "indexed": true,
        "to": [
          "OpcaoCotacao"
        ],
        "title": "Opção escolhida",
        "description": "Opção pesquisada que o gerente escolheu ao autorizar; define o fornecedor e o preço do pedido."
      },
      "dataNecessidade": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de necessidade",
        "description": "Data em que o produto precisa estar disponível."
      },
      "enviadaEm": {
        "type": "timestamp",
        "indexed": true,
        "title": "Enviada em",
        "description": "Momento em que o comprador enviou a solicitação; base do filtro por período."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados da solicitação que não são filtrados.",
        "fields": {
          "quantidade": {
            "type": "number",
            "required": true,
            "title": "Quantidade",
            "description": "Quantidade do produto a comprar, na unidade de medida do produto.",
            "min": 0
          },
          "justificativa": {
            "type": "text",
            "required": true,
            "title": "Justificativa",
            "description": "Motivo da necessidade de compra, escrito pelo comprador.",
            "maxLength": 2000
          },
          "pendencias": {
            "type": "text",
            "title": "Pendências da conferência",
            "description": "O que faltou na solicitação quando a conferência de completude a devolveu."
          },
          "conferidaEm": {
            "type": "timestamp",
            "title": "Conferida em",
            "description": "Momento em que o sistema conferiu que a solicitação estava completa."
          },
          "pesquisadaEm": {
            "type": "timestamp",
            "title": "Pesquisada em",
            "description": "Momento em que a pesquisa de opções por IA terminou."
          },
          "decididaEm": {
            "type": "timestamp",
            "title": "Decidida em",
            "description": "Momento em que o gerente autorizou ou rejeitou."
          },
          "motivoRejeicao": {
            "type": "text",
            "title": "Motivo da rejeição",
            "description": "Motivo informado pelo gerente ao rejeitar a solicitação.",
            "maxLength": 1000
          },
          "completa": {
            "type": "boolean",
            "derived": true,
            "title": "Completa",
            "description": "Verdadeira quando a solicitação tem produto, quantidade maior que zero, justificativa e data de necessidade preenchidos."
          },
          "quantidadeOpcoes": {
            "type": "integer",
            "derived": true,
            "title": "Opções pesquisadas",
            "description": "Número de opções de fornecedor e preço pesquisadas que apontam para esta solicitação, no máximo três."
          },
          "necessidadeVencida": {
            "type": "boolean",
            "derived": true,
            "title": "Necessidade vencida",
            "description": "Verdadeira quando a data de necessidade é anterior a hoje e a solicitação ainda não foi autorizada nem rejeitada."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "rascunho",
      "reachedBy": "actor"
    },
    {
      "state": "enviada",
      "reachedBy": "actor"
    },
    {
      "state": "emPesquisa",
      "reachedBy": "command"
    },
    {
      "state": "aguardandoAutorizacao",
      "reachedBy": "command"
    },
    {
      "state": "autorizada",
      "reachedBy": "actor"
    },
    {
      "state": "rejeitada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "enviar",
      "from": [
        "rascunho"
      ],
      "to": "enviada",
      "by": [
        "comprador"
      ],
      "description": "O comprador envia a solicitação; o sistema passa a conferir se está completa.",
      "payload": [],
      "ruleRefs": [
        "solicitacaoCompletaParaEnviar",
        "quantidadePositiva"
      ]
    },
    {
      "transitionId": "devolverIncompleta",
      "from": [
        "enviada"
      ],
      "to": "rascunho",
      "by": [],
      "description": "A conferência encontrou campos faltando; a solicitação volta ao comprador com as pendências.",
      "payload": [
        "details.pendencias"
      ],
      "ruleRefs": [
        "solicitacaoCompletaParaEnviar"
      ]
    },
    {
      "transitionId": "iniciarPesquisa",
      "from": [
        "enviada"
      ],
      "to": "emPesquisa",
      "by": [],
      "description": "A solicitação está completa e a pesquisa de opções por IA é disparada.",
      "payload": [
        "details.conferidaEm"
      ],
      "ruleRefs": [
        "pesquisaNaoAutoriza"
      ]
    },
    {
      "transitionId": "concluirPesquisa",
      "from": [
        "emPesquisa"
      ],
      "to": "aguardandoAutorizacao",
      "by": [],
      "description": "As opções pesquisadas (até três) foram gravadas e a solicitação segue para o gerente.",
      "payload": [
        "details.pesquisadaEm"
      ],
      "ruleRefs": [
        "pesquisaNaoAutoriza",
        "maximoTresOpcoes"
      ]
    },
    {
      "transitionId": "autorizar",
      "from": [
        "aguardandoAutorizacao"
      ],
      "to": "autorizada",
      "by": [
        "gerenteCompras"
      ],
      "description": "O gerente autoriza escolhendo uma das opções pesquisadas; o sistema gera o pedido de compra.",
      "payload": [
        "opcaoEscolhidaId",
        "details.decididaEm"
      ],
      "ruleRefs": [
        "autorizacaoExigeOpcao",
        "opcaoDaMesmaSolicitacao",
        "apenasGerenteDecide"
      ]
    },
    {
      "transitionId": "rejeitar",
      "from": [
        "aguardandoAutorizacao"
      ],
      "to": "rejeitada",
      "by": [
        "gerenteCompras"
      ],
      "description": "O gerente rejeita a solicitação informando o motivo.",
      "payload": [
        "details.motivoRejeicao",
        "details.decididaEm"
      ],
      "ruleRefs": [
        "rejeicaoExigeMotivo",
        "apenasGerenteDecide"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntitySolicitacaoCompraType = typeof comprasEntitySolicitacaoCompra;

export default comprasEntitySolicitacaoCompra;
