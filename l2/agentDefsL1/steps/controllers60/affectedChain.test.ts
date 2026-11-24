/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/affectedChain.test.ts" enhancement="_blank"/>

// d1_291 s3: the chain of the defs step, without a model, on the real tree of `mls-102047@809d9205` (a copy by `git archive` in /tmp, never the bench). usecases50 is rebuilt from the request it stored (`usecases50-work.json`:
// no plan to ask a model, `llmCalls` 0) and controllers60 from the drafts and the L4 of the tree; each is compared with the defs the commit has. Only the defs the decision changes change, and the run has no error.
// What needs a model (the code of the usecases and of the routes, usecases40 and requests50) is not run here.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
import { assembleD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/io.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import type { D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { graphIssues, type D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';

const PROJECT = 102047;
const COMMIT = '809d9205';
const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_291_real';
const DRAFTS = 'l1/agents/pipeline/agentDefsL1/drafts';

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

const file = (rel: string): string => readFileSync(path.join(ROOT, rel), 'utf8');
const base = (dependency: string): string => dependency.split('/').pop() ?? dependency;
type Def = { artifactId: string; dependencies: string[]; data: unknown };

/** What a def gained and lost in `dependencies` (file names), and whether its data is the same. */
function change(before: Def, after: Def): { added: string[]; removed: string[]; sameData: boolean } {
  return {
    added: after.dependencies.filter(item => !before.dependencies.includes(item)).map(base),
    removed: before.dependencies.filter(item => !after.dependencies.includes(item)).map(base),
    sameData: JSON.stringify(before.data) === JSON.stringify(after.data),
  };
}

void test('d1_291 s3: usecases50 rebuilt from the stored request: only the three usecases that wrote the affected entity lose its port', () => {
  extract();
  const request = (JSON.parse(file(`${DRAFTS}/usecases50-work.json`)) as { request: D1UsecaseRequest }).request;
  assert.equal(request.plans?.length ?? 0, 0, 'nothing for a model to answer');
  const stored = (JSON.parse(file(`${DRAFTS}/usecases50.json`)) as { emit: Array<{ definition: Def & Record<string, unknown>; pipeline: unknown }> }).emit;
  const build = buildD1Usecases(request);
  assert.equal(build.ok, true);
  assert.deepEqual(build.problems.filter(problem => problem.severity === 'error'), []);
  assert.equal(build.emit.length, stored.length);
  const changed: Record<string, ReturnType<typeof change>> = {};
  for (const item of build.emit) {
    const before = stored.find(entry => entry.definition.artifactId === item.definition.artifactId);
    assert.ok(before, item.definition.artifactId);
    if (JSON.stringify(before.definition) !== JSON.stringify(item.definition) || JSON.stringify(before.pipeline) !== JSON.stringify(item.pipeline)) {
      changed[item.definition.artifactId] = change(before.definition, item.definition as unknown as Def);
    }
  }
  assert.deepEqual(changed, {
    createAgentTool: { added: [], removed: ['agentConfigurationMarkRepository.defs.ts'], sameData: true },
    updateAgentTool: { added: [], removed: ['agentConfigurationMarkRepository.defs.ts'], sameData: true },
    updatePersonalConduct: { added: [], removed: ['conductChangeRepository.defs.ts'], sameData: true },
  });
});

void test('d1_291 s3: controllers60 from the drafts and the L4 of the tree: only the request defs of the three pages whose command writes the affected entity gain the port (not draft_review: the process writes the mark), with the same data, and the run has no error', async () => {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const out = await assembleD1Controllers(PROJECT, 'agents');
  assert.ok('build' in out, JSON.stringify(out));
  assert.deepEqual(out.build.problems.filter(problem => problem.severity === 'error').map(problem => `${problem.code} ${problem.message}`), []);
  assert.equal(out.build.ok, true);
  const changed: Record<string, ReturnType<typeof change>> = {};
  for (const item of out.build.emit) {
    if (item.definition.artifactType !== 'requestService') continue;
    const text = file(`l1/agents/layer_2_application/requests/${item.definition.artifactId}.defs.ts`);
    const committed = JSON.parse(text.slice(text.indexOf('{', text.indexOf('export const definition')), text.lastIndexOf(' as const;'))) as Def;
    const result = change(committed, item.definition as unknown as Def);
    if (result.added.length || result.removed.length || !result.sameData) changed[item.definition.artifactId] = result;
  }
  assert.deepEqual(changed, {
    agent_configuration: { added: ['agentConfigurationMarkRepository.defs.ts'], removed: [], sameData: true },
    agent_tools: { added: ['agentConfigurationMarkRepository.defs.ts'], removed: [], sameData: true },
    my_conduct: { added: ['conductChangeRepository.defs.ts'], removed: [], sameData: true },
  });
});

void test('d1_291 s3: the pipeline of the whole chain, with the new defs, has no issue the stored chain did not have (the graph check of the catalog: orphan, forbidden dependency, cycle)', async () => {
  extract();
  const pipelineOf = (draft: string): D1PipelineItem[] => (JSON.parse(file(`${DRAFTS}/${draft}.json`)) as { emit: Array<{ pipeline: D1PipelineItem[] }> }).emit.flatMap(item => item.pipeline);
  const request = (JSON.parse(file(`${DRAFTS}/usecases50-work.json`)) as { request: D1UsecaseRequest }).request;
  const usecases = buildD1Usecases(request).emit.flatMap(item => item.pipeline);
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const out = await assembleD1Controllers(PROJECT, 'agents');
  assert.ok('build' in out);
  const controllers = out.build.emit.flatMap(item => item.pipeline);
  const services = controllers.filter(item => item.type === 'requestService');
  assert.equal(services.some(item => item.dependsOn.some(id => id.includes('repositoryPort'))), true, 'the new dependency is in the graph');
  const rest = [...pipelineOf('domain30'), ...pipelineOf('persistence40'), ...pipelineOf('support70')];
  const issues = graphIssues([...rest, ...usecases, ...controllers] as D1PipelineItem[]);
  // The stored drafts carry issues of their own (the domain entities list each other); what the change must not do is add one.
  assert.deepEqual(issues, graphIssues([...rest, ...pipelineOf('usecases50'), ...pipelineOf('controllers60')]), 'the same issues as the stored chain');
  assert.equal(issues.some(item => /Orphan|cycle|requestService|usecase /iu.test(item)), false, issues.join('; '));
});

