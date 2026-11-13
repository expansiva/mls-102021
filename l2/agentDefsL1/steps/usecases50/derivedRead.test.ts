/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/derivedRead.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { derivedReadOf } from '/_102021_/l2/agentDefsL1/steps/usecases50/derivedRead.js';

const IDS = ['SolicitacaoCompra', 'PedidoCompra', 'PainelCompras'] as const;
const MEASURES = [
  'details.solicitacoesAguardandoAutorizacao',
  'details.pedidosEmAberto',
  'details.pedidosAtrasados',
  'details.totalComprado',
  'details.quantidadePedidos',
];

function ontology(name: string): Record<string, unknown> {
  const text = loadD1Fixture('compras-painel')[`l4/compras/ontology/${name}.defs.ts`];
  assert.equal(typeof text, 'string');
  const body = parseD1Source(text, 'defs');
  assert.ok(body && typeof body === 'object' && !Array.isArray(body));
  return structuredClone(body) as Record<string, unknown>;
}

void test('PainelCompras read shape comes from the ontology', () => {
  const read = derivedReadOf(ontology('PainelCompras'), IDS, 'PainelCompras');
  assert.ok(read);
  assert.deepEqual(read.problems, []);
  assert.deepEqual(read.derivedRead, {
    mode: 'onRead',
    sources: ['SolicitacaoCompra', 'PedidoCompra'],
    windowField: 'periodo',
    groupBy: ['fornecedorId'],
    measures: MEASURES,
  });
});

void test('a tdm ontology has no derived read', () => {
  assert.equal(derivedReadOf(ontology('PedidoCompra'), IDS, 'PedidoCompra'), null);
});

void test('a panel whose descriptions name no source is unreadable', () => {
  const body = ontology('PainelCompras');
  stripIds(body);
  const read = derivedReadOf(body, IDS, 'PainelCompras');
  assert.ok(read);
  assert.deepEqual(read.derivedRead.sources, []);
  assert.equal(read.problems.length, 1);
  assert.match(read.problems[0], /DDM_SOURCE_UNREADABLE/);
});

void test('a panel without one window field is unreadable', () => {
  const body = ontology('PainelCompras');
  const record = body.record as { fields: Record<string, unknown> };
  delete record.fields.periodo;
  const read = derivedReadOf(body, IDS, 'PainelCompras');
  assert.ok(read);
  assert.equal(read.derivedRead.windowField, '');
  assert.equal(read.problems.length, 1);
  assert.match(read.problems[0], /DDM_WINDOW_UNREADABLE/);
});

void test('an entity id that appears only in a title is not a source', () => {
  const body = ontology('PainelCompras');
  const record = body.record as { fields: Record<string, { title?: string }> };
  record.fields.fornecedorId.title = 'FornecedorMestre';
  const read = derivedReadOf(body, [...IDS, 'FornecedorMestre'], 'PainelCompras');
  assert.ok(read);
  assert.deepEqual(read.derivedRead.sources, ['SolicitacaoCompra', 'PedidoCompra']);
  assert.deepEqual(read.problems, []);
});

function stripIds(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) stripIds(item);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (key === 'description' && typeof child === 'string') {
      record[key] = child.replaceAll('SolicitacaoCompra', 'a request').replaceAll('PedidoCompra', 'an order');
    } else {
      stripIds(child);
    }
  }
}
