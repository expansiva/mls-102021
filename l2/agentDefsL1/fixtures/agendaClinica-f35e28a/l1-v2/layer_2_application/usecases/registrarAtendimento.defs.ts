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
    "_102047_/l2/agendaClinica/web/contracts/consultas_profissional.defs.ts",
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
      "attendanceNoteRequired",
      "consultationTransitionFlow",
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
        "kind": "port",
        "call": "transition",
        "port": "ConsultaRepository"
      },
      {
        "kind": "rule",
        "ruleId": "attendanceNoteRequired"
      },
      {
        "kind": "rule",
        "ruleId": "consultationTransitionFlow"
      },
      {
        "kind": "rule",
        "ruleId": "professionalOwnAppointment"
      },
      {
        "kind": "transition",
        "transitionId": "registrarAtendimento",
        "payload": [
          "details.attendanceNote"
        ]
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
        "ruleId": "attendanceNoteRequired",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "attendanceNoteRequired"
      },
      {
        "ruleId": "consultationTransitionFlow",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "consultationTransitionFlow"
      },
      {
        "ruleId": "professionalOwnAppointment",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "professionalOwnAppointment"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "attendanceNoteRequired",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "consultationTransitionFlow",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "professionalOwnAppointment",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
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
