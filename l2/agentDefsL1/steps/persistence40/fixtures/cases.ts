/// <mls fileReference="_102021_/l2/agentDefsL1/steps/persistence40/fixtures/cases.ts" enhancement="_blank"/>

/**
 * Physical names measured on the buildFlowFsm change-order defs:
 * the table says `change_order` and the adapter citation says `change_orders`.
 * The pair is the fixture. It is not a finding against another generator.
 */
export const MEASURED_TABLE_NAME = 'change_order';
export const MEASURED_TABLE_REF = 'change_orders';

export const changeOrderEntity = {
  ChangeOrder: {
    entityId: 'ChangeOrder',
    kind: 'entity',
    storage: { target: 'moduleDatabase', table: MEASURED_TABLE_NAME },
    record: {
      fields: {
        id: { type: 'uuid', required: true, derived: true, indexed: true },
        title: { type: 'text', required: true },
      },
    },
  },
};

/** Nested nullable `details.note`, plus a derived `version` that is not indexed. */
export const noteEntity = {
  Note: {
    entityId: 'Note',
    kind: 'entity',
    storage: { target: 'moduleDatabase', table: 'sample_note' },
    record: {
      fields: {
        id: { type: 'uuid', required: true, derived: true, indexed: true },
        version: { type: 'integer', required: true, derived: true },
        details: {
          type: 'object',
          required: true,
          fields: {
            note: { type: 'text' },
          },
        },
      },
    },
  },
};

export const roleEntity = {
  PersonRole: {
    entityId: 'PersonRole',
    kind: 'role',
    storage: { target: 'mdm' },
    record: { fields: { id: { type: 'uuid', required: true, derived: true } } },
  },
};
