/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/splitStored.test.ts" enhancement="_blank"/>

// d1_269: an entity the module stores is served by more than one call (repoHost: `listarConteudo` lists the folder, `lerArquivo` reads a file) and its one `list`
// usecase was the consumer of both, so the materializer had to call both. The usecase is split per call, as for an external entity.

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import type { D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { splitExternalUsecases } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';
import { assembleD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { answersByRoute } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';

const PROJECT = 102047;

function usecase(usecaseId: string, entity: string, operation: string): D1SelectedUsecase {
  return { usecaseId, entity, operation, status: 'toCreate', existing: '', identity: usecaseId, routes: [] };
}

const journeys = { consult: { journeyId: 'consult', business: { steps: [
  { stepId: 'browse', kind: 'locate', entity: 'Entry' },
  { stepId: 'open', kind: 'inspect', entity: 'Entry' },
] } } };
const connections = [
  { connectionId: 'gh', operationId: 'listFolder', direction: 'call', usedBy: ['consult.browse'], entityRefs: ['Entry'], effect: 'list' },
  { connectionId: 'gh', operationId: 'readFile', direction: 'call', usedBy: ['consult.open'], entityRefs: ['Entry'], effect: 'read' },
];

void test('a usecase of a stored entity served by two calls is split, one by call; with one call, or with the flag off, it is left as it is', () => {
  const split = (kind: string, calls: unknown[], splitStored: boolean) => splitExternalUsecases({
    journeys, connections: calls, usecases: [usecase('listEntry', 'Entry', 'list')], entityKind: new Map([['Entry', kind]]), taken: new Set(), splitStored,
  });
  const rows = (result: ReturnType<typeof split>) => result.usecases.map(item => `${item.usecaseId}|${item.operation}|${item.call ?? ''}`);
  assert.deepEqual(rows(split('entity', connections, true)), ['listEntry|list|gh.listFolder', 'getEntry|get|gh.readFile']);
  assert.deepEqual(rows(split('entity', connections, false)), ['listEntry|list|'], 'flag off: as before');
  assert.deepEqual(rows(split('entity', connections.slice(0, 1), true)), ['listEntry|list|'], 'one call on a stored entity: no `call` is put on it');
  assert.deepEqual(rows(split('external', connections.slice(0, 1), true)), ['listEntry|list|gh.listFolder'], 'an external entity keeps its one call');
  assert.deepEqual(rows(split('', connections, true)), ['listEntry|list|'], 'an entity the L4 does not give is not touched');
});

void test('repoHost at 74f17ca3: the list usecase calls listarConteudo, getRepositoryEntry calls lerArquivo, and the route lerArquivo uses the get', async () => {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'repoHost-74f17ca3', PROJECT);
  const receipt = await readResolveReceipt(PROJECT, 'repoHost');
  const snapshot = await assembleD1Input(PROJECT, 'repoHost', answersByRoute(receipt));
  const rows = snapshot.selection.usecases.map(item => `${item.usecaseId}|${item.operation}|${item.call ?? ''}`);
  assert.ok(rows.includes('listRepositoryEntry|list|github.listarConteudo'), rows.join('\n'));
  assert.ok(rows.includes('getRepositoryEntry|get|github.lerArquivo'), rows.join('\n'));
  const uses = Object.fromEntries((snapshot.selection.requests ?? []).map(request => [request.route, request.uses ?? []]));
  assert.deepEqual(uses['repoHost.conteudo_repositorio.lerArquivo'], ['getRepositoryEntry']);
  assert.deepEqual(uses['repoHost.conteudo_repositorio.listarItensRepositorio'], ['listRepositoryEntry']);
});
