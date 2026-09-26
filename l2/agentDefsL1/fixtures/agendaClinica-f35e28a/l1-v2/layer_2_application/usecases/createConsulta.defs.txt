/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createConsulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/consultas_recepcionista.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts",
    "_102047_/l2/agendaClinica/web/contracts/profissionais.defs.ts",
    "_102047_/l4/agendaClinica/ontology/Consulta.defs.ts",
    "_102047_/l4/agendaClinica/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createConsulta",
    "entityId": "Consulta",
    "operation": "create",
    "ports": [
      "ConsultaRepository"
    ],
    "rulesApplied": [],
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
        "kind": "port",
        "call": "create",
        "port": "ConsultaRepository"
      }
    ],
    "uses": [],
    "rules": [],
    "rulePlan": [
      {
        "ruleId": "",
        "origin": "l4/agendaClinica/ontology/Consulta.defs.ts#uniqueKeys",
        "consumer": "operation:create",
        "enforcement": "local",
        "gap": ""
      },
      {
        "ruleId": "uniqueProfessionalSchedule",
        "origin": "l4/agendaClinica/rules.defs.ts#uniqueProfessionalSchedule",
        "consumer": "operation:create",
        "enforcement": "pending",
        "gap": "RULE_UNBOUND"
      }
    ],
    "transaction": {
      "boundary": "none"
    }
  }
} as const;

export default definition;
