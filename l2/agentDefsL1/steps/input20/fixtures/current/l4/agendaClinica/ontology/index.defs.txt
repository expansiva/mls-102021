/// <mls fileReference="_102047_/l4/agendaClinica/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "businessDomain": "Agenda clínica para cadastro de pacientes, agendamento, confirmação e registro de atendimentos.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agendaClinica",
    "description": "Branch details.agendaClinica of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Paciente",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Profissional",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Recepcionista",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "ContatoPaciente",
      "kind": "role",
      "subtype": "ContactChannel"
    },
    {
      "entityId": "Consulta",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "consultaPaciente",
      "from": "Consulta",
      "to": "Paciente",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada consulta é agendada para um paciente.",
      "field": "Consulta.pacienteId"
    },
    {
      "relationshipId": "consultaProfissional",
      "from": "Consulta",
      "to": "Profissional",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada consulta é agendada para um profissional.",
      "field": "Consulta.profissionalId"
    },
    {
      "relationshipId": "pacienteHasContact",
      "from": "Paciente",
      "to": "ContatoPaciente",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "description": "O paciente pode ter canais de contato mestre, inclusive telefone, para confirmação de consultas.",
      "catalogType": "HasContact"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type AgendaClinicaOntologyIndexType = typeof agendaClinicaOntologyIndex;

export default agendaClinicaOntologyIndex;
