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
        "grantId": "profissionalAgendaDiaria",
        "actorRef": "profissional",
        "anchorEntity": "Paciente",
        "entityRefs": [
          "Consulta"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "own",
        "session": "verified",
        "path": [
          {
            "relationshipId": "appointmentPatient",
            "from": "Consulta",
            "to": "Paciente",
            "field": "Consulta.patientId"
          }
        ],
        "pending": "ACCESS_ANCHOR"
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
        "scopeMode": "own",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "profissionalProprioCadastro",
        "actorRef": "profissional",
        "anchorEntity": "Profissional",
        "entityRefs": [
          "Profissional"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "own",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "recepcionistaAgendaConsultas",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Consulta"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Consulta.id",
          "Consulta.version",
          "Consulta.patientId",
          "Consulta.professionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "recepcionistaCadastroPacientes",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Paciente",
          "ContatoPaciente"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "ContatoPaciente.id",
          "ContatoPaciente.version",
          "ContatoPaciente.details.identification",
          "ContatoPaciente.details.contactChannel"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "recepcionistaLocalizarProfissionais",
        "actorRef": "recepcionista",
        "entityRefs": [
          "Profissional"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.person"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [],
        "pending": ""
      },
      {
        "grantId": "recepcionistaProprioCadastro",
        "actorRef": "recepcionista",
        "anchorEntity": "Recepcionista",
        "entityRefs": [
          "Recepcionista"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "own",
        "session": "verified",
        "path": [],
        "pending": ""
      }
    ]
  }
} as const;

export default definition;
