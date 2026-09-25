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
    "_102047_/l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
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
      "consultationTransitionFlow"
    ],
    "functions": [
      {
        "functionName": "confirmarConsulta",
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
            "name": "patientId",
            "type": "string",
            "fieldRef": "Consulta.patientId"
          },
          {
            "name": "professionalId",
            "type": "string",
            "fieldRef": "Consulta.professionalId"
          },
          {
            "name": "scheduledAt",
            "type": "string",
            "fieldRef": "Consulta.scheduledAt"
          },
          {
            "name": "status",
            "type": "\"scheduled\" | \"confirmed\" | \"noShow\" | \"attended\"",
            "fieldRef": "Consulta.status"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.consultas_recepcionista.cmdConfirmarConsulta",
            "symbol": "ConfirmarConsultaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_recepcionista.cmdConfirmarConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "patientId",
          "professionalId",
          "scheduledAt",
          "status"
        ]
      }
    ],
    "portCalls": [
      "transition"
    ],
    "transactional": false,
    "effects": [
      {
        "eventId": "consultaConfirmada",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "consultaConfirmada"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "port",
        "call": "transition",
        "port": "ConsultaRepository"
      },
      {
        "kind": "rule",
        "ruleId": "consultationTransitionFlow"
      },
      {
        "kind": "transition",
        "transitionId": "confirmarConsulta",
        "payload": []
      },
      {
        "kind": "effect",
        "eventId": "consultaConfirmada"
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
        "ruleId": "consultationTransitionFlow",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "consultationTransitionFlow"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "consultationTransitionFlow",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.confirmarConsulta.ruleRefs",
        "consumer": "usecase:confirmarConsulta",
        "enforcement": "local",
        "gap": ""
      }
    ],
    "transaction": {
      "boundary": "none"
    },
    "lifecycle": {
      "transitionId": "confirmarConsulta",
      "payload": [],
      "sourcePath": "l4/agendaClinica/ontology/Consulta.defs.ts",
      "symbol": "confirmarConsulta"
    }
  }
} as const;

export default definition;
