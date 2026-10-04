/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Consulta.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityConsulta = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Consulta",
  "title": "Consulta",
  "description": "Agendamento de atendimento de um paciente com um profissional em data e horário definidos.",
  "displayField": "scheduledAt",
  "relationships": {
    "paciente": {
      "relationshipId": "consultaPaciente",
      "to": "Paciente",
      "via": "Consulta.pacienteId",
      "cardinality": "N:1",
      "title": "Paciente da consulta",
      "description": "Cada consulta é marcada para um paciente.",
      "mode": "fk",
      "required": "Ao criar a consulta."
    },
    "profissional": {
      "relationshipId": "consultaProfissional",
      "to": "Profissional",
      "via": "Consulta.profissionalId",
      "cardinality": "N:1",
      "title": "Profissional da consulta",
      "description": "Cada consulta é realizada por um profissional.",
      "mode": "fk",
      "required": "Ao criar a consulta."
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma consulta pelo identificador já conhecido, para a recepcionista ou o profissional que a abriu em contexto.",
    "locate.byColumn": "Lista consultas por paciente, profissional, data e situação, com paginação, para a recepcionista organizar a agenda e o profissional consultar a própria agenda diária.",
    "count": "Conta as consultas que atendem aos filtros da agenda, para exibir a quantidade de atendimentos do dia.",
    "listByForeignKey": "Lista as consultas vinculadas a um paciente ou profissional, pela chave estrangeira, para consultar o histórico e a agenda.",
    "create": "Cria uma consulta com paciente, profissional, data e horário, para a recepcionista realizar o agendamento.",
    "transition": "Muda a situação da consulta conforme as transições permitidas, para a recepcionista confirmar ou registrar falta e para o profissional concluir o atendimento.",
    "uniqueKey": "Recusa outra consulta com o mesmo profissional e data e horário, pelo índice único, para impedir sobreposição de agenda.",
    "read.mdmRecord": "Lê os registros mestres do paciente e do profissional referenciados pela consulta, para mostrar seus dados sem copiá-los para a agenda."
  },
  "rules": [
    "profissionalHorarioUnico",
    "transicoesConsultaValidas",
    "atendimentoExigeAnotacao"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agendaClinica_consulta",
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
      "pacienteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Paciente"
        ],
        "title": "Paciente",
        "description": "Paciente para quem a consulta foi agendada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "profissionalId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Profissional"
        ],
        "title": "Profissional",
        "description": "Profissional responsável pelo atendimento agendado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "scheduledAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data e horário",
        "description": "Data e horário previstos para a consulta.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "scheduled",
            "title": "Agendada",
            "description": "Consulta criada e ainda sem confirmação registrada."
          },
          {
            "value": "confirmed",
            "title": "Confirmada",
            "description": "Paciente confirmou por telefone que comparecerá."
          },
          {
            "value": "attended",
            "title": "Atendida",
            "description": "Atendimento realizado pelo profissional."
          },
          {
            "value": "missed",
            "title": "Faltou",
            "description": "Paciente não compareceu à consulta."
          }
        ],
        "title": "Situação",
        "description": "Situação atual do agendamento e do atendimento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Detalhes da consulta",
        "description": "Informações do agendamento e do atendimento que não são usadas para busca ou ordenação.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "attendanceNote": {
            "type": "text",
            "of": "ContactSummary",
            "title": "Anotação do atendimento",
            "description": "Anotação registrada pelo profissional sobre a consulta realizada.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "profissionalId",
      "scheduledAt"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "scheduled",
      "reachedBy": "actor"
    },
    {
      "state": "confirmed",
      "reachedBy": "actor"
    },
    {
      "state": "attended",
      "reachedBy": "actor"
    },
    {
      "state": "missed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "confirmarConsulta",
      "from": [
        "scheduled"
      ],
      "to": "confirmed",
      "by": [
        "recepcionista"
      ],
      "description": "Registra que o paciente confirmou por telefone o comparecimento à consulta.",
      "payload": [],
      "ruleRefs": [
        "transicoesConsultaValidas"
      ]
    },
    {
      "transitionId": "registrarFalta",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "missed",
      "by": [
        "recepcionista"
      ],
      "description": "Registra que o paciente não compareceu à consulta agendada.",
      "payload": [],
      "ruleRefs": [
        "transicoesConsultaValidas"
      ]
    },
    {
      "transitionId": "registrarAtendimento",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "attended",
      "by": [
        "profissional"
      ],
      "description": "Conclui a consulta realizada e registra a anotação do atendimento.",
      "payload": [
        "details.attendanceNote"
      ],
      "ruleRefs": [
        "transicoesConsultaValidas",
        "atendimentoExigeAnotacao"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgendaClinicaEntityConsultaType = typeof agendaClinicaEntityConsulta;

export default agendaClinicaEntityConsulta;
