/// <mls fileReference="_102047_/l4/agendaClinica/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agendaClinica",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Cadastra pacientes, agenda consultas, confirma consultas por telefone e registra faltas.",
      "personEntity": "Recepcionista"
    },
    {
      "actorId": "profissional",
      "kind": "internal",
      "origin": "named",
      "title": "Profissional",
      "description": "Visualiza a própria agenda diária e registra consultas atendidas com uma anotação.",
      "personEntity": "Profissional"
    }
  ],
  "grants": [
    {
      "grantId": "cadastrarPacientes",
      "actorRef": "recepcionista",
      "title": "Cadastrar e consultar pacientes",
      "description": "Permite à recepcionista registrar ou vincular pacientes e consultar os dados cadastrais e referências de contato necessários para os atendimentos.",
      "entityRefs": [
        "Paciente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pacientes cadastrados pela clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados cadastrais, contatos vinculados e consentimento de privacidade necessários ao cadastro do paciente.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "Paciente.details.person"
        ]
      }
    },
    {
      "grantId": "consultarCanaisDosPacientes",
      "actorRef": "recepcionista",
      "title": "Consultar canais de contato dos pacientes",
      "description": "Permite à recepcionista consultar os telefones dos pacientes para realizar confirmações de consulta.",
      "entityRefs": [
        "ContatoPaciente"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os canais de contato mestre vinculados aos pacientes da clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza a identificação, o tipo, o número e a verificação do canal de contato.",
        "allowedFields": [
          "ContatoPaciente.id",
          "ContatoPaciente.version",
          "ContatoPaciente.details.identification",
          "ContatoPaciente.details.contactChannel"
        ]
      }
    },
    {
      "grantId": "organizarAgenda",
      "actorRef": "recepcionista",
      "title": "Organizar agenda de consultas",
      "description": "Permite à recepcionista consultar, agendar, confirmar e registrar faltas nas consultas da clínica.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todas as consultas da clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados de agendamento e situação da consulta, sem acesso à anotação clínica do atendimento.",
        "allowedFields": [
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ],
        "deniedFields": [
          "Consulta.details.attendanceNote"
        ]
      }
    },
    {
      "grantId": "consultarProfissionaisParaAgenda",
      "actorRef": "recepcionista",
      "title": "Consultar profissionais para agendamento",
      "description": "Permite à recepcionista localizar os profissionais e identificar sua ocupação ao marcar consultas.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os profissionais cadastrados pela clínica."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza a identificação, situação, ocupação e consentimento de privacidade do profissional necessários ao seu cadastro e à organização da agenda.",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.person"
        ]
      }
    },
    {
      "grantId": "consultarProprioCadastroRecepcao",
      "actorRef": "recepcionista",
      "title": "Consultar próprio cadastro de recepção",
      "description": "Permite à recepcionista consultar e manter o seu próprio registro de atuação na clínica.",
      "entityRefs": [
        "Recepcionista"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente o registro de recepcionista correspondente à pessoa da sessão.",
        "anchorEntity": "Recepcionista"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados de identificação e privacidade do próprio cadastro de recepção.",
        "allowedFields": [
          "Recepcionista.id",
          "Recepcionista.version",
          "Recepcionista.details.identification",
          "Recepcionista.details.person"
        ]
      }
    },
    {
      "grantId": "consultarPropriaAgenda",
      "actorRef": "profissional",
      "title": "Consultar própria agenda e registrar atendimento",
      "description": "Permite ao profissional visualizar somente as suas consultas e registrar o atendimento realizado com anotação.",
      "entityRefs": [
        "Consulta"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente as consultas vinculadas ao profissional correspondente à pessoa da sessão.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Disponibiliza todos os dados da consulta própria, inclusive a anotação do atendimento."
      }
    },
    {
      "grantId": "consultarPacientesDaPropriaAgenda",
      "actorRef": "profissional",
      "title": "Consultar pacientes da própria agenda",
      "description": "Permite ao profissional identificar os pacientes que possuem consulta vinculada à sua própria agenda.",
      "entityRefs": [
        "Paciente"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Abrange somente pacientes relacionados ao profissional da sessão pela agenda clínica.",
        "anchorEntity": "Paciente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza somente a identificação e a situação cadastral do paciente.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.details.identification"
        ]
      }
    },
    {
      "grantId": "consultarProprioCadastroProfissional",
      "actorRef": "profissional",
      "title": "Consultar próprio cadastro profissional",
      "description": "Permite ao profissional consultar e manter o seu próprio registro de atuação na clínica.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente o registro profissional correspondente à pessoa da sessão.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados de identificação, ocupação e privacidade do próprio cadastro profissional.",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.person"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type AgendaClinicaAccessType = typeof agendaClinicaAccess;

export default agendaClinicaAccess;
