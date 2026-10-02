/// <mls fileReference="_102021_/l2/helpers/l1Defs/operations.ts" enhancement="_blank"/>

export const L1_OPERATIONS = ['list', 'get', 'create', 'update', 'transition', 'delete', 'custom'] as const;
export type L1Operation = typeof L1_OPERATIONS[number];

export const L1_OPERATION_TRAITS: Record<L1Operation, { read: boolean; write: boolean; addressesRecord: boolean }> = {
  list: { read: true, write: false, addressesRecord: false },
  get: { read: true, write: false, addressesRecord: true },
  create: { read: false, write: true, addressesRecord: false },
  update: { read: false, write: true, addressesRecord: true },
  transition: { read: false, write: true, addressesRecord: true },
  delete: { read: false, write: true, addressesRecord: true },
  custom: { read: false, write: false, addressesRecord: false },
};

/**
 * Port reads the M1 body of each operation calls besides its own method (t1_09 r3): update and transition
 * load the current row through list. The port def declares them, so a transition-only entity still compiles.
 */
export const L1_OPERATION_PORT_READS: Record<L1Operation, readonly L1Operation[]> = {
  list: [],
  get: [],
  create: [],
  update: ['list'],
  transition: ['list'],
  delete: [],
  custom: [],
};

export function isL1Operation(value: string): value is L1Operation {
  return (L1_OPERATIONS as readonly string[]).includes(value);
}

/** A transition write: the entity and its L4 transitionRef. */
export interface L1TransitionWrite {
  entity: string;
  transitionRef: string;
}

function lowerFirst(value: string): string {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

/** Base transition usecase ids that more than one entity writes (d1_53). */
export function collidingTransitionIds(writes: Iterable<L1TransitionWrite>): Set<string> {
  const entitiesById = new Map<string, Set<string>>();
  for (const write of writes) {
    const id = lowerFirst(write.transitionRef);
    const entities = entitiesById.get(id) ?? new Set<string>();
    entities.add(write.entity);
    entitiesById.set(id, entities);
  }
  return new Set([...entitiesById].filter(([, entities]) => entities.size > 1).map(([id]) => id));
}

/**
 * The one rule for a transition usecase id, for the P1 plan and for a usecase input20 creates from the contract:
 * lowerFirst(transitionRef); when another entity writes the same transition, the entity is appended.
 */
export function transitionUsecaseId(entity: string, transitionRef: string, colliding: ReadonlySet<string>): string {
  const id = lowerFirst(transitionRef);
  return colliding.has(id) ? `${id}${entity}` : id;
}
