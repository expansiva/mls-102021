/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "confirmarConsulta",
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
    "usecaseId": "confirmarConsulta",
    "entityId": "Consulta",
    "operation": "transition",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "transicaoConsultaValida"
    ],
    "functions": [
      {
        "functionName": "confirmarConsulta",
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
        "eventId": "confirmarConsulta",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "confirmarConsulta"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "rule",
        "ruleId": "transicaoConsultaValida"
      },
      {
        "kind": "transition",
        "transitionId": "confirmarConsulta",
        "payload": []
      },
      {
        "kind": "port",
        "call": "transition",
        "port": "ConsultaRepository"
      },
      {
        "kind": "effect",
        "eventId": "confirmarConsulta"
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
      }
    ],
    "rules": [
      {
        "ruleId": "transicaoConsultaValida",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "transicaoConsultaValida"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "transicaoConsultaValida",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.confirmarConsulta.ruleRefs",
        "consumer": "usecase:confirmarConsulta",
        "enforcement": "local",
        "gap": ""
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "transitionRef": "confirmarConsulta",
    "lifecycle": {
      "transitionId": "confirmarConsulta",
      "payload": [],
      "sourcePath": "l4/agendaClinica/ontology/Consulta.defs.ts",
      "symbol": "confirmarConsulta"
    }
  }
} as const;

export default definition;
