/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/d1ProducedTip.test.ts" enhancement="_blank"/>

/**
 * t1_09 r2: /structure and implement over the defs the D1 tip writes in memory.
 * The compiler is the same sandbox as emittedTypecheck. agendaClinica stays
 * skipped until its D1 reaches finalize80. synthetic-v2 reaches it (t1_09 r3).
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  pipelineFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { persistenceRunners } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { runMaterialize, type MaterializeRunHost, type UnitOutcome } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { parseDefinitionSource, readDefinition, receiptPathFor, type MaterializationReceipt } from '/_102021_/l2/helpers/l1Defs/definition.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const PROJECT = 102047;
/** Same closed lists as UNIT_OK and UNIT_GAP in agentMaterializeL1.ts (m1_47). */
const UNIT_OK = new Set(['PROMOTED', 'REUSE', 'VERIFIED']);
const UNIT_GAP = new Set(['MECHANISM_UNBOUND', 'NO_CONSUMER']);
const TIPS = [
  { id: 'controleEstoque-39a5166', moduleName: 'controleEstoque', reachesFinalize: true },
  { id: 'agendaClinica-cab144b', moduleName: 'agendaClinica', reachesFinalize: false },
  { id: 'synthetic-v2', moduleName: 'ledgerDesk', reachesFinalize: true },
] as const;
const BEFORE_USECASES: D1StepId[] = ['input20', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70', 'finalize80'];

for (const tip of TIPS) {
  const reason = tip.reachesFinalize ? false : 'D1 does not reach finalize80 yet (t1_09)';
  void test(`M1 structure and implement compile the defs D1 wrote (${tip.id})`, { skip: reason }, async () => {
    const host = installStudio(PROJECT);
    seedD1Fixture(host, tip.id, PROJECT);
    await writeJson(pipelineFile(PROJECT, tip.moduleName), createEntryPipeline(PROJECT, tip.moduleName, new Date('2026-10-02T12:00:00.000Z')));
    await runD1(host, tip.moduleName);
    const texts = studioTexts(host);
    const units = unitsOf(texts, tip.moduleName);
    assert.ok(units.length > 0, tip.id);
    const store = world(texts);
    const materialize = memoryHost(store, tip.moduleName);
    const structure = await runMaterialize(request(tip.moduleName, units, 'structure'), materialize);
    assertUnits(structure.units, 'structure');
    const implement = await runMaterialize(request(tip.moduleName, units, 'implement'), materialize);
    assertUnits(implement.units, 'implement');
    const outbound = implement.units.find(unit => unit.defPath.endsWith('/integration/outbound.defs.ts'));
    assert.ok(outbound, implement.units.map(unit => unit.defPath).join('\n'));
    assert.equal(UNIT_GAP.has(outbound.code), true, `${outbound.code} ${outbound.detail}`);
    const diagnostics = compileProduced(store.map, tip.moduleName);
    assert.equal(diagnostics, '', diagnostics);
  });
}

function assertUnits(units: readonly UnitOutcome[], stage: string): void {
  const outside = units.filter(unit => !UNIT_OK.has(unit.code) && !UNIT_GAP.has(unit.code));
  assert.deepEqual(outside.map(unit => `${unit.code} ${unit.defPath} ${unit.detail}`), [], stage);
}

function request(moduleName: string, units: readonly PlanUnitInput[], stage: 'structure' | 'implement') {
  return {
    project: PROJECT,
    moduleName,
    stage,
    flow: '',
    resume: false,
    units,
    profileMode: 'development',
    profileDeclared: true,
    budget: { timeoutMs: 20000 },
  };
}

function memoryHost(store: ReturnType<typeof world>, moduleName: string): MaterializeRunHost {
  return {
    io: { async read(ref: string) { return store.map.get(ref) ?? readProject(ref); } },
    state: store.state,
    runners: { ...structureRunners, ...behaviorRunners, ...persistenceRunners },
    now: () => '2026-10-02T12:00:00.000Z',
    catalogRef: `_${PROJECT}_/l1/${moduleName}/materialization/agentMaterializeL1/scenarioCatalog.ts`,
    commit: 't1_09',
    monitorError: null,
  };
}

function world(seed: Map<string, string>) {
  const map = new Map(seed);
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      const text = path ? map.get(path) : undefined;
      if (!text) return null;
      return JSON.parse(text) as MaterializationReceipt;
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      if (path) map.set(path, JSON.stringify(receipt));
    },
    async readOwned(path: string): Promise<Uint8Array | null> {
      const text = map.get(path);
      return text === undefined ? null : new TextEncoder().encode(text);
    },
    async writeOwned(path: string, body: Uint8Array): Promise<void> {
      map.set(path, new TextDecoder().decode(body));
    },
    async removeOwned(): Promise<{ removed: string[]; kept: string[] }> {
      return { removed: [], kept: [] };
    },
    async readRevision(): Promise<string | null> {
      return null;
    },
  };
  return { map, state };
}

function readProject(ref: string): string | null {
  const match = /^_(\d+)_\/(.+)$/.exec(ref);
  if (!match || match[1] === String(PROJECT)) return null;
  try {
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    return null;
  }
}

function studioTexts(host: TestHost): Map<string, string> {
  const texts = new Map<string, string>();
  for (const file of Object.values(host.files)) {
    if (!file.content) continue;
    texts.set(`_${file.project}_/l${file.level}/${file.folder}/${file.shortName}${file.extension}`, file.content);
  }
  return texts;
}

function unitsOf(texts: Map<string, string>, moduleName: string): PlanUnitInput[] {
  const units: PlanUnitInput[] = [];
  for (const [defPath, text] of texts) {
    if (!defPath.endsWith('.defs.ts') || !defPath.includes(`/l1/${moduleName}/`)) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.moduleName !== moduleName) continue;
    units.push({ defPath, definition });
  }
  return units;
}

/** Official backend config, same sandbox shape as emittedTypecheck. */
function compileProduced(files: ReadonlyMap<string, string>, moduleName: string): string {
  const sandbox = mkdtempSync(join(tmpdir(), 't1-09-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    writeFileSync(join(sandbox, 'tsconfig.backend.json'), readFileSync(join(ROOT, 'tsconfig.backend.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (!/^mls-\d+$/.test(entry) || entry === `mls-${PROJECT}`) continue;
      symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    mkdirSync(join(sandbox, `mls-${PROJECT}`));
    const production: string[] = [];
    for (const [qualified, source] of files) {
      if (!qualified.startsWith(`_${PROJECT}_/`)) continue;
      if (!qualified.endsWith('.ts')) continue;
      if (qualified.endsWith('.defs.ts')) continue;
      if (!qualified.includes(`/l1/${moduleName}/`) && !qualified.includes(`/l2/${moduleName}/`)) continue;
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      if (!relativePath.endsWith('.test.ts')) production.push(relativePath);
    }
    // Contracts the emitted code imports. They stay .defs.ts and are not units.
    for (const [qualified, source] of files) {
      if (!qualified.startsWith(`_${PROJECT}_/l2/${moduleName}/`) || !qualified.endsWith('.defs.ts')) continue;
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
    }
    const configPath = join(sandbox, '.tsconfig.t1-09.json');
    writeFileSync(configPath, `${JSON.stringify({
      extends: './tsconfig.backend.json',
      compilerOptions: { noEmit: true },
      include: production,
      exclude: ['**/*.test.ts'],
    }, null, 2)}\n`);
    const tsc = join(sandbox, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', configPath, '--pretty', 'false'], { cwd: sandbox, encoding: 'utf8' });
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('error TS')).join('\n');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

async function runD1(host: TestHost, moduleName: string): Promise<void> {
  const agent = createAgent();
  const ctx = contextFor(moduleName);
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  let order = 1;
  for (const stepId of BEFORE_USECASES) {
    await runStep(agent, ctx, parent, moduleName, stepId, order);
    order += 1;
    assert.equal(stepStatus(host, moduleName, stepId), 'approved', stepId);
  }
  await approveUsecases(agent, ctx, parent, moduleName, order);
  order += 1;
  assert.equal(stepStatus(host, moduleName, 'usecases50'), 'approved');
  for (const stepId of AFTER_USECASES) {
    await runStep(agent, ctx, parent, moduleName, stepId, order);
    order += 1;
    assert.equal(stepStatus(host, moduleName, stepId), 'approved', `${stepId} ${stepError(host, moduleName, stepId)}`);
  }
}

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  order: number,
): Promise<void> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', moduleName, PROJECT, 'run'), order);
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  assert.ok(barrier, 'usecases50 did not open a barrier');
  const work = await readD1UsecaseWork(PROJECT, moduleName);
  assert.ok(work);
  for (const usecase of work.request.usecases) {
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, moduleName, {
      usecaseId: usecase.usecaseId,
      status: 'parsed',
      trace: 'deterministic plan',
      unitAttempts: 1,
      reply: plan.steps,
    });
  }
  await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, order);
}

function stepStatus(host: TestHost, moduleName: string, stepId: D1StepId): string {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  return state.steps[stepId]?.status || '';
}

function stepError(host: TestHost, moduleName: string, stepId: D1StepId): string {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, moduleName))]?.content || '{}') as D1PipelineState;
  return state.steps[stepId]?.error || '';
}

function contextFor(moduleName: string): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    nextSteps: [],
    stepTitle: 'defs',
    status: 'waiting_human_input',
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: {
      PK: 'task-1',
      iaCompressed: {
        nextSteps: [root],
        longMemory: { project: String(PROJECT), moduleName },
      },
    },
  } as unknown as mls.msg.ExecutionContext;
}

function meta(): IAgentMeta {
  return { agentName: 'agentDefsL1', agentProject: 102021, agentFolder: 'agentDefsL1', agentDescription: 'test', visibility: 'public' };
}

async function runStep(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  moduleName: string,
  stepId: D1StepId,
  order: number,
): Promise<void> {
  const step = createD1AgentStep(stepId, moduleName, PROJECT, 'run');
  step.stepId = order;
  await agent.beforePromptStep!(meta(), ctx, parent, step, order);
}
