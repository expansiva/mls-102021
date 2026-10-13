/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Veiculo.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityVeiculo = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Veiculo",
  "title": "Veículo",
  "description": "Veículo da frota operado por este módulo, com placa, modelo, ano, quilometragem atual e o motorista a quem está atribuído.",
  "displayField": "placa",
  "relationships": {
    "motorista": {
      "relationshipId": "veiculoMotorista",
      "to": "Motorista",
      "via": "Veiculo.motoristaId",
      "cardinality": "N:1",
      "title": "Motorista atribuído",
      "description": "Motorista que dirige o veículo; só ele o vê entre os motoristas.",
      "mode": "fk"
    },
    "abastecimentos": {
      "relationshipId": "abastecimentoVeiculo",
      "to": "Abastecimento",
      "via": "Abastecimento.veiculoId",
      "cardinality": "1:N",
      "title": "Abastecimentos",
      "description": "Abastecimentos registrados para o veículo.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "planos": {
      "relationshipId": "planoVeiculo",
      "to": "PlanoManutencao",
      "via": "PlanoManutencao.veiculoId",
      "cardinality": "1:N",
      "title": "Planos de preventiva",
      "description": "Planos de manutenção preventiva do veículo.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "ordens": {
      "relationshipId": "ordemVeiculo",
      "to": "OrdemManutencao",
      "via": "OrdemManutencao.veiculoId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção",
      "description": "Ordens de manutenção preventiva ou corretiva do veículo.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre a ficha do veículo pelo id para o motorista conferir placa, modelo e km e para o gestor acompanhar a frota.",
    "locate.byColumn": "Lista veículos filtrando por motorista atribuído (os veículos do motorista logado) ou pela placa, ordenando por placa ou quilometragem; usado pelo motorista e pelo gestor.",
    "locate.byText": "Busca o veículo por parte da placa na caixa de pesquisa do gestor.",
    "count": "Conta os veículos da frota ou do motorista no cabeçalho da lista.",
    "listByForeignKey": "Lista os veículos atribuídos a um motorista pela coluna motoristaId, base do escopo do motorista.",
    "create": "O gestor cadastra o veículo com placa, modelo, ano e quilometragem atual.",
    "update": "O gestor atribui o veículo a um motorista e corrige dados; o lançamento de abastecimento atualiza a quilometragem atual.",
    "uniqueKey": "O engine recusa um segundo veículo com a mesma placa.",
    "transaction": "Grava o abastecimento e a nova quilometragem atual do veículo juntos, tudo ou nada.",
    "read.mdmRecord": "Lê no MDM o nome do motorista atribuído para exibir na ficha e na lista do gestor.",
    "attach.document": "O gestor anexa documento do veículo (CRLV, fotos) à ficha.",
    "comment": "O gestor deixa observações sobre o veículo.",
    "manutencaoFrota.avisoPreventivaVencida": "Sinaliza ao gestor os veículos cuja quilometragem atual passou do km previsto da próxima preventiva, calculado na leitura."
  },
  "rules": [
    "placaUnicaNaFrota",
    "motoristaVeSoVeiculosAtribuidos",
    "quilometragemNaoRegride",
    "avisoPreventivaVencidaPorKm"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "manutencaoFrota_veiculo",
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
      "placa": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Placa",
        "description": "Placa do veículo (padrão antigo ou Mercosul); é por ela que o gestor e o motorista localizam o veículo.",
        "pattern": "^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$",
        "maxLength": 8
      },
      "motoristaId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Motorista"
        ],
        "title": "Motorista atribuído",
        "description": "Motorista a quem o veículo está atribuído; define quais veículos o motorista pode ver e abastecer."
      },
      "quilometragemAtual": {
        "type": "integer",
        "required": true,
        "indexed": true,
        "title": "Quilometragem atual",
        "description": "Km atual do veículo; informado no cadastro e atualizado pelo km no painel de cada abastecimento. Usado para comparar com o km previsto da próxima preventiva.",
        "min": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do veículo",
        "description": "Demais dados do veículo da frota.",
        "fields": {
          "modelo": {
            "type": "string",
            "required": true,
            "title": "Modelo",
            "description": "Modelo do veículo, como aparece na frota (ex.: Volvo FH 540).",
            "maxLength": 120
          },
          "ano": {
            "type": "integer",
            "required": true,
            "title": "Ano",
            "description": "Ano de fabricação/modelo do veículo.",
            "min": 1950,
            "max": 2100
          },
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Anotações livres do gestor sobre o veículo."
          },
          "preventivaVencida": {
            "type": "boolean",
            "derived": true,
            "title": "Preventiva vencida",
            "description": "Verdadeiro quando a quilometragem atual do veículo passou do km previsto para a próxima preventiva de algum plano de manutenção dele, ou quando a data prevista desse plano já passou."
          },
          "emManutencao": {
            "type": "boolean",
            "derived": true,
            "title": "Em manutenção",
            "description": "Verdadeiro quando existe ordem de manutenção do veículo com data de entrada na oficina e ainda sem data de saída."
          },
          "custoTotalManutencao": {
            "type": "money",
            "derived": true,
            "title": "Custo total de manutenção",
            "description": "Soma dos custos das ordens de manutenção registradas para este veículo."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "placa"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityVeiculoType = typeof manutencaoFrotaEntityVeiculo;

export default manutencaoFrotaEntityVeiculo;
