/// <mls fileReference="_102047_/l4/compras/ontology/PainelCompras.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityPainelCompras = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "PainelCompras",
  "title": "Painel de compras",
  "description": "Resumo recalculado: solicitações aguardando autorização, pedidos em aberto, pedidos atrasados e total comprado por fornecedor no mês.",
  "displayField": "periodo",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Resume por mês as solicitações e os pedidos de compra, agrupando o total comprado por fornecedor, com agregação contínua (time_bucket mensal + GROUP BY fornecedor); alimenta o painel do gerente de compras.",
    "read.window": "Lê o resumo do mês atual ou de um período escolhido, filtrando pelo período e pelo fornecedor, ambos indexados; usado pelo gerente de compras ao abrir o painel.",
    "refresh": "Mantém o painel atualizado à medida que solicitações são enviadas ou decididas, pedidos são gerados e recebimentos registrados, por política de atualização da agregação; executado pela plataforma.",
    "rebuild": "Recalcula todo o painel a partir das solicitações e pedidos na reconstrução do esquema, em migração ou publicação do módulo.",
    "read.mdmRecord": "Lê o registro mestre do fornecedor apontado em cada linha para mostrar a razão social no total comprado por fornecedor; usado pela tela do painel do gerente.",
    "retain": "Descarta resumos mensais mais antigos que o período de interesse do painel, para a série não crescer sem limite; executado pela plataforma.",
    "compras.abrirAtrasados": "A partir do indicador de pedidos atrasados, abre a lista de pedidos de compra em aberto com data prevista de entrega vencida; usado pelo gerente de compras."
  },
  "rules": [
    "pedidoAtrasadoAposDataPrevista",
    "totalCompradoPorFornecedorNoMes",
    "solicitacaoAguardandoAutorizacao"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_painelcompras",
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
      "periodo": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Período (mês)",
        "description": "Início do mês que esta linha resume; janela mensal sobre as solicitações de compra, os pedidos de compra e os recebimentos."
      },
      "fornecedorId": {
        "type": "string",
        "indexed": true,
        "derived": true,
        "title": "Fornecedor",
        "description": "Identificador do registro mestre do fornecedor a que a linha se refere; vazio na linha geral do mês, que traz as pendências de autorização e os pedidos em aberto e atrasados de toda a organização."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Indicadores",
        "description": "Medidas recalculadas a partir de SolicitacaoCompra e PedidoCompra; ninguém digita nenhuma delas.",
        "fields": {
          "solicitacoesAguardandoAutorizacao": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Solicitações aguardando autorização",
            "description": "Quantidade de solicitações de compra enviadas, conferidas e ainda sem decisão do gerente de compras.",
            "min": 0
          },
          "pedidosEmAberto": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Pedidos em aberto",
            "description": "Quantidade de pedidos de compra gerados que ainda não foram recebidos por completo.",
            "min": 0
          },
          "pedidosAtrasados": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Pedidos atrasados",
            "description": "Quantidade de pedidos em aberto cuja data prevista de entrega já passou.",
            "min": 0
          },
          "totalComprado": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total comprado no mês",
            "description": "Soma dos valores dos pedidos de compra do fornecedor (quantidade vezes preço) gerados no mês.",
            "min": 0
          },
          "quantidadePedidos": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Pedidos no mês",
            "description": "Quantidade de pedidos de compra gerados para o fornecedor no mês.",
            "min": 0
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityPainelComprasType = typeof comprasEntityPainelCompras;

export default comprasEntityPainelCompras;
