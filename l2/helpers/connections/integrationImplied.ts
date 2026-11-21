/// <mls fileReference="_102021_/l2/helpers/connections/integrationImplied.ts" enhancement="_blank"/>

// d1_259: what the L4 integration (`l4/<module>/integration.defs.ts`) says a module writes or reads outside its own pages. One reading of
// `connections[]` for the two steps that must agree: the planner of the backend (`plan20`, which keeps the usecases that exist for it and
// plans the missing ones) and the input of the D1 (`input20`, which splits an external usecase into one per call). A `call` row names its
// entities in `entityRefs` and the catalog-side action in `effect`; a `serve` row names what it writes in `entityEffects`.

/** The usecase operations an `effect` of the L4 stands for (`read` is a `get`, `remove` is a `delete`; the others keep their name). */
export function operationsOfEffect(effect: string): string[] {
  if (effect === 'read') return ['get'];
  if (effect === 'remove') return ['delete'];
  return effect ? [effect] : [];
}

/** `usecase.operation` is what the `effect` of a call or a step names. */
export function operationMatchesEffect(operation: string, effect: string): boolean {
  return operation === effect || operationsOfEffect(effect).includes(operation);
}

export interface IntegrationImplied {
  entity: string;
  operation: string;
  /** `<connectionId>.<operationId>` of the row. */
  via: string;
  direction: 'call' | 'serve';
}

function rec(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Every (entity, operation) the integration implies: for a `call`, each entity of `entityRefs` with the operation its `effect` names; for a
 * `serve`, each entity of `entityEffects` with each of its effects. Rows that name nothing imply nothing.
 */
export function integrationImplied(connections: readonly unknown[]): IntegrationImplied[] {
  const out: IntegrationImplied[] = [];
  for (const raw of connections) {
    const row = rec(raw);
    const direction = row.direction === 'call' ? 'call' : row.direction === 'serve' ? 'serve' : null;
    if (!direction) continue;
    const via = `${typeof row.connectionId === 'string' ? row.connectionId : ''}.${typeof row.operationId === 'string' ? row.operationId : ''}`;
    if (direction === 'call') {
      const effect = typeof row.effect === 'string' ? row.effect : '';
      for (const entity of strings(row.entityRefs)) for (const operation of operationsOfEffect(effect)) out.push({ entity, operation, via, direction });
      continue;
    }
    for (const item of Array.isArray(row.entityEffects) ? row.entityEffects.map(rec) : []) {
      const entity = typeof item.entityId === 'string' ? item.entityId : '';
      if (!entity) continue;
      for (const effect of strings(item.effects)) for (const operation of operationsOfEffect(effect)) out.push({ entity, operation, via, direction });
    }
  }
  return out;
}
