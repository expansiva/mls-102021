/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "updateConsulta",
    "entityId": "Consulta",
    "operation": "update",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "updateConsulta",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Consulta.id"
          },
          {
            "name": "pacienteId",
            "type": "string",
            "fieldRef": "Consulta.pacienteId"
          },
          {
            "name": "profissionalId",
            "type": "string",
            "fieldRef": "Consulta.profissionalId"
          },
          {
            "name": "scheduledAt",
            "type": "string",
            "fieldRef": "Consulta.scheduledAt"
          },
          {
            "name": "status",
            "type": "\"scheduled\" | \"noShow\" | \"attended\"",
            "fieldRef": "Consulta.status"
          },
          {
            "name": "details",
            "type": "{ \"telephoneConfirmation\"?: { \"confirmedAt\": string; }; }",
            "fieldRef": "Consulta.details"
          }
        ],
        "output": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Consulta.id"
          },
          {
            "name": "version",
            "type": "number",
            "fieldRef": "Consulta.version"
          },
          {
            "name": "pacienteId",
            "type": "string",
            "fieldRef": "Consulta.pacienteId"
          },
          {
            "name": "profissionalId",
            "type": "string",
            "fieldRef": "Consulta.profissionalId"
          },
          {
            "name": "scheduledAt",
            "type": "string",
            "fieldRef": "Consulta.scheduledAt"
          },
          {
            "name": "status",
            "type": "\"scheduled\" | \"noShow\" | \"attended\"",
            "fieldRef": "Consulta.status"
          },
          {
            "name": "details",
            "type": "{ \"telephoneConfirmation\"?: { \"confirmedAt\": string; }; }",
            "fieldRef": "Consulta.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.consultas.cmdUpdateConsulta",
            "symbol": "UpdateConsultaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas.cmdUpdateConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "pacienteId",
          "profissionalId",
          "scheduledAt",
          "status",
          "details"
        ]
      }
    ],
    "portCalls": [
      "update"
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
        "call": "update",
        "port": "ConsultaRepository"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
        "source": "input"
      }
    ],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "consultaHorarioProfissionalUnico",
        "origin": "l4/agendaClinica/rules.defs.ts#consultaHorarioProfissionalUnico",
        "consumer": "operation:update",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
      },
      {
        "ruleId": "",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#uniqueKeys",
        "consumer": "operation:update",
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
