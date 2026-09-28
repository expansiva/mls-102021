/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/regenHead.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { regenerateCurrent, regenerateHead } from '/_102021_/l2/agentDefsL1/steps/input20/regenHead.js';

const HEAD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'head');
const CURRENT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'current');

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

/** d1_39: the current seed's needs, backend, effort and planner pipeline are the producers' bytes. */
void test('the current seed outputs are what the producers write over its inputs, byte for byte', async () => {
  const stored = readHead(CURRENT);
  const produced = await regenerateCurrent(stored);
  assert.deepEqual(Object.keys(produced).sort(), [
    'l4/agendaClinica/pool/l1/pipeline.json',
    'l4/agendaClinica/pool/l1/web/needs.json',
    'l4/agendaClinica/pool/l2/web/backend.json',
    'l4/agendaClinica/pool/l2/web/effort.json',
  ]);
  for (const [logical, text] of Object.entries(produced)) assert.equal(stored[logical], text, logical);
});
