/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "listConsulta",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "listConsulta",
    "entityId": "Consulta",
    "operation": "list",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "uniqueProfessionalSchedule"
    ],
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
            "route": "agendaClinica.consultas_profissional.qryListConsulta",
            "symbol": "ListConsultaOutput"
          },
          {
            "route": "agendaClinica.consultas_recepcionista.qryListConsulta",
            "symbol": "ListConsultaOutput"
          },
          {
            "route": "agendaClinica.pacientes.qryListConsulta",
            "symbol": "ListConsultaOutput"
          },
          {
            "route": "agendaClinica.profissionais.qryListConsulta",
            "symbol": "ListConsultaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_profissional.qryListConsulta",
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
      },
      {
        "route": "agendaClinica.consultas_recepcionista.qryListConsulta",
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
      },
      {
        "route": "agendaClinica.pacientes.qryListConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "projection": "declared",
        "outputFields": [
          "id",
          "version",
          "patientId",
          "professionalId",
          "scheduledAt",
          "status"
        ]
      },
      {
        "route": "agendaClinica.profissionais.qryListConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
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
        "kind": "rule",
        "ruleId": "uniqueProfessionalSchedule"
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
    "rules": [
      {
        "ruleId": "uniqueProfessionalSchedule",
        "path": "l4/agendaClinica/rules.defs.ts",
        "symbol": "uniqueProfessionalSchedule"
      }
    ],
    "transaction": {
      "boundary": "none"
    }
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/usecase/listConsulta",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_profissional.defs.ts",
      "l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
      "l2/agendaClinica/web/contracts/pacientes.defs.ts",
      "l2/agendaClinica/web/contracts/profissionais.defs.ts",
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
