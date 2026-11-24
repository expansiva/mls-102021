/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/portWrite.test.ts" enhancement="_blank"/>

// d1_292 s0/s1: the function of a process that writes an entity through its port (an operation with no usecase) is told what the l4 says about that write, with the function in focus too:
// the task that names the entity is tied to no function, so the narrow context left out the capability and the unique key. On the real tree of `mls-102047@809d9205` (git archive, a copy in
// /tmp); no model.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import { loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const PROJECT = 102047;
const COMMIT = '809d9205';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_291_real';
const SECTION = 'The transaction of the route';
const ARRIVAL = 'The L4 says what this arrival does';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/workflows.defs.ts'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization', 'l5'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

const catalog = (name: string) => readFileSync(path.join(BASE, `mls-102021/l2/agentDefsL1/fixtures/agents-2e3e5a1b/_102034_/l2/shared/contracts/connections/${name}.txt`), 'utf8');

async function loaded() {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const base = createContext({ project: PROJECT, module: 'agents' } as never, units, 'dev');
  const files: Record<string, string> = { 'connections/cm.ts': catalog('cm'), 'connections/platform.ts': catalog('platform') };
  const read = async (ref: string) => {
    const hit = Object.entries(files).find(([end]) => ref.endsWith(end));
    return hit ? hit[1] : base.read(ref);
  };
  const ctx = { ...base, read } as typeof base;
  const human = async (processId: string, focus?: string) => (await loadWorkflowContext(ctx, units.find(item => item.unitId === processId) as never, undefined, focus)).human;
  return { human };
}

void test('d1_292: the focused function of virtualEmployeeCreation carries the port, the capability and the unique key of the mark the process writes', async () => {
  const { human } = await loaded();
  for (const focus of ['receiveDraftOutcome', 'completeDraftReview']) {
    const text = await human('virtualEmployeeCreation', focus);
    assert.match(text, /## repositoryPort AgentConfigurationMarkRepository/u, `${focus}: the port`);
    assert.match(text, /create\(agentConfigurationMark: AgentConfigurationMark\)/u);
    assert.match(text, /list\(agentConfigurationMarkFilter: AgentConfigurationMarkFilter\)/u);
    assert.match(text, /AgentConfigurationMark\.create \(task:applySuggestedTools, task:describeNewAgent\): no usecase: the function applies it through the entity port/u, `${focus}: the operation`);
    const section = text.slice(text.indexOf('## What the l4 says about AgentConfigurationMark'));
    assert.match(section, /What the l4 says about AgentConfigurationMark \(the process writes it through its port\)/u, `${focus}: the section`);
    assert.match(section, /- create: Marks an agent as configured after the tool suggestion succeeded, upserting by agent so a repeated mark changes nothing/u);
    assert.match(section, /Unique keys: \(agentId\)\./u);
  }
});

void test('d1_292: an entity written through a usecase, and a process that writes nothing through a port, get no such section', async () => {
  const { human } = await loaded();
  const text = await human('virtualEmployeeCreation', 'receiveDraftOutcome');
  assert.equal(text.includes('What the l4 says about AgentDraft (the process writes it through its port)'), false, 'AgentDraft has usecases');
  assert.equal(text.includes('What the l4 says about AgentTool (the process writes it through its port)'), false, 'AgentTool has usecases');
  assert.equal((await human('toolCatalogRefresh', 'applyReleaseCatalog')).includes('the process writes it through its port'), false);
  assert.equal((await human('executionRecording', 'recordExecutionSummary')).includes('the process writes it through its port'), false);
});
