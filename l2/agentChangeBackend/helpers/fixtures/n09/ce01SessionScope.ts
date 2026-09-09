/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/fixtures/n09/ce01SessionScope.ts" enhancement="_blank"/>

/**
 * Compile fixture for the ce01-like assigned-direct predicate (Appointment.professionalId → Person).
 * Mirrors the template-emitted helper; frontend tsc is the compile gate.
 */

interface RequestContext {
  sessionContext?: { actorId?: string; actorScope?: string[] };
  mdm: {
    collection: {
      listByType(input: { type: string; status?: string }): Promise<{ items: Array<{ mdmId: string; details: Record<string, unknown> }> }>;
    };
  };
}

export interface ScopeFilter { fieldId: string; allowed: string[] }

function detailField(details: unknown, fieldId: string): string {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return '';
  const value = (details as Record<string, unknown>)[fieldId];
  return typeof value === 'string' ? value : '';
}

export async function scopeFilterForListAppointment(ctx: RequestContext): Promise<ScopeFilter | null> {
  const userId = String(ctx.sessionContext?.actorId ?? '').trim();
  if (!userId) return { fieldId: 'professionalId', allowed: [] };
  const listed = await ctx.mdm.collection.listByType({ type: 'agendaClinicaLike.Professional', status: 'Active' });
  const allowed = listed.items
    .filter(item => detailField(item.details, 'platformUserId') === userId)
    .map(item => item.mdmId);
  return { fieldId: 'professionalId', allowed };
}

export function rowInScope(row: Record<string, unknown>, filter: ScopeFilter): boolean {
  const value = row[filter.fieldId];
  return filter.allowed.indexOf(typeof value === 'string' ? value : '') >= 0;
}
