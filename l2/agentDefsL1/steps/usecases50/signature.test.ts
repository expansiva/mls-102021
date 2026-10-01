/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/signature.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { domainSignature, platformFieldPaths } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import type { D1UsecaseEntity, D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

const FIXTURE = 'controleEstoque-39a5166';

function produtoEntity(): D1UsecaseEntity {
  const files = loadD1Fixture(FIXTURE);
  const text = files['l4/controleEstoque/ontology/Produto.defs.ts'];
  assert.equal(typeof text, 'string');
  const body = parseD1Source(text, 'defs');
  assert.ok(body);
  return {
    entityId: 'Produto',
    storageTarget: 'mdm',
    defPath: 'l1/controleEstoque/layer_3_domain/entities/produto.defs.ts',
    namespace: 'controleEstoque',
    fields: [
      { name: 'id', type: 'uuid', derived: true },
      { name: 'version', type: 'integer', derived: true, writePrecondition: true },
    ],
    transitions: [],
    rules: [],
    enumerations: [],
    capabilities: [],
    platformFields: platformFieldPaths(body),
  };
}

void test('controleEstoque produto signatures come from the ontology, not the page contract', () => {
  const entity = produtoEntity();
  assert.ok(entity.platformFields?.includes('details.identification.name'));
  const list = domainSignature(entity, 'list');
  assert.ok(list.input.some(field => field.name === 'details.identification.name'));
  assert.deepEqual(list.input.slice(-2).map(field => field.name), ['page', 'pageSize']);
  assert.deepEqual(list.output.map(field => field.name), ['items', 'hasMore']);
  const create = domainSignature(entity, 'create');
  assert.equal(create.input.some(field => field.name === 'id' || field.name === 'version'), false);
  assert.ok(create.input.some(field => field.name === 'details.identification.name'));
  assert.ok(create.output.some(field => field.name === 'id'));
  const update = domainSignature(entity, 'update');
  assert.ok(update.input.some(field => field.name === 'version'));
  assert.ok(update.input.some(field => field.name === 'id'));
  const get = domainSignature(entity, 'get');
  assert.deepEqual(get.input.map(field => field.name), ['id']);
  assert.ok(get.output.some(field => field.name === 'version'));
});

void test('a usecase def does not depend on an l2 path', () => {
  const request = coreUsecaseRequest();
  request.contracts = [];
  request.usecases = request.usecases.filter(item => item.usecaseId === 'listConsulta');
  request.plans = request.plans.filter(item => item.usecaseId === 'listConsulta');
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => `${item.code} ${item.message}`).join('; '));
  const data = build.emit[0]?.definition.data as {
    routeProjections?: unknown;
    functions: Array<{ contractRefs?: unknown; input: Array<{ name: string }>; output: Array<{ name: string }> }>;
  };
  assert.equal(data.routeProjections, undefined);
  assert.equal(data.functions[0].contractRefs, undefined);
  assert.ok(data.functions[0].input.some(field => field.name === 'page'));
  assert.deepEqual(data.functions[0].output.map(field => field.name), ['items', 'hasMore']);
  const files = build.emit[0]?.pipeline[0]?.dependsFiles || [];
  assert.equal(files.some(file => /(^|\/)l2\//.test(file)), false);

  const planted = coreUsecaseRequest();
  const consulta = planted.entities.find(item => item.entityId === 'Consulta');
  assert.ok(consulta);
  consulta.defPath = 'l2/agendaClinica/web/contracts/consultas.defs.ts';
  planted.usecases = planted.usecases.filter(item => item.usecaseId === 'listConsulta');
  planted.plans = planted.plans.filter(item => item.usecaseId === 'listConsulta');
  const refused = buildD1Usecases(planted);
  assert.equal(refused.ok, false);
  assert.equal(refused.problems.some(item => item.code === 'L2_DEPENDENCY'), true);
});

void test('agendaClinica frozen fixtures are not the signature source', () => {
  const files = loadD1Fixture('agendaClinica-3f4f677');
  assert.equal(typeof files['l2/agendaClinica/web/contracts/consultas.defs.ts'], 'string');
  const request: D1UsecaseRequest = coreUsecaseRequest();
  request.contracts = [];
  assert.equal(request.contracts.length, 0);
});
