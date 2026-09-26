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
        "grantId": "profissionalAgendaPropria",
        "actorRef": "profissional",
        "anchorEntity": "Profissional",
        "entityRefs": [
          "Consulta",
          "Profissional"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status",
          "Consulta.details.attendanceNote",
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.base",
          "Profissional.details.person",
          "Profissional.details.general",
          "Profissional.details.agendaClinica"
        ],
        "scopeMode": "own",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "profissionalPacientesDaAgenda",
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
        "path": [],
        "pending": ""
      },
      {
        "grantId": "recepcionistaGestaoAgenda",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Paciente",
          "Profissional",
          "Recepcionista",
          "ContatoPaciente",
          "Consulta"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "Paciente.details.general",
          "Paciente.details.agendaClinica",
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.base",
          "Profissional.details.person",
          "Profissional.details.general",
          "Profissional.details.agendaClinica",
          "Recepcionista.id",
          "Recepcionista.version",
          "Recepcionista.details.identification",
          "Recepcionista.details.base",
          "Recepcionista.details.person",
          "Recepcionista.details.general",
          "Recepcionista.details.agendaClinica",
          "ContatoPaciente.id",
          "ContatoPaciente.version",
          "ContatoPaciente.details.identification",
          "ContatoPaciente.details.contactChannel",
          "ContatoPaciente.details.general",
          "ContatoPaciente.details.agendaClinica",
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status",
          "Consulta.details.telephoneConfirmation"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [],
        "pending": ""
      }
    ]
  }
} as const;

export default definition;
