/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "accessScope",
  "artifactId": "accessScope",
  "moduleName": "agendaClinica",
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
        "disclosure": "fullRecord"
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
        ]
      },
      {
        "grantId": "profissionalProprioCadastro",
        "actorRef": "profissional",
        "anchorEntity": "Profissional",
        "entityRefs": [
          "Profissional"
        ],
        "disclosure": "fullRecord"
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
        ]
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
        ]
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
        ]
      },
      {
        "grantId": "recepcionistaProprioCadastro",
        "actorRef": "recepcionista",
        "anchorEntity": "Recepcionista",
        "entityRefs": [
          "Recepcionista"
        ],
        "disclosure": "fullRecord"
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/accessScope/accessScope",
    "type": "accessScope",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.ts",
    "outputAvailability": "future",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/accessScope.md"
    ]
  }
] as const;
