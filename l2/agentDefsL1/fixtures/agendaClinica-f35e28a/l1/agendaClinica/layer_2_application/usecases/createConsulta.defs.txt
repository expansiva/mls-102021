/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "usecase",
  "artifactId": "createConsulta",
  "moduleName": "agendaClinica",
  "data": {
    "usecaseId": "createConsulta",
    "entityId": "Consulta",
    "operation": "create",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [
      "uniqueProfessionalSchedule"
    ],
    "functions": [
      {
        "functionName": "createConsulta",
        "input": [
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
            "route": "agendaClinica.consultas_recepcionista.cmdCreateConsulta",
            "symbol": "CreateConsultaOutput"
          },
          {
            "route": "agendaClinica.pacientes.cmdCreateConsulta",
            "symbol": "CreateConsultaOutput"
          },
          {
            "route": "agendaClinica.profissionais.cmdCreateConsulta",
            "symbol": "CreateConsultaOutput"
          }
        ]
      }
    ],
    "routeProjections": [
      {
        "route": "agendaClinica.consultas_recepcionista.cmdCreateConsulta",
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
        "route": "agendaClinica.pacientes.cmdCreateConsulta",
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
        "route": "agendaClinica.profissionais.cmdCreateConsulta",
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
        "kind": "rule",
        "ruleId": "uniqueProfessionalSchedule"
      },
      {
        "kind": "port",
        "call": "create",
        "port": "ConsultaRepository"
      }
    ],
    "uses": [],
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
    "id": "102047/agendaClinica/usecase/createConsulta",
    "type": "usecase",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
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
