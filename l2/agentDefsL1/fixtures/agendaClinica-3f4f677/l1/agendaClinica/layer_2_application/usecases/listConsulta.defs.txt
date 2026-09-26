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
    "_102047_/l2/agendaClinica/web/contracts/agenda.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas.defs.ts",
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
            "name": "page",
            "type": "number"
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
            "fieldRef": "Consulta.details"
          }
        ],
        "contractRefs": [
          {
            "route": "agendaClinica.agenda.qryListConsulta",
            "symbol": "ListConsultaOutput"
          },
          {
            "route": "agendaClinica.consultas.qryListConsulta",
            "symbol": "ListConsultaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.agenda.qryListConsulta",
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
      },
      {
        "route": "agendaClinica.consultas.qryListConsulta",
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
        "ruleId": "consultaSomenteAgendadaPodeRegistrarAtendimento",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#rules",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "APPLICABILITY_UNDECLARED"
      },
      {
        "ruleId": "consultaSomenteAgendadaPodeRegistrarFalta",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#rules",
        "consumer": "operation:list",
        "enforcement": "pending",
        "gap": "APPLICABILITY_UNDECLARED"
      },
      {
        "ruleId": "profissionalAtendeSomentePropriaConsulta",
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
