/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/regenHead.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { regenerateHead } from '/_102021_/l2/agentDefsL1/steps/input20/regenHead.js';

const HEAD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'head');

function readHead(dir = HEAD, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) readHead(abs, rel, out);
    else out[fixtureLogicalRel(rel)] = readFileSync(abs, 'utf8');
  }
  return out;
}

/**
 * Alarm (d1_37): today the L1 producer refuses the head inputs, so head cannot be regenerated and the
 * step agent tests seeded by it are skipped (HEAD_SEED_V11_SKIP). When this refusal stops, write the
 * regenerated backend/effort into head, compare them byte for byte here, and re-enable those tests.
 */
void test('regenerating head is refused by the L1 plan gate on the two pages with no endpoint', async () => {
  await assert.rejects(regenerateHead(readHead()), (error: Error) => {
    assert.equal(error.message, [
      'P1_BACKEND_PAGE: page painel_clinica has no endpoint.',
      'P1_BACKEND_PAGE: page painel has no endpoint.',
    ].join('\n'));
    return true;
  });
});
