/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/contractsProviderEdge.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { providerEdgeCases } from '/_102035_/l2/solution/testing/providerEdgeCases.js';
import { buildP1ResolutionSchema, parseP1Resolution } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';

// Strict mode does not enforce `minLength` or `minItems`: the resolution can come with an empty id, reason or list.
const example = {
  aliases: [{ candidateUsecaseId: 'cancelarX', existingUsecaseId: 'cancelarY', reason: 'same operation' }],
  merges: [{ usecaseId: 'fecharPedido', entity: 'Pedido', operation: 'custom', ports: ['PedidoPort'], replaces: ['criarPedido'], reason: 'one transaction' }],
};

void test('plan20 resolution: empty ids, reasons and lists never reach the plan as empty text', () => {
  const cases = providerEdgeCases(buildP1ResolutionSchema(), example);
  assert.ok(cases.length >= 10, `cases found: ${cases.length}`);
  for (const item of cases) {
    const label = `${item.path} ${item.rule} ${item.variant}`;
    const parsed = parseP1Resolution(item.value);
    for (const alias of parsed.aliases) for (const value of Object.values(alias)) assert.ok(value.trim(), `${label}: an empty alias field got through`);
    for (const merge of parsed.merges) {
      for (const value of [merge.usecaseId, merge.entity, merge.reason, ...merge.ports, ...merge.replaces]) assert.ok(value.trim(), `${label}: an empty merge field got through`);
      assert.ok(merge.replaces.length > 0, `${label}: a merge without replaces got through`);
    }
  }
});

void test('plan20 resolution: an item the parser drops is not reported to anyone', { todo: 'parseP1Resolution drops an alias without ids and a merge without usecaseId, entity or replaces, silently (no error, no trace): a wrong answer looks like "nothing to resolve"' }, () => {
  const silent: string[] = [];
  for (const item of providerEdgeCases(buildP1ResolutionSchema(), example)) {
    const parsed = parseP1Resolution(item.value);
    const kept = parsed.aliases.length === example.aliases.length && parsed.merges.length === example.merges.length;
    if (!kept) silent.push(`${item.path} ${item.rule} ${item.variant}`);
  }
  assert.deepEqual(silent, [], 'answers dropped without a word');
});
