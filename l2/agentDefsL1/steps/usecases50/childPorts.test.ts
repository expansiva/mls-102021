/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/childPorts.test.ts" enhancement="_blank"/>

// d1_221: the port of the entity the L4 says its parent writes is a dependency of the usecases that write the parent, and of no other.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

const PORT = 'ConsultaRepository';

function dependencies(build: ReturnType<typeof buildD1Usecases>, usecaseId: string): { dependsOn: string[]; dependsFiles: string[]; definition: string[] } {
  const emit = build.emit.find(item => item.definition.artifactId === usecaseId);
  assert.ok(emit, usecaseId);
  return {
    dependsOn: emit.pipeline[0].dependsOn,
    dependsFiles: emit.pipeline[0].dependsFiles,
    definition: emit.definition.dependencies,
  };
}

const hasPort = (deps: string[]): boolean => deps.some(dep => dep.includes(PORT) || dep.includes('/repositoryPort/'));

void test('d1_221: a usecase that writes the parent depends on the port of the child; a read and the other usecases do not', () => {
  const plain = buildD1Usecases(coreUsecaseRequest());
  assert.equal(plain.ok, true, plain.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const request = coreUsecaseRequest();
  request.childWriters = [{ childId: 'Consulta', parentId: 'Profissional', relationshipId: 'consultaProfissional' }];
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const port = request.ports.find(item => item.portId === PORT);
  assert.ok(port?.defPath);
  for (const usecaseId of ['createProfissional', 'updateProfissional']) {
    const deps = dependencies(build, usecaseId);
    assert.equal(deps.dependsFiles.some(file => file.endsWith(port.defPath)), true, `${usecaseId} files`);
    assert.equal(deps.dependsOn.some(id => id.includes('repositoryPort') && id.includes(PORT)), true, `${usecaseId} dependsOn`);
    assert.equal(deps.definition.some(file => file.endsWith(port.defPath)), true, `${usecaseId} def dependencies`);
    assert.equal(hasPort(dependencies(plain, usecaseId).dependsFiles), false, `${usecaseId} before`);
  }
  // A read, an entity that is not the parent, and the child's own usecases keep what they had.
  for (const usecaseId of ['listProfissional', 'createRecepcionista', 'listConsulta', 'createConsulta', 'registrarAtendimento']) {
    assert.deepEqual(dependencies(build, usecaseId), dependencies(plain, usecaseId), usecaseId);
  }
});

void test('d1_221: a child that is not in the module database has no port to add', () => {
  const request = coreUsecaseRequest();
  request.childWriters = [{ childId: 'Paciente', parentId: 'Consulta', relationshipId: 'consultaPaciente' }];
  const plain = buildD1Usecases(coreUsecaseRequest());
  const build = buildD1Usecases(request);
  for (const usecaseId of ['createConsulta', 'registrarAtendimento', 'confirmarConsulta']) {
    assert.deepEqual(dependencies(build, usecaseId), dependencies(plain, usecaseId), usecaseId);
  }
});
