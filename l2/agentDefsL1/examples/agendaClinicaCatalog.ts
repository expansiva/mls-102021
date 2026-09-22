/// <mls fileReference="_102021_/l2/agentDefsL1/examples/agendaClinicaCatalog.ts" enhancement="_blank"/>

import type { D1StorageTarget } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  catalogFromPlan,
  type D1Absence,
  type D1Catalog,
  type D1Justification,
  type D1MeasuredPlan,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

/**
 * Consulta declares storage.target moduleDatabase. The other four are kind role
 * and cite the MDM catalog. They have no local table.
 */
export const AGENDA_ENTITY_STORAGE: Record<string, D1StorageTarget> = {
  Consulta: 'moduleDatabase',
  ContatoPaciente: 'mdm',
  Paciente: 'mdm',
  Profissional: 'mdm',
  Recepcionista: 'mdm',
};

export const AGENDA_JUSTIFICATIONS: D1Justification[] = [
  {
    id: '102047/agendaClinica/accessScope/accessScope',
    artifactType: 'accessScope',
    reason: 'The plan names seven grants. Usecases and controllers cite this scope. The transport does not decide the policy.',
  },
  {
    id: '102047/agendaClinica/authorityMap/authorityMap',
    artifactType: 'authorityMap',
    reason: 'Binds those same grants to actors. It depends on the scope artifact and adds no grant.',
  },
  {
    id: '102047/agendaClinica/repositoryRegistration/registerRepositories',
    artifactType: 'repositoryRegistration',
    reason: 'One factory list for the adapters the plan actually has. The only adapter is ConsultaRepository.',
  },
  {
    id: '102047/agendaClinica/persistenceSeeds/seeds',
    artifactType: 'persistenceSeeds',
    reason: 'The plan has one local table, consulta. The scenario names its unique key and does not invent rows, people or credentials.',
  },
  {
    id: '102047/agendaClinica/integrationOutbound/outbound',
    artifactType: 'integrationOutbound',
    reason: 'The plan keeps consultaConfirmada, faltaPacienteRegistrada and atendimentoRegistrado. The runtime mechanism is unnamed, so the events stay visible and no emit API is invented.',
  },
];

export const AGENDA_ABSENCES: D1Absence[] = [
  {
    artifactType: 'valueObject',
    reason: 'No reusable value type is referenced. Nested fields stay on the entity. This absence is not a generated file.',
  },
];

export function agendaCatalog(plan: D1MeasuredPlan): D1Catalog {
  return catalogFromPlan(plan, {
    justifications: AGENDA_JUSTIFICATIONS,
    absences: AGENDA_ABSENCES,
  });
}
