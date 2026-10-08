/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "accessScope",
  "artifactId": "accessScope",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [],
  "data": {
    "scopeId": "accessScope",
    "grants": [
      {
        "grantId": "profissionalConsultarEregistrarPropriaAgenda",
        "actorRef": "profissional",
        "anchorEntity": "Profissional",
        "entityRefs": [
          "Profissional",
          "Consulta"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Profissional.id",
          "Profissional.details.identification",
          "Profissional.details.agendaClinica",
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status",
          "Consulta.details.attendanceNote"
        ],
        "scopeMode": "own",
        "session": "verified",
        "path": [
          {
            "entityId": "Profissional",
            "steps": [],
            "pending": ""
          },
          {
            "entityId": "Consulta",
            "steps": [
              {
                "relationshipId": "consultaProfissional",
                "from": "Consulta",
                "to": "Profissional",
                "field": "Consulta.profissionalId"
              }
            ],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "profissionalIdentificarPacientesDaPropriaAgenda",
        "actorRef": "profissional",
        "anchorEntity": "Paciente",
        "entityRefs": [
          "Paciente"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Paciente.id",
          "Paciente.details.identification"
        ],
        "scopeMode": "related",
        "session": "verified",
        "path": [
          {
            "entityId": "Paciente",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "recepcionistaConsultarProfissionais",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Profissional"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.agendaClinica"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Profissional",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "recepcionistaGerenciarPacientesEconsultas",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Paciente",
          "Consulta"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Paciente",
            "steps": [],
            "pending": ""
          },
          {
            "entityId": "Consulta",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      }
    ]
  }
} as const;

export default definition;
