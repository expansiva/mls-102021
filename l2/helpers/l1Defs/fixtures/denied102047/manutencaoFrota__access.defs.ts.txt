/// <mls fileReference="_102047_/l4/manutencaoFrota/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "manutencaoFrota",
  "actors": [
    {
      "actorId": "motorista",
      "kind": "internal",
      "origin": "named",
      "title": "Motorista",
      "description": "Motorista da transportadora que registra os abastecimentos (data, litros, valor, km no painel) do veículo que dirige e vê apenas os veículos atribuídos a ele.",
      "personEntity": "Motorista"
    },
    {
      "actorId": "gestor",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor de frota",
      "description": "Gestor de frota que cadastra os veículos e os planos de manutenção preventiva por veículo (a cada N km ou N meses), abre ordens de manutenção quando o plano vence ou há defeito e acompanha os avisos de preventiva vencida por km.",
      "personEntity": ""
    }
  ],
  "grants": [
    {
      "grantId": "motoristaVeiculosAtribuidos",
      "actorRef": "motorista",
      "title": "Veículos atribuídos ao motorista",
      "description": "O motorista localiza e consulta apenas os veículos atribuídos a ele (placa, modelo, ano e quilometragem atual) para registrar abastecimentos.",
      "entityRefs": [
        "Veiculo"
      ],
      "dataScope": {
        "mode": "assigned",
        "description": "Somente veículos cujo motorista atribuído é o motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Vê os dados do veículo, exceto as anotações do gestor e o custo total de manutenção.",
        "deniedFields": [
          "Veiculo.details.observacoes",
          "Veiculo.details.custoTotalManutencao"
        ]
      }
    },
    {
      "grantId": "motoristaAbastecimentos",
      "actorRef": "motorista",
      "title": "Meus abastecimentos",
      "description": "O motorista registra e consulta os abastecimentos que ele lançou, com data, litros, valor e km no painel.",
      "entityRefs": [
        "Abastecimento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente abastecimentos registrados pelo motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Vê o registro completo dos seus abastecimentos."
      }
    },
    {
      "grantId": "motoristaProprioCadastro",
      "actorRef": "motorista",
      "title": "Meu cadastro de motorista",
      "description": "O motorista vê o próprio nome e situação do cadastro, exibidos nos veículos atribuídos.",
      "entityRefs": [
        "Motorista"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro do próprio motorista da sessão.",
        "anchorEntity": "Motorista"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Vê nome, situação e contatos do próprio cadastro.",
        "allowedFields": [
          "Motorista.details.identification.name",
          "Motorista.details.identification.status",
          "Motorista.details.base.contacts"
        ]
      }
    },
    {
      "grantId": "gestorFrota",
      "actorRef": "gestor",
      "title": "Gestão da frota",
      "description": "O gestor de frota cadastra motoristas, oficinas e veículos, atribui veículos, define planos de preventiva, abre e conclui ordens de manutenção e acompanha abastecimentos e preventivas vencidas de toda a frota.",
      "entityRefs": [
        "Motorista",
        "Oficina",
        "Veiculo",
        "Abastecimento",
        "PlanoManutencao",
        "OrdemManutencao"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os registros da transportadora."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Vê os registros completos."
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type ManutencaoFrotaAccessType = typeof manutencaoFrotaAccess;

export default manutencaoFrotaAccess;
