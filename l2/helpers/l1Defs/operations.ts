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

export function isL1Operation(value: string): value is L1Operation {
  return (L1_OPERATIONS as readonly string[]).includes(value);
}
