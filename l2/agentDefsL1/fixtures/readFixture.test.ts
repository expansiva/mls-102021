/// <mls fileReference="_102021_/l2/agentDefsL1/fixtures/readFixture.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT = path.resolve(HERE, '..');
const FROZEN = 'controleEstoque-39a5166';
const NAMES = /\b(?:controleEstoque|MovimentacaoEstoque|Produto|produtos|movimentacoes)\b/;

function walk(dir: string, acc: string[]): void {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, acc);
    else acc.push(abs);
  }
}

void test('loadD1Fixture returns the frozen copy by logical path', () => {
  const files = loadD1Fixture(FROZEN);
  const sample = 'l4/controleEstoque/module.defs.ts';
  const stored = readFileSync(path.join(HERE, FROZEN, 'l4/controleEstoque/module.defs.txt'), 'utf8');
  assert.equal(files[sample], stored);
  assert.match(stored, /"moduleName": "controleEstoque"/);
  assert.equal(files['l2/controleEstoque/web/contracts/produtos.defs.ts']?.includes("kind: 'qry'"), true);
  assert.ok(files['_102034_/l4/ontology/mdm.defs.ts']?.includes('export'));
  assert.equal('SOURCE.md' in files, false);
});

void test('renamed and synthetic fixtures do not keep the frozen module names', () => {
  for (const id of ['ledgerBin-39a5166', 'synthetic-v2']) {
    const files = loadD1Fixture(id);
    const hits = Object.entries(files).filter(([logical, text]) => NAMES.test(logical) || NAMES.test(text));
    assert.deepEqual(hits.map(([logical]) => logical), []);
  }
});

void test('synthetic fixture carries the shapes the frozen module lacks', () => {
  const files = loadD1Fixture('synthetic-v2');
  const cards = files['l2/ledgerDesk/web/contracts/cards.defs.ts'] ?? '';
  const board = files['l2/ledgerDesk/web/contracts/board.defs.ts'] ?? '';
  const veredito = files['l2/ledgerDesk/web/contracts/veredito.defs.ts'] ?? '';
  const journey = files['l4/ledgerDesk/journeys/decidirSlip.defs.ts'] ?? '';
  const backend = files['l4/ledgerDesk/pool/l2/web/backend.json'] ?? '';
  assert.match(cards, /writes: 'ItemCard\.update'/);
  assert.match(cards, /writes: 'DeskNote\.aprovar'/);
  assert.match(cards, /version: number/);
  assert.match(cards, /entity: 'DeskNote'; many: false/);
  assert.match(cards, /entity: 'ItemCard'; many: false/);
  assert.doesNotMatch(cards, /localWrites/);
  assert.doesNotMatch(board, /writes:/);
  assert.match(board, /kind: 'qry'/);
  assert.match(veredito, /writes: 'Slip\.aprovar'/);
  assert.match(veredito, /writes: 'Slip\.rejeitar'/);
  assert.match(journey, /"kind": "decide"/);
  assert.match(backend, /"usecaseId": "aprovarDeskNote"/);
  assert.match(backend, /"usecaseId": "aprovarSlip"/);
  assert.match(backend, /"transitionRef": "aprovar"/);
});

void test('agentDefsL1 non-test ts does not name the frozen module', () => {
  const files: string[] = [];
  walk(AGENT, files);
  const hits = files.filter(file => {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) return false;
    if (file.includes(`${path.sep}fixtures${path.sep}${FROZEN}${path.sep}`)) return false;
    return NAMES.test(readFileSync(file, 'utf8'));
  });
  assert.deepEqual(hits, []);
});
