/// <mls fileReference="_102047_/l4/financeiro/ontology/TituloReceber.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityTituloReceber = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "TituloReceber",
  "title": "Título a receber",
  "description": "Cobrança nascida em outro módulo (comanda fechada, mensalidade gerada, ordem de serviço entregue) com pagador, valor, vencimento e origem; o saldo em aberto e a situação de vencido são derivados dos recebimentos.",
  "displayField": "numero",
  "relationships": {
    "pagador": {
      "relationshipId": "tituloPagador",
      "to": "Pagador",
      "via": "TituloReceber.pagadorId",
      "cardinality": "N:1",
      "title": "Pagador do título",
      "description": "Cada título a receber é devido por um pagador.",
      "mode": "fk",
      "required": true
    },
    "recebimentos": {
      "relationshipId": "recebimentoTitulo",
      "to": "Recebimento",
      "via": "Recebimento.tituloId",
      "cardinality": "1:N",
      "title": "Recebimentos do título",
      "description": "Recebimentos, totais ou parciais, e estornos que dão baixa neste título.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "create": "Registra o título quando a comanda é fechada, a mensalidade é gerada ou a ordem de serviço é entregue no módulo de origem, por upsert na chave origem + identificador na origem.",
    "uniqueKey": "Recusa um segundo título com a mesma origem e o mesmo identificador na origem, e um número repetido, pelos índices únicos da tabela.",
    "sequence.next": "Emite o número do título na chegada, pela sequência financeiro.TituloReceber da plataforma.",
    "read.byId": "Abre o título pelo id para o caixa conferir, o gerente detalhar um vencido e o pagador ver seu título no portal.",
    "locate.byColumn": "Lista títulos filtrados por pagador, origem, emissão ou vencimento, ordenados por vencimento, para o caixa localizar o título, o gerente listar vencidos e o pagador ver os seus no portal.",
    "locate.byText": "Procura o título pelo número digitado na caixa de busca do caixa e do gerente.",
    "count": "Conta os títulos de um filtro, como os vencidos do período, para o cabeçalho das listas do gerente.",
    "listByForeignKey": "Lista todos os títulos de um pagador pelo pagadorId, para o extrato do gerente e para o portal do pagador.",
    "read.mdmRecord": "Lê no cadastro mestre o nome e o documento do pagador apontado pelo título, hidratando a lista inteira de uma vez nas telas do caixa e do gerente.",
    "transaction": "Grava o recebimento junto com a leitura do saldo do título, tudo ou nada, quando o caixa ou o pagador registra um pagamento.",
    "comment": "Permite ao caixa e ao gerente deixar uma nota no título, por exemplo uma negociação com o pagador.",
    "attach.document": "Anexa ao título um comprovante ou documento da cobrança, mantido pelo caixa ou pelo gerente.",
    "audit": "Mostraria ao gerente quem alterou o título e quando; hoje a escrita em tabela do módulo não gera trilha.",
    "financeiro.extratoPagador": "Monta o extrato de um pagador no período escolhido, com títulos, recebimentos, estornos e saldo em aberto, para o gerente financeiro.",
    "financeiro.listarVencidos": "Lista os títulos com vencimento anterior a hoje e saldo em aberto, por origem, para o gerente financeiro."
  },
  "rules": [
    "tituloOrigemUnica",
    "tituloValorPositivo",
    "tituloPagadorObrigatorio",
    "recebimentoNaoExcedeSaldo",
    "estornoSomenteMesmoDia",
    "pagadorVeApenasProprios",
    "portalPagaApenasTituloAberto"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_tituloreceber",
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
        "title": "Número do título",
        "description": "Número que o caixa, o gerente e o pagador citam, emitido por sequência da plataforma quando o título chega ao financeiro.",
        "maxLength": 30
      },
      "pagadorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Pagador"
        ],
        "title": "Pagador",
        "description": "Pessoa que deve o título; o nome e o documento são lidos do cadastro mestre. Também é o caminho que limita o portal aos títulos do próprio pagador."
      },
      "origem": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "restaurante",
            "title": "Restaurante (comanda fechada)"
          },
          {
            "value": "academia",
            "title": "Academia (mensalidade gerada)"
          },
          {
            "value": "assistenciaTecnica",
            "title": "Assistência técnica (ordem de serviço entregue)"
          }
        ],
        "title": "Origem",
        "description": "Módulo onde a cobrança nasceu; usada para filtrar e agrupar os recebíveis no painel."
      },
      "origemId": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Identificador na origem",
        "description": "Identificador da comanda, mensalidade ou ordem de serviço no módulo de origem; junto com a origem impede que a mesma cobrança entre duas vezes.",
        "maxLength": 64
      },
      "emissao": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de emissão",
        "description": "Data em que a cobrança foi gerada na origem; usada para o recorte por período do painel e do extrato."
      },
      "vencimento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Vencimento",
        "description": "Data até a qual o título deve ser pago; usada para localizar títulos e listar os vencidos."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do título que são apenas exibidos.",
        "fields": {
          "descricao": {
            "type": "string",
            "required": true,
            "title": "Descrição",
            "description": "Texto que identifica a cobrança para o pagador, por exemplo 'Mensalidade outubro/2026' ou 'Comanda 1532'.",
            "maxLength": 200
          },
          "valorOriginal": {
            "type": "money",
            "required": true,
            "title": "Valor original",
            "description": "Valor cobrado pela origem, antes de qualquer recebimento.",
            "min": 0.01
          },
          "documentoOrigem": {
            "type": "object",
            "title": "Documento de origem",
            "description": "Referência legível do documento que gerou a cobrança.",
            "fields": {
              "tipo": {
                "type": "string",
                "title": "Tipo do documento",
                "description": "Comanda, mensalidade ou ordem de serviço, como a origem chama.",
                "maxLength": 60
              },
              "numero": {
                "type": "string",
                "title": "Número na origem",
                "description": "Número do documento como aparece no módulo de origem.",
                "maxLength": 40
              },
              "dataFato": {
                "type": "date",
                "title": "Data do fato",
                "description": "Data do fechamento da comanda, da geração da mensalidade ou da entrega da ordem de serviço."
              }
            }
          },
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Informações adicionais enviadas pela origem sobre a cobrança."
          },
          "totalRecebido": {
            "type": "money",
            "derived": true,
            "title": "Total recebido",
            "description": "Soma dos recebimentos deste título, descontados os recebimentos estornados."
          },
          "saldoAberto": {
            "type": "money",
            "derived": true,
            "title": "Saldo em aberto",
            "description": "Valor original do título menos o total recebido, já considerando as baixas parciais e os estornos."
          },
          "quitado": {
            "type": "boolean",
            "derived": true,
            "title": "Quitado",
            "description": "Verdadeiro quando o total recebido cobre o valor original e não resta saldo em aberto."
          },
          "parcialmenteRecebido": {
            "type": "boolean",
            "derived": true,
            "title": "Baixa parcial",
            "description": "Há ao menos um recebimento válido, mas ainda resta saldo em aberto."
          },
          "vencido": {
            "type": "boolean",
            "derived": true,
            "title": "Vencido",
            "description": "Com saldo em aberto e vencimento anterior a hoje."
          },
          "diasAtraso": {
            "type": "integer",
            "derived": true,
            "title": "Dias de atraso",
            "description": "Quantidade de dias entre o vencimento e hoje, quando o título está vencido; zero nos demais casos."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "origem",
      "origemId"
    ],
    [
      "numero"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityTituloReceberType = typeof financeiroEntityTituloReceber;

export default financeiroEntityTituloReceber;
