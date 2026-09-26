/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.ts" enhancement="_blank"/>
export interface StructureGrant {
  grantId: string;
  actorRef: string;
  scopeMode: string;
  session: string;
  pending: string;
  disclosure: string;
  recordField: string;
}

export const grants: readonly StructureGrant[] = [
  {"grantId":"profissionalAgendaPropria","actorRef":"profissional","scopeMode":"own","session":"verified","pending":"","disclosure":"fieldsOnly","recordField":"profissionalId"},
  {"grantId":"profissionalPacientesDaAgenda","actorRef":"profissional","scopeMode":"related","session":"verified","pending":"","disclosure":"fieldsOnly","recordField":""},
  {"grantId":"recepcionistaGestaoAgenda","actorRef":"recepcionista","scopeMode":"organization","session":"verified","pending":"","disclosure":"fieldsOnly","recordField":""}
];

export function resolveGrant(grantId: string): StructureGrant | { code: string; detail: string } {
  const grant = grants.find(item => item.grantId === grantId);
  if (!grant) return { code: 'GRANT_ABSENT', detail: `Grant ${grantId} is not declared.` };
  if (grant.pending) return { code: grant.pending, detail: `Grant ${grantId} is pending ${grant.pending}.` };
  if (grant.session !== 'verified') return { code: 'SESSION_UNVERIFIED', detail: `Grant ${grantId} session is not verified.` };
  if (!grant.scopeMode) return { code: 'SCOPE_UNBOUND', detail: `Grant ${grantId} has no scope mode.` };
  if (grant.scopeMode === 'own' && !grant.recordField) return { code: 'ACCESS_ANCHOR', detail: `Grant ${grantId} has no resolved scope path.` };
  return grant;
}
