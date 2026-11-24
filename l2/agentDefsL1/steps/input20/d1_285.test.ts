/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/d1_285.test.ts" enhancement="_blank"/>

// d1_285 s3: the chain, on the real tree of `mls-102047@de566c90` (git archive of that commit), with the two contracts the L2 renders for the commands that carry their calls
// (`mls-102020/l2/agentDefsL2/helpers/fixtures/d2_216/`) in place of the ones of the commit. Production functions only (`assembleD1Input`, `externalCallsOf`,
// `connectionOperations`, `resolveUnits`); no model. The platform files (`_102034_/`) come from a stored fixture, the module from the commit.

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
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { assembleD1Input, fileInfoFromDisplay, readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { externalCallsOf } from '/_102021_/l2/agentDefsL1/steps/input20/externalCalls.js';
import { answersByRoute, resolveUnits } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';
import { connectionOperations } from '/_102021_/l2/agentDefsL1/steps/support70/io.js';

const PROJECT = 102047;
const COMMIT = 'de566c90';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_285_real';
const D2_216 = path.join(BASE, 'mls-102020/l2/agentDefsL2/helpers/fixtures/d2_216');

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/pool/l1/web/needs.json'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization'], { maxBuffer: 128 * 1024 * 1024 });
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

function seedInfo(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

interface Derived {
  usecases: Array<{ usecaseId: string; entity: string; operation: string; call?: string }>;
  uses: Map<string, string[]>;
  problems: Array<{ severity: string; code: string; ownerRef: string; message: string }>;
  files: Map<string, string>;
  consumers: Array<{ usecase: string; calls: string[] }>;
  callGaps: number;
  callUnits: string[];
  outbound: Array<{ call: string; consumer: string }>;
  entityKinds: Map<string, string>;
}

async function derive(withContracts: boolean): Promise<Derived> {
  extract();
  const host = installStudio(PROJECT);
  for (const abs of walk(ROOT)) seedInfo(host, fixtureLogicalRel(path.relative(ROOT, abs).split(path.sep).join('/')), readFileSync(abs, 'utf8'), 'commit');
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) seedInfo(host, rel, text, 'platform');
  if (withContracts) {
    for (const name of ['agent_tools', 'agent_behavior']) seedInfo(host, `l2/agents/web/contracts/${name}.defs.ts`, readFileSync(path.join(D2_216, `${name}.defs.ts`), 'utf8'), 'd2_216');
  }
  const receipt = await readResolveReceipt(PROJECT, 'agents');
  const snapshot = await assembleD1Input(PROJECT, 'agents', answersByRoute(receipt));
  const artifacts = await readD1InputArtifacts(PROJECT, 'agents');
  const kinds = new Map(Object.entries(artifacts.entities).map(([name, value]) => [name, String((value as { kind?: string }).kind ?? '')]));
  const integration = artifacts.integration as { connections?: unknown[] };
  const connections = integration.connections ?? [];
  const consumers = externalCallsOf({ journeys: artifacts.journeys, connections, usecases: snapshot.selection.usecases, entityKind: kinds, allEntities: true })
    .map(match => ({ usecase: match.usecaseId, calls: match.calls.map(call => `${call.connectionId}.${call.operationId}`) }));
  const outbound = connectionOperations(connections, snapshot.selection.usecases, {}, artifacts.journeys, [], {}, kinds).map(row => ({ call: row.id, consumer: row.consumer }));
  const units = resolveUnits(artifacts, snapshot.selection.callInputGaps ?? []);
  return {
    usecases: snapshot.selection.usecases,
    uses: new Map((snapshot.selection.requests ?? []).map(request => [request.route, request.uses ?? []])),
    problems: snapshot.problems,
    files: new Map(snapshot.files.map(file => [file.id, file.action])),
    consumers,
    callGaps: (snapshot.selection.callInputGaps ?? []).length,
    callUnits: units.map(unit => unit.route).filter(route => route.startsWith('usecase:')),
    outbound,
    entityKinds: kinds,
  };
}

/** What `usecasePlan` reads to give a usecase its `externalCall` (`usecaseIntent.ts`): the entity is stored outside the module. */
function storedOutside(entity: string): boolean {
  const text = readFileSync(path.join(ROOT, 'l1/agents/layer_3_domain/entities', `${entity.charAt(0).toLowerCase()}${entity.slice(1)}.defs.ts`), 'utf8');
  const definition = JSON.parse(text.slice(text.indexOf('{', text.indexOf('export const definition')), text.lastIndexOf(' as const;'))) as { data: { storageTarget?: string } };
  return definition.data.storageTarget === 'external';
}

void test('d1_285: the chain on mls-102047@de566c90 with the contracts that carry the calls of the commands', async () => {
  const before = await derive(false);
  const after = await derive(true);
  const usecase = (id: string) => after.usecases.find(item => item.usecaseId === id);

  // (1) no usecase of AgentTool has a call or consumes one; createAgentTool is the local one.
  assert.deepEqual(after.usecases.filter(item => item.entity === 'AgentTool' && item.call), [], 'a usecase of AgentTool with a call');
  assert.equal(usecase('getAgentTool'), undefined, 'getAgentTool (cm.readAgent on AgentTool) is gone');
  assert.deepEqual(after.consumers.find(item => item.usecase === 'createAgentTool')?.calls, []);
  assert.equal(after.outbound.some(row => row.consumer === 'createAgentTool'), false, 'createAgentTool is the consumer of no call in the outbound');
  assert.equal(before.outbound.some(row => row.consumer === 'createAgentTool'), false, 'and with the contracts of the commit, neither');

  // (2) suggestTools: the local create, the usecases of Agent (external) that already have the two calls, the output reads; enableUnchosenTool: no usecase with a call.
  const suggest = after.uses.get('agents.agent_tools.suggestTools') ?? [];
  const withCall = (ids: readonly string[]) => ids.filter(id => usecase(id)?.call).map(id => [id, usecase(id)?.entity, usecase(id)?.call]);
  assert.ok(suggest.includes('createAgentTool'), suggest.join());
  assert.deepEqual(withCall(suggest), [['getAgent', 'Agent', 'cm.readAgent'], ['runAiPrompt', 'Agent', 'cm.runAiPrompt']], `suggestTools: ${suggest.join()}`);
  assert.ok(suggest.includes('listTool'), 'the output reads of today stay');
  const enable = after.uses.get('agents.agent_tools.enableUnchosenTool') ?? [];
  assert.deepEqual(enable.filter(id => usecase(id)?.call), [], `enableUnchosenTool: ${enable.join()}`);
  assert.ok(enable.includes('createAgentTool'));

  // (3) each command of the behavior page uses only its own call.
  assert.deepEqual(withCall(after.uses.get('agents.agent_behavior.requestBehaviorChange') ?? []), [['updateAgentAgentBehavior', 'AgentBehavior', 'cm.updateAgent']]);
  assert.deepEqual(withCall(after.uses.get('agents.agent_behavior.undoBehaviorChange') ?? []), [['undoAgentChange', 'AgentBehavior', 'cm.undoAgentChange']]);

  // (4) resolve25 has no usecase unit and no call gap (a usecase with a call on an entity the module keeps is what opened them), and the rule of `loadUses`
  // (emit.ts: a route may use two usecases of one entity only when the entity is stored outside: its def has `externalCall`) holds for the four routes.
  assert.deepEqual(after.callUnits, []);
  assert.equal(after.callGaps, 0);
  for (const route of ['agents.agent_tools.suggestTools', 'agents.agent_tools.enableUnchosenTool', 'agents.agent_behavior.requestBehaviorChange', 'agents.agent_behavior.undoBehaviorChange']) {
    const seen = new Set<string>();
    for (const id of after.uses.get(route) ?? []) {
      const entity = usecase(id)?.entity ?? '';
      assert.ok(!seen.has(entity) || storedOutside(entity), `${route} uses two usecases of ${entity}, which the module keeps: loadUses would refuse it (USECASE_ENTITY)`);
      seen.add(entity);
    }
  }
  assert.equal(after.problems.filter(item => item.severity === 'error' && item.code === 'EXTERNAL_ROUTE_CALL_UNRESOLVED' && /agent_tools|agent_behavior/.test(item.ownerRef)).length, 0);

  // (5) the pages whose routes or usecases changed are recomposed or created, never preserved.
  for (const id of ['requestService:agent_tools', 'controller:agent_tools', 'requestService:agent_behavior', 'controller:agent_behavior']) {
    assert.ok(['recompose', 'create'].includes(after.files.get(id) ?? ''), `${id}: ${after.files.get(id)}`);
  }
  assert.ok(['recompose', 'create'].includes(after.files.get('usecase:runAiPrompt') ?? ''), 'runAiPrompt is a new usecase of the plan');
  const worse = [...after.files].filter(([id, action]) => action === 'conflict' || (before.files.get(id) === 'recompose' && action === 'preserve'));
  assert.deepEqual(worse, []);
  // The two errors that were already on the commit stay the same two (nothing new is refused).
  const errors = (from: Derived) => from.problems.filter(item => item.severity === 'error').map(item => `${item.code} ${item.ownerRef}`).sort();
  assert.deepEqual(errors(after), errors(before));
});
