/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/getConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "getConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts"
  ],
  "data": {
    "usecaseId": "getConsulta",
    "entityId": "Consulta",
    "operation": "get",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getConsulta",
        "input": [
          {
            "name": "id",
            "type": "uuid",
            "fieldRef": "Consulta.id"
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
      "get"
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
        "call": "get",
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
        "consumer": "operation:get",
        "enforcement": "pending",
        "gap": "APPLICABILITY_UNDECLARED"
      },
      {
        "ruleId": "transicaoConsultaValida",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#rules",
        "consumer": "operation:get",
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
