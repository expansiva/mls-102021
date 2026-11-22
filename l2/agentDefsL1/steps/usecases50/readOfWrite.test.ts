/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/readOfWrite.test.ts" enhancement="_blank"/>

// d1_280 s2: the def of a usecase follows the operation of the usecase. The read that the split names `get` carries the rules, the effects and the child port of a
// write only if it was planned as the write: with the operation `get` it has none of them (`PersonalConduct`: the write records `ConductChange`, the read does not).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { coreUsecaseRequest, fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(new URL('../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts', import.meta.url), 'utf8'));

void test('d1_280 s2: the get of an entity a write also records a child of has no child port, rule or effect; the update has the child port', () => {
  const request = coreUsecaseRequest();
  const parent = request.entities.find(item => item.entityId === 'Consulta')!;
  const port = request.ports.find(item => item.entityId === 'Consulta')!;
  request.entities.push({ ...parent, entityId: 'ConsultaNota', defPath: 'l1/agendaClinica/layer_3_domain/entities/consultaNota.defs.ts' });
  request.ports.push({ ...port, entityId: 'ConsultaNota', portId: 'ConsultaNotaRepository', defPath: 'l1/agendaClinica/layer_2_application/ports/consultaNotaRepository.defs.ts' });
  request.childWriters = [{ childId: 'ConsultaNota', parentId: 'Consulta', relationshipId: '' }];
  const base = request.usecases.find(item => item.usecaseId === 'createConsulta')!;
  request.usecases = [
    { ...base, usecaseId: 'updateConsulta', operation: 'update', routes: [], identity: 'updateConsulta' },
    { ...base, usecaseId: 'getConsulta', operation: 'get', routes: [], identity: 'getConsulta' },
  ];
  request.files = [];
  request.plans = request.usecases.map(item => fixturePlan(request, item));
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.map(item => item.message).join('; '));
  const emitted = (id: string) => build.emit.find(item => item.definition.artifactId === id)!;
  const get = emitted('getConsulta');
  const update = emitted('updateConsulta');
  const getData = get.definition.data as { operation: string; rulesApplied: string[]; effects: unknown[] };
  assert.equal(getData.operation, 'get');
  assert.deepEqual(getData.effects, []);
  assert.equal(get.pipeline[0].dependsFiles.some(path => path.includes('consultaNotaRepository')), false, 'the read has no child port');
  assert.equal(update.pipeline[0].dependsFiles.some(path => path.includes('consultaNotaRepository')), true, 'the write records the child');
  assert.ok((get.definition.data as { rulesApplied: string[] }).rulesApplied.length <= (update.definition.data as { rulesApplied: string[] }).rulesApplied.length);
});
