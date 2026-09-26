/// <mls fileReference="_102047_/l4/agendaClinica/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agendaClinica",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Cadastra pacientes, agenda consultas, confirma consultas por telefone e registra faltas."
    },
    {
      "actorId": "profissional",
      "kind": "internal",
      "origin": "named",
      "title": "Profissional",
      "description": "Consulta a própria agenda diária e registra o atendimento com uma anotação."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionistaCadastroPacientes",
      "actorRef": "recepcionista",
      "title": "Cadastrar e atualizar pacientes",
      "description": "Permite à recepcionista localizar, cadastrar ou associar pacientes e consultar os canais de contato necessários ao cadastro.",
      "entityRefs": [
        "Paciente",
        "ContatoPaciente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pacientes e seus canais de contato mantidos pela clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza identificação, dados cadastrais básicos e canais de contato; não disponibiliza consentimentos de privacidade nem dados gerais promovidos.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "ContatoPaciente.id",
          "ContatoPaciente.version",
          "ContatoPaciente.details.identification",
          "ContatoPaciente.details.contactChannel"
        ]
      }
    },
    {
      "grantId": "recepcionistaAgendaConsultas",
      "actorRef": "recepcionista",
      "title": "Administrar agendamentos",
      "description": "Permite à recepcionista consultar, criar e atualizar agendamentos, incluindo confirmações telefônicas e registros de falta.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os agendamentos da clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados operacionais do agendamento, sem a anotação clínica registrada pelo profissional.",
        "allowedFields": [
          "Consulta.id",
          "Consulta.version",
          "Consulta.patientId",
          "Consulta.professionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ]
      }
    },
    {
      "grantId": "recepcionistaLocalizarProfissionais",
      "actorRef": "recepcionista",
      "title": "Localizar profissionais para agendamento",
      "description": "Permite à recepcionista localizar médicos e terapeutas ativos ao marcar consultas.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os profissionais cadastrados pela clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza a identificação, situação cadastral e profissão do profissional, sem documentos, consentimentos ou dados gerais.",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.person"
        ]
      }
    },
    {
      "grantId": "recepcionistaProprioCadastro",
      "actorRef": "recepcionista",
      "title": "Acessar o próprio cadastro",
      "description": "Permite à recepcionista acessar e manter o registro mestre associado à sua atuação na clínica.",
      "entityRefs": [
        "Recepcionista"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente o registro de recepcionista vinculado à pessoa autenticada.",
        "anchorEntity": "Recepcionista"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Disponibiliza integralmente o próprio registro mestre de recepcionista."
      }
    },
    {
      "grantId": "profissionalProprioCadastro",
      "actorRef": "profissional",
      "title": "Acessar o próprio cadastro profissional",
      "description": "Permite ao profissional acessar e manter o registro mestre associado à sua atuação clínica.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente o registro profissional vinculado à pessoa autenticada.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Disponibiliza integralmente o próprio registro mestre profissional."
      }
    },
    {
      "grantId": "profissionalAgendaDiaria",
      "actorRef": "profissional",
      "title": "Consultar e registrar a agenda diária",
      "description": "Permite ao profissional consultar suas consultas do dia e registrar o atendimento realizado com sua anotação.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente consultas vinculadas à pessoa autenticada, limitada à agenda do dia.",
        "anchorEntity": "Paciente"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Disponibiliza integralmente os dados do agendamento da própria agenda diária, inclusive a anotação de atendimento."
      }
    },
    {
      "grantId": "profissionalPacientesDaAgenda",
      "actorRef": "profissional",
      "title": "Identificar pacientes da agenda diária",
      "description": "Permite ao profissional identificar os pacientes vinculados às suas consultas do dia.",
      "entityRefs": [
        "Paciente"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente os pacientes vinculados à pessoa autenticada na agenda diária.",
        "anchorEntity": "Paciente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza apenas a identificação necessária para reconhecer o paciente na agenda, sem dados cadastrais, contatos ou consentimentos.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.details.identification"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type AgendaClinicaAccessType = typeof agendaClinicaAccess;

export default agendaClinicaAccess;
