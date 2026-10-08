/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts"
  ],
  "data": {
    "usecaseId": "listConsulta",
    "entityId": "Consulta",
    "operation": "list",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listConsulta",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Consulta.id"
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
          },
          {
            "name": "page",
            "type": "number"
          },
          {
            "name": "pageSize",
            "type": "number"
          }
        ],
        "output": [
          {
            "name": "items",
            "type": "Consulta"
          },
          {
            "name": "hasMore",
            "type": "boolean"
          }
        ]
      }
    ],
    "portCalls": [
      "list"
    ],
    "transactional": false,
    "effects": [],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "port",
        "call": "list",
        "port": "ConsultaRepository"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "filter",
        "source": "input"
      }
    ],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "anotacaoObrigatoriaNoAtendimento",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#rules",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "APPLICABILITY_UNDECLARED"
      },
      {
        "ruleId": "transicaoConsultaValida",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#rules",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "APPLICABILITY_UNDECLARED"
      }
    ],
    "transaction": {
      "boundary": "none"
    }
  }
} as const;

export default definition;
