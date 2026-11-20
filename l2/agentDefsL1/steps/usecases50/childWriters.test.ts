/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/childWriters.test.ts" enhancement="_blank"/>

// d1_221: the entity the L4 says its parent writes, read with the writer resolution of the NS5, over the real L4 of the module `conteudo`
// (`mls-102047@0aebbe0a`: `ContentFile` lives in an outside system, `Publication` is the record of each save, a table of the module).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import type { D1InputSnapshot, D1SourceDigest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import { loadVerifiedSources } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { childWritersOf, type D1WriterJourney } from '/_102021_/l2/agentDefsL1/steps/usecases50/childWriters.js';

const FILES = loadD1Fixture('conteudo-0aebbe0a');

function load(): { index: unknown; entities: Record<string, Record<string, unknown>>; journeys: D1WriterJourney[] } {
  const entities: Record<string, Record<string, unknown>> = {};
  const journeys: D1WriterJourney[] = [];
  let index: unknown = null;
  for (const [file, text] of Object.entries(FILES)) {
    const body = parseD1Source(text, 'defs') as Record<string, unknown> | null;
    assert.ok(body, file);
    if (file.endsWith('/ontology/index.defs.ts')) index = body;
    else if (file.includes('/ontology/')) entities[String(body.entityId)] = body;
    else if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) {
      const steps = ((body.business as { steps?: Array<Record<string, unknown>> }).steps ?? []).map(step => ({
        stepId: String(step.stepId),
        kind: String(step.kind ?? ''),
        entity: String(step.entity ?? ''),
        effect: String(step.effect ?? ''),
        affects: Array.isArray(step.affects) ? step.affects.map(String) : [],
      }));
      journeys.push({ journeyId: file.slice(file.lastIndexOf('/') + 1).replace('.defs.ts', ''), steps });
    }
  }
  return { index, entities, journeys };
}

void test('d1_221: the record of each save is written by the usecase that writes the file, through the relationship the L4 names', () => {
  const { index, entities, journeys } = load();
  assert.equal(entities.ContentFile.kind, 'external');
  assert.deepEqual(childWritersOf(index, entities, journeys), [
    { childId: 'Publication', parentId: 'ContentFile', relationshipId: 'publicationContentFile' },
  ]);
});

void test('d1_226: the answer of the NS5 decides, with the map of what is written outside the journeys: the real integration of conteudo (5a595492) keeps the record of each save', () => {
  const { index, entities, journeys } = load();
  const integration = parseD1Source(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../agentMaterializeL1/steps/requests50/fixtures/conteudoIntegration5a595492.recorded.txt'), 'utf8'), 'defs');
  assert.deepEqual(childWritersOf(index, entities, journeys, { integration } as never), [
    { childId: 'Publication', parentId: 'ContentFile', relationshipId: 'publicationContentFile' },
  ]);
});

void test('d1_226: an entity another writer owns is not recorded with its parent, whatever its class: a process, an inbound line or a serve route', () => {
  const { index, entities, journeys } = load();
  const byProcess = { workflows: { processes: [{ processId: 'p', tasks: [{ taskId: 't', kind: 'mechanical', entityRef: 'Publication', effect: 'create' }] }] } };
  const byInbound = { integration: { inbound: [{ id: 'in', writes: ['Publication'] }] } };
  const byServe = { integration: { connections: [{ connectionId: 'c', operationId: 'o', direction: 'serve', effect: 'create', entityRefs: ['Publication'] }] } };
  for (const outside of [byProcess, byInbound, byServe]) assert.deepEqual(childWritersOf(index, entities, journeys, outside as never), [], JSON.stringify(outside));
  // The class is not asked: the same entity as a supporting record is the same answer.
  entities.Publication = { ...entities.Publication, class: 'supporting' };
  assert.deepEqual(childWritersOf(index, entities, journeys).map(item => item.childId), ['Publication']);
  assert.deepEqual(childWritersOf(index, entities, journeys, byProcess as never), []);
});

void test('d1_221: a parent nobody writes has no child to record', () => {
  const { index, entities, journeys } = load();
  const withoutActs = journeys.map(journey => ({ ...journey, steps: journey.steps.filter(step => step.kind !== 'act') }));
  assert.deepEqual(childWritersOf(index, entities, withoutActs), []);
});

void test('d1_221: no index, or no entity, is no child', () => {
  const { entities, journeys } = load();
  assert.deepEqual(childWritersOf(null, entities, journeys), []);
  assert.deepEqual(childWritersOf({}, {}, journeys), []);
});

void test('d1_221: usecases50 reads the L4 it verified and hands the request the entity its parent writes', async () => {
  const project = 102047;
  const host = installStudio(project);
  const digests: D1SourceDigest[] = [];
  for (const [file, text] of Object.entries(FILES)) {
    const info = fileInfoFromDisplay(project, file);
    assert.ok(info, file);
    seed(host, info, text, 'case');
    digests.push({ path: file, sha256: await sha256Text(text), bytes: text.length, schemaVersion: '', state: 'present' });
  }
  const snapshot = { sources: digests, selection: { pages: [], requests: [] } } as unknown as D1InputSnapshot;
  const bundle = await loadVerifiedSources(project, 'conteudo', snapshot, ['ContentFile', 'Publication']);
  assert.deepEqual(bundle.childWriters, [{ childId: 'Publication', parentId: 'ContentFile', relationshipId: 'publicationContentFile' }]);
});
