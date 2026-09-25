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
    "_102047_/l2/agendaClinica/web/contracts/agenda.defs.ts",
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
      "anotacaoObrigatoriaNoAtendimento",
      "consultaSomenteAgendadaPodeRegistrarAtendimento",
      "profissionalAtendeSomentePropriaConsulta"
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
            "type": "{ \"attendanceNote\"?: string; }",
            "fieldRef": "Consulta.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.agenda.cmdRegistrarAtendimento",
            "symbol": "RegistrarAtendimentoOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.agenda.cmdRegistrarAtendimento",
        "contractPath": "l2/agendaClinica/web/contracts/agenda.defs.ts",
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
        "eventId": "registrarAtendimento",
        "path": "l4/agendaClinica/integration.defs.ts",
        "symbol": "registrarAtendimento"
      }
    ],
    "sequence": [
      {
        "kind": "context",
        "source": "ctx"
      },
      {
        "kind": "rule",
        "ruleId": "anotacaoObrigatoriaNoAtendimento"
      },
      {
        "kind": "rule",
        "ruleId": "consultaSomenteAgendadaPodeRegistrarAtendimento"
      },
      {
        "kind": "rule",
        "ruleId": "profissionalAtendeSomentePropriaConsulta"
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
        "eventId": "registrarAtendimento"
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
        "ruleId": "anotacaoObrigatoriaNoAtendimento",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "anotacaoObrigatoriaNoAtendimento"
      },
      {
        "ruleId": "consultaSomenteAgendadaPodeRegistrarAtendimento",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "consultaSomenteAgendadaPodeRegistrarAtendimento"
      },
      {
        "ruleId": "profissionalAtendeSomentePropriaConsulta",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "profissionalAtendeSomentePropriaConsulta"
      }
    ],
    "rulePlan": [
      {
        "ruleId": "anotacaoObrigatoriaNoAtendimento",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "consultaSomenteAgendadaPodeRegistrarAtendimento",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#transitions.registrarAtendimento.ruleRefs",
        "consumer": "usecase:registrarAtendimento",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "profissionalAtendeSomentePropriaConsulta",
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
