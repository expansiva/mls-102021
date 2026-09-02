/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbRules.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  L4_RULES_PROMPT_HEADING,
  appliedRulesPromptSection,
  collectRuleDefinitionsFromParsed,
  resolveAppliedRules,
  ruleIdsOfEntities,
  type L4RuleDefinition,
} from './cbRules.js';

const catalog: L4RuleDefinition[] = [
  { ruleId: 'x', title: 'X title', description: 'X must hold', appliesTo: ['Petition'] },
  { ruleId: 'other', title: 'Other title', description: 'not this owner', appliesTo: [] },
];

test('collectRuleDefinitionsFromParsed reads ns4 `id` and optional title/appliesTo', () => {
  const rules = collectRuleDefinitionsFromParsed({
    rules: [
      { id: 'validCpf', description: 'A signature may be recorded only with a valid CPF.' },
      { ruleId: 'legacyId', title: 'Legacy', description: 'old shape', appliesTo: ['A'] },
      { description: 'dropped — no id' },
    ],
  });
  assert.deepEqual(rules, [
    { ruleId: 'validCpf', title: '', description: 'A signature may be recorded only with a valid CPF.', appliesTo: [] },
    { ruleId: 'legacyId', title: 'Legacy', description: 'old shape', appliesTo: ['A'] },
  ]);
});

test('resolveAppliedRules keeps caller order and empty-text fallback (gen-seeds contract)', () => {
  assert.deepEqual(resolveAppliedRules(catalog, ['other', 'missing', 'x']), [
    catalog[1],
    { ruleId: 'missing', title: '', description: '', appliesTo: [] },
    catalog[0],
  ]);
});

test('owner with useRules produces prompt with title and description; owner without does not', () => {
  const withRules = appliedRulesPromptSection(catalog, ['x']);
  assert.ok(withRules.includes(L4_RULES_PROMPT_HEADING), withRules);
  assert.match(withRules, /X title/);
  assert.match(withRules, /X must hold/);
  assert.doesNotMatch(withRules, /Other title/);
  assert.doesNotMatch(withRules, /not this owner/);
  assert.equal(appliedRulesPromptSection(catalog, []), '');
});

test('materialize reuses the same section: item with rulesApplied gets title+description, empty does not', () => {
  const catalogForMaterialize: L4RuleDefinition[] = [{
    ruleId: 'onlyOpenTicketCanReceiveComment',
    title: 'Only an open ticket can receive a comment',
    description: 'A comment may be recorded only while the ticket status is open.',
    appliesTo: ['TicketComment'],
  }];
  const section = appliedRulesPromptSection(catalogForMaterialize, ['onlyOpenTicketCanReceiveComment']);
  assert.match(section, new RegExp(L4_RULES_PROMPT_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(section, /Only an open ticket can receive a comment/);
  assert.match(section, /ticket status is open/);
  assert.equal(appliedRulesPromptSection(catalogForMaterialize, []), '');
});

test('ruleIdsOfEntities walks root + embedded members, unique, first-seen', () => {
  const entities = [
    { entityId: 'Petition', useRules: ['publicPetitionContentOnly', 'aggregateSignatureCounterOnly'] },
    { entityId: 'PetitionSignature', useRules: ['validCpf', 'publicPetitionContentOnly'] },
    { entityId: 'Other', useRules: ['ignored'] },
  ];
  assert.deepEqual(
    ruleIdsOfEntities(entities, ['Petition', 'PetitionSignature']),
    ['publicPetitionContentOnly', 'aggregateSignatureCounterOnly', 'validCpf'],
  );
  assert.deepEqual(ruleIdsOfEntities(entities, ['Ghost']), []);
});
