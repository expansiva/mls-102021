/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "registrarAtendimento",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l4/agendaClinica/integration.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "registrarAtendimento",
    "entityId": "Consulta",
    "operation": "transition",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "anotacaoObrigatoriaNoAtendimento",
      "transicaoConsultaValida"
    ],
    "functions": [
      {
        "functionName": "registrarAtendimento",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Consulta.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Consulta.version"
          },
          {
            "name": "details.attendanceNote",
            "type": "text",
            "fieldRef": "Consulta.details.attendanceNote"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Consulta.id"
          },
          {
            "name": "version",
            "type": "integer",
            "fieldRef": "Consulta.version"
          },
          {
            "name": "pacienteId",
            "type": "record",
            "fieldRef": "Consulta.pacienteId"
          },
          {
            "name": "profissionalId",
            "type": "record",
            "fieldRef": "Consulta.profissionalId"
          },
          {
            "name": "scheduledAt",
            "type": "timestamp",
            "fieldRef": "Consulta.scheduledAt"
          },
          {
            "name": "status",
            "type": "enum",
            "fieldRef": "Consulta.status"
          },
          {
            "name": "details",
            "type": "object",
            "fieldRef": "Consulta.details"
          },
          {
            "name": "details.attendanceNote",
            "type": "text",
            "fieldRef": "Consulta.details.attendanceNote"
          }
        ]
      }
    ],
    "portCalls": [
      "transition"
    ],
    "transactional": false,
    "effects": [
      {
        "eventId": "registrarAtendimento",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "registrarAtendimento"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "rule",
        "ruleId": "anotacaoObrigatoriaNoAtendimento"
      },
      {
        "kind": "rule",
        "ruleId": "transicaoConsultaValida"
      },
      {
        "kind": "transition",
        "transitionId": "registrarAtendimento",
        "payload": [
          "details.attendanceNote"
        ]
      },
      {
        "kind": "port",
        "call": "transition",
        "port": "ConsultaRepository"
      },
      {
        "kind": "effect",
        "eventId": "registrarAtendimento"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
        "source": "input"
      },
      {
        "path": "version",
        "role": "concurrency",
        "source": "input"
      },
      {
        "path": "details.attendanceNote",
        "role": "write",
        "source": "payload"
      }
    ],
    "rules": [
      {
        "ruleId": "anotacaoObrigatoriaNoAtendimento",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "anotacaoObrigatoriaNoAtendimento"
      },
      {
        "ruleId": "transicaoConsultaValida",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "transicaoConsultaValida"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "anotacaoObrigatoriaNoAtendimento",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "transicaoConsultaValida",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "transitionRef": "registrarAtendimento",
    "lifecycle": {
      "transitionId": "registrarAtendimento",
      "payload": [
        "details.attendanceNote"
      ],
      "sourcePath": "l4/agendaClinica/ontology/Consulta.defs.ts",
      "symbol": "registrarAtendimento"
    }
  }
} as const;

export default definition;
