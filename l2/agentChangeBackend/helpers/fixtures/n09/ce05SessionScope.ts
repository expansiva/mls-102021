/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/fixtures/n09/ce05SessionScope.ts" enhancement="_blank"/>

/**
 * Compile fixture for the ce05-like own + projection predicate
 * (OrdenServicio.clienteId → Person). Projection is disclosure, not the person filter.
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

export async function scopeFilterForInspectOrden(ctx: RequestContext): Promise<ScopeFilter | null> {
  const userId = String(ctx.sessionContext?.actorId ?? '').trim();
  if (!userId) return { fieldId: 'clienteId', allowed: [] };
  const listed = await ctx.mdm.collection.listByType({ type: 'ordenServicioLike.Cliente', status: 'Active' });
  const allowed = listed.items
    .filter(item => detailField(item.details, 'platformUserId') === userId)
    .map(item => item.mdmId);
  return { fieldId: 'clienteId', allowed };
}
