/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "registrarFalta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas.defs.ts",
    "_102047_/l4/agendaClinica/integration.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "registrarFalta",
    "entityId": "Consulta",
    "operation": "transition",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "consultaSomenteAgendadaPodeRegistrarFalta"
    ],
    "functions": [
      {
        "functionName": "registrarFalta",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Consulta.id"
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
            "route": "agendaClinica.consultas.cmdRegistrarFalta",
            "symbol": "RegistrarFaltaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas.cmdRegistrarFalta",
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
      "transition"
    ],
    "transactional": false,
    "effects": [
      {
        "eventId": "registrarFalta",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "registrarFalta"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "rule",
        "ruleId": "consultaSomenteAgendadaPodeRegistrarFalta"
      },
      {
        "kind": "transition",
        "transitionId": "registrarFalta",
        "payload": []
      },
      {
        "kind": "port",
        "call": "transition",
        "port": "ConsultaRepository"
      },
      {
        "kind": "effect",
        "eventId": "registrarFalta"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
        "source": "input"
      }
    ],
    "rules": [
      {
        "ruleId": "consultaSomenteAgendadaPodeRegistrarFalta",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "consultaSomenteAgendadaPodeRegistrarFalta"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "consultaSomenteAgendadaPodeRegistrarFalta",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarFalta.ruleRefs",
        "consumer": "usecase:registrarFalta",
        "enforcement": "local",
        "gap": ""
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "lifecycle": {
      "transitionId": "registrarFalta",
      "payload": [],
      "sourcePath": "l4/agendaClinica/ontology/Consulta.defs.ts",
      "symbol": "registrarFalta"
    }
  }
} as const;

export default definition;
