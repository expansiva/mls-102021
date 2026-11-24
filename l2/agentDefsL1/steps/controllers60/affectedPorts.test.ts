/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/affectedPorts.test.ts" enhancement="_blank"/>

// d1_291 s2: the request def of a page depends on the port of the entity a step of the page lists in `affects`, when a command of the page serves that step. Over the real files of the module
// `agents` (`mls-102047@809d9205`, a copy by `git archive` in /tmp, never the bench): the needs, the journeys, the selected requests and the ports persistence40 planned.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { affectedPortsByPage } from '/_102021_/l2/agentDefsL1/steps/controllers60/affectedPorts.js';
import { seedControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import { childWritersOf, loadWriterJourneys } from '/_102021_/l2/agentDefsL1/steps/usecases50/childWriters.js';

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

const json = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8')) as Record<string, unknown>;

async function real() {
  extract();
  const read = async (logical: string): Promise<string | null> => {
    const file = path.join(ROOT, /^_\d+_\/(.+)$/.exec(logical)?.[1] ?? logical);
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  };
  const { index, journeys, outside } = await loadWriterJourneys('agents', read);
  const ontology: Record<string, unknown> = {};
  for (const name of readdirSync(path.join(ROOT, 'l4/agents/ontology'))) {
    if (name.endsWith('.defs.ts') && !name.startsWith('index')) ontology[name.replace('.defs.ts', '')] = parseD1Source(readFileSync(path.join(ROOT, 'l4/agents/ontology', name), 'utf8'), 'defs');
  }
  const sorted = [...journeys].sort((left, right) => left.journeyId.localeCompare(right.journeyId));
  const childWriters = childWritersOf(index, ontology, sorted, outside);
  const requests = ((json('l1/agents/pipeline/agentDefsL1/input.json').selection as { requests: Array<{ route: string; pageId: string; kind: string; writes: string }> }).requests);
  const ports = (json('l1/agents/pipeline/agentDefsL1/drafts/persistence40.json').ports as Array<{ entityId: string; portId: string; defPath: string }>);
  const needs = json('l4/agents/pool/l1/web/needs.json');
  return { needs, journeys: sorted, childWriters, requests, ports };
}

void test('d1_291 s2: on the real agents, the pages whose command serves a step that affects the mark or the record of the change depend on their port', async () => {
  const input = await real();
  const byPage = affectedPortsByPage(input);
  const ids = (pageId: string) => (byPage[pageId] ?? []).map(port => port.portId);
  assert.deepEqual(ids('agent_tools'), ['AgentConfigurationMarkRepository'], 'suggestTools affects the mark');
  assert.deepEqual(ids('agent_configuration'), ['AgentConfigurationMarkRepository'], 'saveConfiguration affects the mark (and AgentTool, which has a writer of its own)');
  assert.deepEqual(ids('draft_review'), ['AgentConfigurationMarkRepository'], 'activateDraft affects the mark');
  assert.deepEqual(ids('my_conduct'), ['ConductChangeRepository'], 'changeConduct affects the record of the change');
  // The pages whose steps include one of these but no command serves it get nothing (the hub page lists the steps of every journey).
  assert.deepEqual(Object.keys(byPage).sort(), ['agent_configuration', 'agent_tools', 'draft_review', 'my_conduct']);
  assert.equal(byPage.agent_tools[0].defPath, 'l1/agents/layer_2_application/ports/agentConfigurationMarkRepository.defs.ts');
});

void test('d1_291 s2: no step-written entity, no command, or no port: no dependency', async () => {
  const input = await real();
  assert.deepEqual(affectedPortsByPage({ ...input, childWriters: input.childWriters.map(child => ({ ...child, relationshipId: 'rel' })) }), {}, 'a child of a relationship is the usecase\'s');
  assert.deepEqual(affectedPortsByPage({ ...input, requests: input.requests.filter(request => request.kind === 'qry') }), {});
  assert.deepEqual(affectedPortsByPage({ ...input, ports: [] }), {});
});

void test('d1_291 s2: the request def and its pipeline item of that page list the port; the other pages keep what they had', () => {
  const id = 'controleEstoque-39a5166';
  const request = seedControllerRequest(id, 'controleEstoque');
  const plain = buildD1Controllers(request);
  assert.equal(plain.ok, true);
  const pageId = plain.services[0].pageId;
  const port = { entityId: 'Mark', portId: 'MarkRepository', defPath: 'l1/controleEstoque/layer_2_application/ports/markRepository.defs.ts' };
  const build = buildD1Controllers({ ...request, affectedPorts: { [pageId]: [port] } });
  assert.equal(build.ok, true, build.problems.filter(item => item.severity === 'error').map(item => item.message).join('; '));
  const service = (from: typeof build, page: string) => from.services.find(item => item.pageId === page)!;
  assert.equal(service(build, pageId).definition?.dependencies.some(file => file.endsWith(port.defPath)), true);
  assert.equal(service(plain, pageId).definition?.dependencies.some(file => file.endsWith(port.defPath)), false);
  const emitted = build.emit.find(item => item.definition.artifactType === 'requestService' && item.pipeline[0].id.endsWith(`/${pageId}`))!;
  assert.equal(emitted.pipeline[0].dependsOn.some(item => item.includes('repositoryPort') && item.endsWith('MarkRepository')), true, emitted.pipeline[0].dependsOn.join(','));
  assert.equal(emitted.pipeline[0].dependsFiles.some(file => file.endsWith(port.defPath)), true);
  for (const other of plain.services.filter(item => item.pageId !== pageId)) {
    assert.deepEqual(service(build, other.pageId).definition?.dependencies, other.definition?.dependencies, other.pageId);
  }
});
