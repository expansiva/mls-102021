/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1TestResolver.ts" enhancement="_blank"/>

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import type { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { createD1AgentStep } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { parseFanoutWorkerArg } from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';
import { readText, writeText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { D1_GAP_NONE, type D1InputArtifacts, type D1RequestGapAnswer } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { RESOLVE_FANOUT } from '/_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.js';
import type { D1ResolveGap } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { resolveUnits } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveWork } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';

/**
 * Test only (d1_62), like `d1TestHost.ts`: it reads the resolve25 prompt from disk. The resolver that stands in for the model: it answers each resolve25 gap from the contract
 * `meta`, which no product source reads. A route without `meta` gets `none`.
 */
export type D1TestResolver = (route: D2ContractV2Route, gap: Pick<D1ResolveGap, 'path' | 'kind'>) => string;

export const metaResolver: D1TestResolver = (route, gap) => {
  const meta = route.meta;
  if (gap.kind === 'entity' && gap.path.startsWith('output.')) return meta.output[gap.path.slice('output.'.length)]?.entity ?? D1_GAP_NONE;
  if (gap.kind === 'flatPaging') {
    const names = gap.path.slice('output.'.length).split(', ');
    return Object.values(meta.lists).find(list => names.includes(list.page))?.key ?? D1_GAP_NONE;
  }
  if (gap.kind === 'pageParam') {
    const param = meta.params[gap.path.slice('input.'.length)];
    return param && 'pages' in param ? meta.lists[param.pages]?.key ?? D1_GAP_NONE : D1_GAP_NONE;
  }
  if (gap.kind === 'filterField') {
    const param = meta.params[gap.path.slice('input.'.length)];
    return param && 'filters' in param ? `${param.filters}:${param.field}` : D1_GAP_NONE;
  }
  return D1_GAP_NONE;
};

/**
 * The answers resolve25 would record with `resolver` in place of the model, per route, as `buildD1InputSnapshot`
 * takes them. For the tests that build the inventory without running the hooks.
 */
export function resolverAnswers(
  artifacts: Pick<D1InputArtifacts, 'contractTexts' | 'entities'>,
  resolver: D1TestResolver = metaResolver,
): Map<string, D1RequestGapAnswer[]> {
  const contracts = readContractV2(artifacts.contractTexts);
  const out = new Map<string, D1RequestGapAnswer[]>();
  for (const unit of resolveUnits(artifacts)) {
    const route = contracts.get(unit.pageId)?.routes.find(item => item.route === unit.route);
    out.set(unit.route, unit.gaps.map(gap => ({ path: gap.path, choice: route ? resolver(route, gap) : D1_GAP_NONE })));
  }
  return out;
}

type D1Agent = ReturnType<typeof createAgent>;

const PROMPT_FILE = { project: 102021, level: 2, folder: 'agentDefsL1/steps/resolve25', shortName: 'prompt', extension: '.md' };
const PROMPT_DISK = path.join(path.dirname(fileURLToPath(import.meta.url)), '../steps/resolve25/prompt.md');

function workerStep(stepId: number, prompt: string, planId = ''): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId,
    interaction: null,
    stepTitle: 'worker',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt,
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

/**
 * Runs resolve25 on the hooks: the main step, each route worker answered by `resolver` through the tool, and the
 * barrier. Returns every intent, main first. With no gap there is no worker and no barrier.
 */
export async function runResolve25(
  agent: D1Agent,
  agentMeta: IAgentMeta,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  project: number,
  moduleName: string,
  order: number,
  command: 'run' | 'resume' = 'run',
  resolver: D1TestResolver = metaResolver,
): Promise<mls.msg.AgentIntent[]> {
  // The worker reads its prompt from the studio, as in the browser; the test host starts without it.
  if (await readText(PROMPT_FILE) === null) await writeText(PROMPT_FILE, readFileSync(PROMPT_DISK, 'utf8'));
  const main = createD1AgentStep('resolve25', moduleName, project, command);
  main.stepId = order;
  const intents = await agent.beforePromptStep!(agentMeta, ctx, parent, main, order);
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout');
  if (!fanout) return intents;
  const args = fanout.executionMode?.type === 'parallel' ? fanout.executionMode.args : [];
  const artifacts = await readD1InputArtifacts(project, moduleName);
  const contracts = readContractV2(artifacts.contractTexts);
  let seq = order * 100;
  for (const arg of args) {
    const worker = workerStep(++seq, arg);
    const prepared = await agent.beforePromptStep!(agentMeta, ctx, parent, worker, seq);
    if (!prepared.some(intent => intent.type === 'prompt_ready')) {
      intents.push(...prepared);
      continue;
    }
    const unitId = parseFanoutWorkerArg(RESOLVE_FANOUT, arg)?.unitId;
    const unit = (await readResolveWork(project, moduleName))?.units.find(item => item.unitId === unitId);
    const route = unit ? contracts.get(unit.pageId)?.routes.find(item => item.route === unit.route) : undefined;
    const reply = { answers: Object.fromEntries((unit?.gaps || []).map(gap => [gap.gapId, route ? resolver(route, gap) : D1_GAP_NONE])) };
    worker.interaction = { input: [], cost: 0, trace: [], payload: [{ type: 'function', function: { name: 'resolveRouteGaps', arguments: JSON.stringify(reply) } }] } as unknown as mls.msg.AIAgentStep['interaction'];
    intents.push(...prepared, ...await agent.afterPromptStep!(agentMeta, ctx, parent, worker, seq));
  }
  const barrier = workerStep(++seq, JSON.stringify({ planId: 'resolve25-barrier', moduleName, project, command }), 'resolve25-barrier');
  intents.push(...await agent.beforePromptStep!(agentMeta, ctx, parent, barrier, seq));
  return intents;
}
