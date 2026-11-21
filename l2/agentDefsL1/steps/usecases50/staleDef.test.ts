/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/staleDef.test.ts" enhancement="_blank"/>

// d1_271: a preserved usecase def is written again when it does not pass the schema of today (`data.ports`, the format of an earlier generator), and left as it is
// when it passes and its dependencies and call sources are what the plan gives.

import assert from 'node:assert/strict';
import test from 'node:test';

import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { pendingDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { dependenciesStale } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';

const PROJECT = 102099;
const DEF_PATH = `_${PROJECT}_/l1/agendaClinica/layer_2_application/usecases/getConsulta.defs.ts`;
const DEPENDENCIES = [`_${PROJECT}_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts`];

function valid(): string {
  const definition = pendingDefinition('usecase', 'getConsulta', 'agendaClinica', { usecaseId: 'getConsulta', entityId: 'Consulta', operation: 'get', rulesApplied: [], effects: [] });
  definition.dependencies = [...DEPENDENCIES];
  const rendered = renderDefinition(definition, DEF_PATH);
  assert.ok('source' in rendered, JSON.stringify(rendered));
  return (rendered as { source: string }).source;
}

function onDisk(content: string | null): void {
  const host = installStudio(PROJECT);
  if (content !== null) seed(host, artifactFile(PROJECT, DEF_PATH)!, content, 'm');
  assert.ok(host);
}

void test('a def that passes the schema and has what the plan gives is left as it is', async () => {
  onDisk(valid());
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, DEPENDENCIES, undefined), false);
});

void test('a def of an earlier format (data.ports) does not pass the schema and is written again', async () => {
  onDisk(valid().replace('"effects": []', '"effects": [],\n    "ports": ["ConsultaRepository"]'));
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, DEPENDENCIES, undefined), true);
});

void test('a def that cannot be read as a definition is written again; a def that is not there is not stale', async () => {
  onDisk('export const definition = { not json');
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, DEPENDENCIES, undefined), true);
  onDisk(null);
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, DEPENDENCIES, undefined), false);
});

void test('the criteria of d1_266 stay: other dependencies, other call sources', async () => {
  onDisk(valid());
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, [...DEPENDENCIES, `_${PROJECT}_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts`], undefined), true);
  assert.equal(await dependenciesStale(PROJECT, DEF_PATH, DEPENDENCIES, [{ call: 'a.b', input: [{ field: 'x', from: { kind: 'input', field: 'y' } }] }]), true);
  assert.ok(fileKey);
});
