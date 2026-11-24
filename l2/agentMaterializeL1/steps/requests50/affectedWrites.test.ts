/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/affectedWrites.test.ts" enhancement="_blank"/>

// d1_291 s2: the context of the request service of a page carries, for the command whose step lists an entity in `affects`, the section of that entity (the step, what the l4 says of its write, its
// unique key, its port); the other commands of the page do not. On the real tree of `mls-102047@809d9205` (git archive, a copy in /tmp; never the bench) with the dependency on the port that the defs
// step now gives the request def. No model.

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
import { loadModuleUnits, storEntries, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { affectedWritesOf, journeySteps } from '/_102021_/l2/agentMaterializeL1/steps/requests50/affectedWrites.js';
import { loadRequestContext } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const PROJECT = 102047;
const COMMIT = '809d9205';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_291_real';
const SECTION = /written by the step of the route \(no usecase writes it: through its port\)/u;

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

/** What the defs step now gives each request def: the port of the entity a step of its page lists in `affects` (d1_291 s2). */
const PORTS: Record<string, string> = {
  agent_tools: 'agentConfigurationMarkRepository',
  agent_configuration: 'agentConfigurationMarkRepository',
  draft_review: 'agentConfigurationMarkRepository',
  my_conduct: 'conductChangeRepository',
};

async function loaded() {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) put(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), COMMIT);
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');
  const { units } = await loadModuleUnits(PROJECT, 'agents', storEntries());
  const withDependency = units.map(unit => {
    const port = unit.layer === 'requests' ? PORTS[String(unit.definition.data.pageId ?? unit.unitId)] : undefined;
    if (!port) return unit;
    const ref = `_${PROJECT}_/l1/agents/layer_2_application/ports/${port}.defs.ts`;
    return { ...unit, definition: { ...unit.definition, dependencies: [...unit.definition.dependencies, ref] } } as M12Unit;
  });
  const ctx = createContext({ project: PROJECT, module: 'agents' } as never, withDependency, 'dev');
  const context = async (pageId: string) => (await loadRequestContext(ctx, withDependency.find(unit => unit.layer === 'requests' && unit.unitId === pageId)!)).human;
  return { context, units: withDependency };
}

/** The part of the context that is the section of one affected entity. */
const sectionOf = (human: string, entity: string): string => {
  const start = human.indexOf(`## ${entity} written by the step of the route`);
  if (start < 0) return '';
  const next = human.indexOf('\n## ', start + 4);
  return human.slice(start, next < 0 ? undefined : next);
};

void test('d1_291 s2: the command of the step that affects the mark gets the section; the manual choice and the toggle of the same page do not', async () => {
  const { context } = await loaded();
  const human = await context('agent_tools');
  const text = sectionOf(human, 'AgentConfigurationMark');
  assert.match(text, SECTION);
  assert.match(text, /- agents\.agent_tools\.suggestTools: the step `adjustAgentTools\/suggestTools` \(Sugerir ferramentas\) lists AgentConfigurationMark in `affects`/u);
  assert.doesNotMatch(text, /agent_tools\.enableUnchosenTool|agent_tools\.toggleToolChoice/u, 'the other commands are not named');
  assert.match(text, /If the suggestion fails, nothing is marked/u, 'the step description');
  assert.match(text, /- create: Marks an agent as configured after the tool suggestion succeeded, upserting by agent so a repeated mark changes nothing/u, 'the l4 capability of the write');
  assert.match(text, /- transaction: Writes the mark together with the automatic tool choices of the suggestion, all or nothing/u);
  assert.match(text, /Unique keys: \(agentId\)/u);
  assert.match(text, /resolveRepository<AgentConfigurationMarkRepository>\(bound, 'AgentConfigurationMarkRepository'\)/u);
  assert.match(text, /export interface AgentConfigurationMarkRepository/u, 'the signature of the port');
});

void test('d1_291 s2: the commands of the saveConfiguration, activateDraft and changeConduct steps get their section; a page with no port dependency gets none', async () => {
  const { context } = await loaded();
  assert.match(sectionOf(await context('agent_configuration'), 'AgentConfigurationMark'), /agents\.agent_configuration\.saveAgentConfiguration: the step `configureAgent\/saveConfiguration`/u);
  assert.match(sectionOf(await context('draft_review'), 'AgentConfigurationMark'), /agents\.draft_review\.activateDraft: the step `reviewAndActivateDraft\/activateDraft`/u);
  const conduct = sectionOf(await context('my_conduct'), 'ConductChange');
  assert.match(conduct, /agents\.my_conduct\.sendConductChange: the step `changeMyConduct\/changeConduct`/u, 'tied by what it writes: its trigger is not the id of the step');
  assert.doesNotMatch(await context('agents'), SECTION);
  assert.doesNotMatch(await context('agent_behavior'), SECTION);
});

void test('d1_291 s2: affectedWritesOf ties a command to its step by the trigger first, by what it writes when the trigger is no step, and by neither when the page has two such steps', async () => {
  const shared = (requests: unknown, steps: string[]) => `export const definition = ${JSON.stringify({ requests, journeys: steps.map(step => ({ step })) })} as const;\n`;
  const journey = `export const journey = ${JSON.stringify({ business: { steps: [
    { stepId: 'a', kind: 'act', entity: 'E', effect: 'update', affects: ['M'], title: 'A', description: 'does a' },
    { stepId: 'b', kind: 'act', entity: 'E', effect: 'update', affects: ['M'], title: 'B', description: 'does b' },
    { stepId: 'c', kind: 'act', entity: 'F', effect: 'create', affects: ['M'], title: 'C', description: 'does c' },
  ] } })} as const;\n`;
  const run = (requests: unknown, steps: string[]) => affectedWritesOf({ routes: [{ route: 'm.p.go', kind: 'cmd' }], shared: shared(requests, steps), portEntities: new Set(['M']), readJourney: async () => journey });
  assert.deepEqual((await run({ go: { trigger: 'b', writes: 'E.update' } }, ['j/a', 'j/b'])).map(item => item.stepId), ['b'], 'the trigger is the step');
  assert.deepEqual((await run({ go: { trigger: 'x', writes: 'F.create' } }, ['j/a', 'j/c'])).map(item => item.stepId), ['c'], 'what it writes');
  assert.deepEqual(await run({ go: { trigger: 'x', writes: 'E.update' } }, ['j/a', 'j/b']), [], 'two steps of that kind: no guess');
  assert.deepEqual(await run({ go: { trigger: 'a', writes: 'E.update' } }, ['j/a']).then(list => list.map(item => item.entityId)), ['M']);
  assert.deepEqual(await affectedWritesOf({ routes: [{ route: 'm.p.go', kind: 'qry' }], shared: shared({ go: { trigger: 'a' } }, ['j/a']), portEntities: new Set(['M']), readJourney: async () => journey }), [], 'a query writes nothing');
  assert.deepEqual(await affectedWritesOf({ routes: [{ route: 'm.p.go', kind: 'cmd' }], shared: shared({ go: { trigger: 'a' } }, ['j/a']), portEntities: new Set(), readJourney: async () => journey }), [], 'no port dependency: nothing');
  assert.equal(journeySteps(journey).get('a')?.affects[0], 'M');
});
