/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/regenHead.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { HEAD_BACKEND, regenerateCurrent, regenerateHead } from '/_102021_/l2/agentDefsL1/steps/input20/regenHead.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

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

/** d1_39/d1_40: the current seed's needs, backend, effort, planner pipeline and page contracts are the producers' bytes. */
void test('the current seed outputs are what the producers write over its inputs, byte for byte', async () => {
  const stored = readHead(CURRENT);
  const produced = await regenerateCurrent(stored);
  assert.deepEqual(Object.keys(produced).sort(), [
    'l2/agendaClinica/web/contracts/agenda.defs.ts',
    'l2/agendaClinica/web/contracts/consultas.defs.ts',
    'l2/agendaClinica/web/contracts/pacientes.defs.ts',
    'l4/agendaClinica/pool/l1/pipeline.json',
    'l4/agendaClinica/pool/l1/web/needs.json',
    'l4/agendaClinica/pool/l2/web/backend.json',
    'l4/agendaClinica/pool/l2/web/effort.json',
  ]);
  for (const [logical, text] of Object.entries(produced)) assert.equal(stored[logical], text, logical);
});

/** d1_40: every backend route of the seed has exactly one binding, a declared input and one input symbol in its page contract. */
void test('every backend route of the current seed resolves in its page contract', () => {
  const stored = readHead(CURRENT);
  const backend = JSON.parse(stored[HEAD_BACKEND]) as { moduleName: string; endpoints: { route: string; page: string }[] };
  assert.ok(backend.endpoints.length > 0);
  const broken: string[] = [];
  for (const endpoint of backend.endpoints) {
    const logical = `l2/${backend.moduleName}/web/contracts/${endpoint.page}.defs.ts`;
    const source = stored[logical];
    if (source === undefined) { broken.push(`${endpoint.route}: contract absent`); continue; }
    const ast = readContractAst(source, logical);
    assert.deepEqual(ast.unparsed, [], logical);
    const bindings = ast.bindings.filter(item => item.route === endpoint.route);
    if (bindings.length !== 1 || !bindings[0].input) { broken.push(`${endpoint.route}: ${bindings.length} binding(s)`); continue; }
    if (ast.symbols.filter(item => item.name === bindings[0].input).length !== 1) broken.push(`${endpoint.route}: symbol ${bindings[0].input}`);
  }
  assert.deepEqual(broken, []);
});
