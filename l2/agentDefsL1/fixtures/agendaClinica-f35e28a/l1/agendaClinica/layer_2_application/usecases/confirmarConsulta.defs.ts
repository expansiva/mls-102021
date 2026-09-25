/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "confirmarConsulta",
  "moduleName": "agendaClinica",
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
        "kind": "rule",
        "ruleId": "consultationTransitionFlow"
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/confirmarConsulta",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
      "l4/agendaClinica/integration.defs.ts",
      "l4/agendaClinica/ontology/Consulta.defs.ts",
      "l4/agendaClinica/rules.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Consulta",
      "102047/agendaClinica/repositoryPort/ConsultaRepository"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md"
    ]
  }
] as const;
