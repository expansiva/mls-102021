/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "registrarAtendimento",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "registrarAtendimento",
    "entityId": "Consulta",
    "operation": "transition",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "consultationTransitionFlow",
      "attendanceNoteRequired",
      "professionalOwnAppointment"
    ],
    "functions": [
      {
        "functionName": "registrarAtendimento",
        "input": [
          {
            "name": "id",
            "type": "string",
            "fieldRef": "Consulta.id"
          },
          {
            "name": "details",
            "type": "{ \"attendanceNote\"?: string; }",
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
          },
          {
            "name": "details",
            "type": "{ \"attendanceNote\"?: string; }",
            "fieldRef": "Consulta.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.consultas_profissional.cmdRegistrarAtendimento",
            "symbol": "RegistrarAtendimentoOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_profissional.cmdRegistrarAtendimento",
        "contractPath": "l2/agendaClinica/web/contracts/consultas_profissional.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "patientId",
          "professionalId",
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
        "eventId": "atendimentoRegistrado",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "atendimentoRegistrado"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "rule",
        "ruleId": "professionalOwnAppointment"
      },
      {
        "kind": "rule",
        "ruleId": "consultationTransitionFlow"
      },
      {
        "kind": "rule",
        "ruleId": "attendanceNoteRequired"
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
        "eventId": "atendimentoRegistrado"
      }
    ],
    "uses": [
      {
        "path": "id",
        "role": "selector",
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
        "ruleId": "consultationTransitionFlow",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "consultationTransitionFlow"
      },
      {
        "ruleId": "attendanceNoteRequired",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "attendanceNoteRequired"
      },
      {
        "ruleId": "professionalOwnAppointment",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "professionalOwnAppointment"
      }
    ],
    "transaction": {
      "boundary": "none"
    },
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/registrarAtendimento",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_profissional.defs.ts",
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
