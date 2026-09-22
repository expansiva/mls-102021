/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/fixtures/cases.ts" enhancement="_blank"/>

/** Synthetic ontologies. They are not a product module. Ids are exact and local to each case. */

export const cycleEntities = {
  Alpha: {
    entityId: 'Alpha',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: { fields: { other: { type: 'record', to: ['Beta'] } } },
  },
  Beta: {
    entityId: 'Beta',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: { fields: { back: { type: 'record', to: ['Alpha'] } } },
  },
};

export const missingRefEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: { fields: { other: { type: 'record', to: ['Missing'] } } },
  },
};

export const ambiguousRefEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: { fields: { other: { type: 'record', to: ['Alpha', 'Beta'] } } },
  },
};

/** A string whose name ends in Id is not a reference. A record points at Target by `to`. */
export const suffixEntities = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: {
      fields: {
        targetId: { type: 'string' },
        link: { type: 'record', to: ['Target'] },
      },
    },
  },
  Target: {
    entityId: 'Target',
    kind: 'role',
    source: '/_9_/l4/ontology/mdm.defs.ts',
    record: { fields: { id: { type: 'uuid', derived: true } } },
  },
};

/** Nested object stays on the owner. One business value stays an enum. */
export const nestedEnumEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: {
      fields: {
        details: {
          type: 'object',
          fields: {
            note: { type: 'text' },
            subtype: { type: 'enum', values: [{ value: 'Only' }] },
          },
        },
      },
    },
  },
};

/** Same dotted path from a literal key and from a real nest. */
export const fieldCollisionEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    record: {
      fields: {
        'details.note': { type: 'text' },
        details: { type: 'object', fields: { note: { type: 'text' } } },
      },
    },
  },
};

export const timeEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'expired', reachedBy: 'time' },
    ],
    transitions: [
      {
        transitionId: 'expire',
        from: ['open'],
        to: 'expired',
        by: ['clock'],
        ruleRefs: ['expireByTime'],
      },
    ],
    record: { fields: { id: { type: 'uuid', derived: true } } },
  },
};

/** Time state kept, and not written by a transition. */
export const timeKeptEntity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    rules: ['openOnly'],
    lifecycleStates: [
      { state: 'open', reachedBy: 'actor' },
      { state: 'expired', reachedBy: 'time' },
    ],
    transitions: [],
    record: { fields: { id: { type: 'uuid', derived: true } } },
  },
};

/** An NS4 field list is not rewritten into the v3 map. */
export const ns4Entity = {
  Holder: {
    entityId: 'Holder',
    kind: 'entity',
    storage: { target: 'moduleDatabase' },
    fields: [{ fieldId: 'name', type: 'string' }],
    record: { fields: [] },
  },
};

export const sharedCatalog = {
  rules: {
    'rule-foreign-namespace-refused': 'platform',
  },
};

export const platformRole = {
  PersonRole: {
    entityId: 'PersonRole',
    kind: 'role',
    source: '/_9_/l4/ontology/mdm.defs.ts',
    rules: ['rule-foreign-namespace-refused'],
    record: { fields: { id: { type: 'uuid', derived: true } } },
  },
};

export const moduleRulesWithCamelTwin = {
  rules: {
    ruleForeignNamespaceRefused: 'rewritten spelling',
    openOnly: 'one record',
  },
};
