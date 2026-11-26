/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/d1_311.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFLICT_ENDS_THE_FUNCTION, COPY_ONLY_WHEN_DIFFERENT } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

void test('d1_311: a conflict is the repeat only on the repeat-search record; the others go up', () => {
  const text = CONFLICT_ENDS_THE_FUNCTION;
  assert.match(text, /is the repeat only when it is thrown by the write of the record the repeat search of the L4 reads/u);
  assert.match(text, /goes up as the error, the route undoes the whole transaction/u);
  assert.match(text, /Never catch a conflict outside the write of the repeat-search record/u);
  assert.match(text, /no repeat search, no conflict is a repeat: every conflict goes up/u);
  assert.match(text, /accepts no more writes/u);
  assert.doesNotMatch(text, /telegram|conversation|audit/iu, 'no entity name in the generator');
});

void test('d1_311: an update that only copies values writes only when one differs', () => {
  assert.match(COPY_ONLY_WHEN_DIFFERENT, /writes only when at least one value differs from the record read/u);
  assert.match(COPY_ONLY_WHEN_DIFFERENT, /no write, and the function goes on with the record it read/u);
});
