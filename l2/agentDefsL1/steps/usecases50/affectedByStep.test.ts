/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/affectedByStep.test.ts" enhancement="_blank"/>

// d1_291 s1: the entity a step lists in `affects` is written by the route of that step, not by every usecase of the entity of the step. Over the real L4 of the module `agents`
// (`mls-102047@809d9205`, a copy by `git archive` in /tmp, never the bench): `createAgentTool` and `updateAgentTool` stop depending on the port of the mark of an agent
// configured, `updatePersonalConduct` on the one of the record of the change; the port of each one still creates (`recordedWithParent`). A child of a relationship (d1_221) is as before.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { childWritersOf, loadWriterJourneys } from '/_102021_/l2/agentDefsL1/steps/usecases50/childWriters.js';
import { childPortsOf } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';

const COMMIT = '809d9205';
const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_291_real';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/workflows.defs.ts'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

async function realWriters() {
  extract();
  const read = async (logical: string): Promise<string | null> => {
    const rel = /^_\d+_\/(.+)$/.exec(logical)?.[1] ?? logical;
    const file = path.join(ROOT, rel);
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  };
  const { index, journeys, outside } = await loadWriterJourneys('agents', read);
  const entities: Record<string, unknown> = {};
  for (const name of readdirSync(path.join(ROOT, 'l4/agents/ontology'))) {
    if (!name.endsWith('.defs.ts') || name.startsWith('index')) continue;
    entities[name.replace('.defs.ts', '')] = parseD1Source(readFileSync(path.join(ROOT, 'l4/agents/ontology', name), 'utf8'), 'defs');
  }
  // The order the usecases50 step reads the journeys in (by id).
  return childWritersOf(index, entities, [...journeys].sort((left, right) => left.journeyId.localeCompare(right.journeyId)), outside);
}

const PORTS = [
  ['AgentConfigurationMark', 'AgentConfigurationMarkRepository'],
  ['ConductChange', 'ConductChangeRepository'],
  ['AgentTool', 'AgentToolRepository'],
  ['PersonalConduct', 'PersonalConductRepository'],
] as const;

function requestWith(childWriters: Array<{ childId: string; parentId: string; relationshipId: string }>) {
  return {
    childWriters,
    entities: PORTS.map(([entityId]) => ({ entityId, storageTarget: 'moduleDatabase', defPath: `l1/agents/layer_3_domain/entities/${entityId}.defs.ts` })),
    ports: PORTS.map(([entityId, portId]) => ({ entityId, portId, defPath: `l1/agents/layer_2_application/ports/${portId}.defs.ts`, methods: ['create', 'list'] })),
  } as never;
}

const item = (usecaseId: string, entityId: string, operation: string) => ({ usecaseId, entityId, operation }) as never;

void test('d1_291 s1: the real L4 of agents names the mark and the record of the change as written by a step, with no relationship', async () => {
  assert.deepEqual(await realWriters(), [
    { childId: 'AgentConfigurationMark', parentId: 'AgentTool', relationshipId: '' },
    { childId: 'ConductChange', parentId: 'PersonalConduct', relationshipId: '' },
  ], 'the list the port of each one still needs (recordedWithParent)');
});

void test('d1_291 s1: createAgentTool, updateAgentTool and updatePersonalConduct have no port of the affected entity', async () => {
  const request = requestWith(await realWriters());
  for (const usecase of [item('createAgentTool', 'AgentTool', 'create'), item('updateAgentTool', 'AgentTool', 'update'), item('updatePersonalConduct', 'PersonalConduct', 'update')]) {
    assert.deepEqual(childPortsOf(request, usecase).map(port => port.portId), [], (usecase as { usecaseId: string }).usecaseId);
  }
});

void test('d1_291 s1: a child of a relationship (d1_221) still gives its port to the write of its parent, and a read gives none', () => {
  const request = requestWith([{ childId: 'AgentConfigurationMark', parentId: 'AgentTool', relationshipId: 'markAgentTool' }]);
  assert.deepEqual(childPortsOf(request, item('createAgentTool', 'AgentTool', 'create')).map(port => port.portId), ['AgentConfigurationMarkRepository']);
  assert.deepEqual(childPortsOf(request, item('listAgentTool', 'AgentTool', 'list')).map(port => port.portId), []);
});
