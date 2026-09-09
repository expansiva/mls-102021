/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/fixtures/n09/ce09SessionScope.ts" enhancement="_blank"/>

/**
 * Compile fixture for the ce09-like assigned-via-intermediate predicate
 * (Vehicle ← VehicleAssignment.driverId → Person).
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

function fieldOf(row: Record<string, unknown>, fieldId: string): string {
  const value = row[fieldId];
  return typeof value === 'string' ? value : '';
}

export async function scopeFilterForListVehicle(
  ctx: RequestContext,
  listAssignments: () => Promise<Record<string, unknown>[]>,
): Promise<ScopeFilter | null> {
  const userId = String(ctx.sessionContext?.actorId ?? '').trim();
  if (!userId) return { fieldId: 'vehicleId', allowed: [] };
  const listed = await ctx.mdm.collection.listByType({ type: 'fleetLike.Driver', status: 'Active' });
  const personIds = listed.items
    .filter(item => detailField(item.details, 'platformUserId') === userId)
    .map(item => item.mdmId);
  const assignments = await listAssignments();
  const allowed = [...new Set(
    assignments
      .filter(row => personIds.indexOf(fieldOf(row, 'driverId')) >= 0)
      .map(row => fieldOf(row, 'vehicleId'))
      .filter(Boolean),
  )];
  return { fieldId: 'vehicleId', allowed };
}
