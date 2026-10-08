/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createConsulta",
    "entityId": "Consulta",
    "operation": "create",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createConsulta",
        "input": [
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
      "create"
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
        "call": "create",
        "port": "ConsultaRepository"
      }
    ],
    "uses": [],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "consultaSemConflito",
        "origin": "l4/agendaClinica/rules.defs.ts#consultaSemConflito",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
      },
      {
        "ruleId": "",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#uniqueKeys",
        "consumer": "operation:create",
        "enforcement": "local",
        "gap": ""
      }
    ],
    "transaction": {
      "boundary": "none"
    }
  }
} as const;

export default definition;
