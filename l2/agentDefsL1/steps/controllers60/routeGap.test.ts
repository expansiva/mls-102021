/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/routeGap.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';

/**
 * s0b. The five final comandaRestaurante contracts (3f69977). A route-scoped gap is `review` and an
 * `unresolved` node. `controllers60` still approves. `comandasAbertas.mesa` is a named relation on
 * the list item (s0c descends to that item); it is not an unparsed node and not an error.
 */
void test('3f69977: controllers60 approves and comandasAbertas.mesa is a related node', () => {
  const request = seedControllerRequest('comandaRestaurante-3f69977', 'comandaRestaurante');
  const build = buildD1Controllers(request);
  const errors = build.problems.filter(item => item.severity === 'error');
  assert.deepEqual(errors, [], errors.map(item => item.message).join('\n'));
  assert.equal(build.ok, true);
  const gaps = build.problems.filter(item => item.severity === 'review');
  assert.ok(gaps.length > 0, 'the contracts leave declared gaps');
  const route = 'comandaRestaurante.atendimento.atualizarLocalizacaoAtendimento';
  const row = build.services.flatMap(item => item.requests).find(item => item.route === route);
  assert.ok(row, route);
  const mesa = row.output.find(node => node.kind === 'related' && node.path === 'contextoAtendimento.comandasAbertas.items.mesa');
  assert.ok(mesa && mesa.kind === 'related', JSON.stringify(row.output));
  assert.equal(mesa.entity, 'Mesa');
  assert.equal(row.output.some(node => node.kind === 'unresolved' && node.path.includes('comandasAbertas.mesa')), false);
  assert.equal(build.problems.some(item => item.code === 'CONTRACT_UNPARSED' && item.severity === 'error'), false);
  assert.equal(build.controllers.flatMap(item => item.handlers).some(item => item.route === route), true);
});

/**
 * s0c. A list nested in a wrapper descends to the item. `items` is the page array and `fields` are
 * the item's own leaves. A crossed path (`<list>.<other list>.*`) is the old `memberBody`, which
 * returned the wrapper. Restoring that return makes this test red.
 */
void test('3f69977: carregarAtendimento nested lists carry the item fields', () => {
  const request = seedControllerRequest('comandaRestaurante-3f69977', 'comandaRestaurante');
  const build = buildD1Controllers(request);
  const route = 'comandaRestaurante.atendimento.carregarAtendimento';
  const row = build.services.flatMap(item => item.requests).find(item => item.route === route);
  assert.ok(row, route);
  const lists = ['contextoAtendimento.mesasDisponiveis', 'contextoAtendimento.comandasAbertas', 'contextoAtendimento.itensCardapio'];
  for (const path of lists) {
    const node = row.output.find(item => item.kind === 'list' && item.path === path);
    assert.ok(node && node.kind === 'list', path);
    assert.equal(node.items, 'items', path);
    assert.ok(node.fields.length > 0, `${path} fields`);
  }
  const mesas = row.output.find(item => item.kind === 'list' && item.path === lists[0]);
  assert.ok(mesas && mesas.kind === 'list');
  assert.ok(mesas.fields.some(field => field.field === 'id'));
  assert.ok(mesas.fields.some(field => field.field === 'code'));
  const names = lists.map(path => path.slice(path.lastIndexOf('.') + 1));
  const crossed = [...build.problems.map(item => item.message), ...row.output.filter(item => item.kind === 'unresolved').map(item => item.path)]
    .filter(text => names.some(left => names.some(right => left !== right && text.includes(`${left}.${right}`))));
  assert.deepEqual(crossed, []);
});
