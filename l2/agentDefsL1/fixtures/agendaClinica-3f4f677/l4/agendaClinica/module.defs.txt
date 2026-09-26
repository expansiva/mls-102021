/// <mls fileReference="_102047_/l4/agendaClinica/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "agendaClinica",
  "title": "Agenda clínica",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "criar o módulo agendaClinica em português. a clínica tem profissionais (médicos e terapeutas) e pacientes. a recepcionista cadastra pacientes, marca consultas para um profissional em data e hora, confirma por telefone, e registra falta quando o paciente não vem. o profissional vê só a própria agenda do dia e marca a consulta como atendida com uma anotação. não pode haver duas consultas do mesmo profissional no mesmo horário. dois perfis: recepcionista e profissional."
} as const satisfies Ns5ModuleArtifact;

export type AgendaClinicaModuleType = typeof agendaClinicaModule;

export default agendaClinicaModule;
