/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/routeGap.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';

/**
 * s0b. The five final comandaRestaurante contracts (3f69977). A route-scoped gap is `review` and an
 * `unresolved` node. `controllers60` still approves. Turning the path `CONTRACT_UNPARSED` back into
 * an `error` (requestService.ts, the node that does not assemble) makes this test red.
 */
void test('3f69977: controllers60 approves and comandasAbertas.mesa is unresolved', () => {
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
  const mesa = row.output.find(node => node.kind === 'unresolved' && node.path === 'contextoAtendimento.comandasAbertas.mesa');
  assert.ok(mesa && mesa.kind === 'unresolved', JSON.stringify(row.output));
  assert.match(mesa.reason, /^CONTRACT_UNPARSED:/);
  assert.equal(build.problems.some(item => item.code === 'CONTRACT_UNPARSED' && item.severity === 'error'), false);
  assert.equal(build.controllers.flatMap(item => item.handlers).some(item => item.route === route), true);
});
