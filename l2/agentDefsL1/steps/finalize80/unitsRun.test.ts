/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/unitsRun.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { loadD1Fixture, seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  inputFile,
  pipelineFile,
  reportFile,
  unitsFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, type StoredFile, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { D1_GAP_NONE } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseFinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { parseFanoutWorkerArg } from '/_102021_/l2/agentDefsL1/helpers/d1Fanout.js';
import { runResolve25, type D1TestResolver } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { RESOLVE_FANOUT } from '/_102021_/l2/agentDefsL1/steps/resolve25/agentD1Resolve.js';
import { readResolveWork } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';
import { parseWorkerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { readD1UsecaseWork, writeAttempt } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';

const PROJECT = 102047;
const MODULE = 'comandaRestaurante';
const FIXTURE = 'comandaRestaurante-c0f25ee';
const PAGE = 'fechamento';
const ROUTE = 'comandaRestaurante.fechamento.anotarComanda';
const USECASE = 'anotarComanda';
const ONTOLOGY = `l4/${MODULE}/ontology/Comanda.defs.ts`;
const CONTRACT = `l2/${MODULE}/web/contracts/${PAGE}.defs.ts`;
const WRITTEN = new Set([
  `l1/${MODULE}/layer_2_application/usecases/${USECASE}.defs.ts`,
  `l1/${MODULE}/layer_2_application/requests/${PAGE}.defs.ts`,
  `l1/${MODULE}/layer_1_external/adapters/http/controllers/${PAGE}.defs.ts`,
]);
const BEFORE_USECASES: D1StepId[] = ['input20', 'resolve25', 'domain30', 'persistence40'];
const AFTER_USECASES: D1StepId[] = ['controllers60', 'support70'];

const NEW_ROUTE = `
  /**
   * Finalidade: Lê o número da comanda aberta que o caixa já selecionou.
   * Entrada: id identifica a comanda. page é a janela, quando o contrato a pede.
   * Processamento: Lê a comanda autorizada e devolve o identificador e o número.
   * Saída: A comanda pedida, para o caixa confirmar o número antes do fechamento.
   */
  '${ROUTE}': {
    kind: 'cmd';
    writes: 'Comanda.anotarComanda';
    input: { id: string; version: number; page?: number };
    output: { comanda: ComandaNumero };
    meta: { output: { comanda: { entity: 'Comanda'; many: false } }; lists: {}; params: {} };
    rules: ['fechamentoLiberaMesa'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };`;

/**
 * d1_143 s4c. fechamento already has routes whose gaps stay unresolved (mesa). A new route on that page
 * and the usecase it creates are the only /units scope. The same route with no scope is a full /run.
 */
void test('/units writes the new usecase and the touched page and does not block on the old route gap', async () => {
  const host = await readyHost();
  const resolver = mixedResolver();
  const first = await runToFinalize(host, resolver);
  assert.equal(first.report.outcome, 'complete', JSON.stringify(first.report.findings.filter(item => item.severity === 'error')));
  const before = l1Bytes(host);

  addRoute(host);
  await writeJson(unitsFile(PROJECT, MODULE), { schemaVersion: 1, units: [`route:${ROUTE}`, `usecase:${USECASE}`] });
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-10-02T12:00:00.000Z')));

  const scoped = await runToFinalize(host, resolver);
  assert.equal(scoped.report.outcome, 'complete', JSON.stringify(scoped.report.findings.filter(item => item.severity === 'error')));
  assert.deepEqual(await askedRoutes(scoped.resolve), [ROUTE]);
  // usecases50 writes a derived plan without a worker. The new usecase is the file, not a model call.
  assert.deepEqual(scoped.dispatched, []);

  const snapshot = readSnapshot(host);
  for (const file of snapshot.files) {
    if (WRITTEN.has(file.defPath)) {
      assert.notEqual(file.action, 'preserve', file.defPath);
      continue;
    }
    assert.equal(file.action, 'preserve', `${file.defPath} ${file.action}`);
  }
  for (const [file, bytes] of before) {
    if (WRITTEN.has(file)) continue;
    assert.equal(stored(host, file).content, bytes, file);
  }
  for (const file of WRITTEN) assert.notEqual(stored(host, file).content, before.get(file) || '', file);
  assert.match(stored(host, `l1/${MODULE}/layer_2_application/requests/${PAGE}.defs.ts`).content, /mesa/);
});

void test('the same new route with /run still asks every open route', async () => {
  const host = await readyHost();
  addRoute(host);
  const ran = await runToFinalize(host, mixedResolver());
  assert.equal(ran.report.outcome, 'complete', JSON.stringify(ran.report.findings.filter(item => item.severity === 'error')));
  const asked = await askedRoutes(ran.resolve);
  assert.ok(asked.includes(ROUTE), asked.join(','));
  assert.ok(asked.some(route => route !== ROUTE), asked.join(','));
  assert.equal(host.files[fileKey(unitsFile(PROJECT, MODULE))], undefined);
});

function addRoute(host: TestHost): void {
  const file = stored(host, CONTRACT);
  assert.equal(file.content.includes(ROUTE), false);
  const next = file.content.replace(
    'export interface FechamentoContracts {',
    `export interface ComandaNumero {\n  id: string;\n  number: number;\n}\n\nexport interface FechamentoContracts {`,
  ).replace(/\n}\s*$/, `${NEW_ROUTE}\n}\n`);
  assert.notEqual(next, file.content);
  assert.match(next, new RegExp(ROUTE));
  file.content = next;
  const ontology = stored(host, ONTOLOGY);
  ontology.content = ontology.content.replace(
    '"transitionId": "fecharComanda",',
    `"transitionId": "anotarComanda",\n      "from": ["open"],\n      "to": "open",\n      "by": ["caixa"],\n      "description": "O caixa anota um número já conferido.",\n      "payload": [],\n      "ruleRefs": ["fechamentoLiberaMesa"]\n    },\n    {\n      "transitionId": "fecharComanda",`,
  );
  // backend.json changes with the ontology, so STALE_L4 does not fire. The port already implements transition.
  const row = {
    usecaseId: USECASE,
    entity: 'Comanda',
    operation: 'transition',
    transitionRef: USECASE,
    ports: ['Comanda'],
    status: 'toCreate',
    existing: '',
    reason: 'route anotarComanda',
    tableRefs: ['comanda'],
    noTable: 'ok',
  };
  for (const display of [`l4/${MODULE}/pool/l2/web/backend.json`, `l4/${MODULE}/pool/l2/web/effort.json`]) {
    const doc = JSON.parse(stored(host, display).content) as {
      usecases: unknown[];
      totals?: { usecases?: Record<string, number> };
    };
    doc.usecases.push(row);
    if (doc.totals?.usecases) doc.totals.usecases.toCreate = (doc.totals.usecases.toCreate || 0) + 1;
    stored(host, display).content = `${JSON.stringify(doc, null, 2)}\n`;
  }
}

/** Recorded choices for the fixture routes; the new route is answered from its meta. No model call. */
function mixedResolver(): D1TestResolver {
  const key = `l1/${MODULE}/pipeline/agentDefsL1/resolve25.json`;
  const text = loadD1Fixture(FIXTURE)[key];
  assert.ok(text, key);
  const receipt = JSON.parse(text) as { routes: Array<{ route: string; answers: Array<{ path: string; choice: string }> }> };
  const byRoute = new Map(receipt.routes.map(item => [item.route, new Map(item.answers.map(answer => [answer.path, answer.choice]))]));
  return (route, gap) => {
    const recorded = byRoute.get(route.route)?.get(gap.path);
    if (recorded) return recorded;
    if (route.route !== ROUTE) return D1_GAP_NONE;
    const meta = route.meta;
    if (gap.kind === 'entity' && gap.path.startsWith('output.')) return meta.output[gap.path.slice('output.'.length)]?.entity ?? D1_GAP_NONE;
    return D1_GAP_NONE;
  };
}

/** Routes whose worker was opened on this resolve25. A reused answer keeps its old call and is not a new worker. */
async function askedRoutes(intents: mls.msg.AgentIntent[]): Promise<string[]> {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'resolve25-fanout');
  const args = fanout?.executionMode?.type === 'parallel' ? fanout.executionMode.args : [];
  const work = await readResolveWork(PROJECT, MODULE);
  assert.ok(work);
  return args.flatMap(arg => {
    const parsed = parseFanoutWorkerArg(RESOLVE_FANOUT, arg);
    const route = parsed ? work.units.find(unit => unit.unitId === parsed.unitId)?.route : '';
    return route ? [route] : [];
  }).sort();
}

async function readyHost(): Promise<TestHost> {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, FIXTURE, PROJECT);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-10-02T12:00:00.000Z')));
  return host;
}

function l1Bytes(host: TestHost): Map<string, string> {
  const saved = new Map<string, string>();
  for (const file of Object.values(host.files)) {
    if (file.level !== 1) continue;
    if (file.folder !== MODULE && !file.folder.startsWith(`${MODULE}/`)) continue;
    if (file.folder === `${MODULE}/pipeline` || file.folder.startsWith(`${MODULE}/pipeline/`)) continue;
    saved.set(`l1/${file.folder}/${file.shortName}${file.extension}`, file.content);
  }
  return saved;
}

function stored(host: TestHost, display: string): StoredFile {
  const info = fileInfoFromDisplay(PROJECT, display);
  assert.ok(info, display);
  const file = host.files[fileKey(info)];
  assert.ok(file, display);
  return file;
}

async function runToFinalize(
  host: TestHost,
  resolver: D1TestResolver,
): Promise<{ report: NonNullable<ReturnType<typeof parseFinalizeReport>>; resolve: mls.msg.AgentIntent[]; dispatched: string[] }> {
  const agent = createAgent();
  const ctx = contextFor();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  let order = 1;
  let resolve: mls.msg.AgentIntent[] = [];
  for (const stepId of BEFORE_USECASES) {
    const ran = await runStep(agent, ctx, parent, stepId, order, resolver);
    if (stepId === 'resolve25') resolve = ran.intents;
    assertApproved(host, stepId, ran.trace);
    order += 1;
  }
  const usecases = await approveUsecases(agent, ctx, parent, order);
  assertApproved(host, 'usecases50', usecases.trace);
  order += 1;
  for (const stepId of AFTER_USECASES) {
    const ran = await runStep(agent, ctx, parent, stepId, order);
    assertApproved(host, stepId, ran.trace);
    order += 1;
  }
  await runStep(agent, ctx, parent, 'finalize80', order);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.ok(report);
  return { report, resolve, dispatched: usecases.dispatched };
}

async function approveUsecases(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  order: number,
): Promise<{ trace: string; dispatched: string[] }> {
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, createD1AgentStep('usecases50', MODULE, PROJECT, 'run'), order);
  const dispatched = dispatchedIds(intents);
  const barrier = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-barrier');
  if (!barrier) {
    return {
      dispatched,
      trace: intents
        .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
        .map(intent => intent.traceMsg || '')
        .join('\n'),
    };
  }
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  for (const usecaseId of dispatched) {
    const usecase = work.request.usecases.find(item => item.usecaseId === usecaseId);
    assert.ok(usecase, usecaseId);
    const plan = fixturePlan(work.request, usecase);
    await writeAttempt(PROJECT, MODULE, {
      usecaseId,
      status: 'parsed',
      trace: 'deterministic plan',
      unitAttempts: 1,
      reply: plan.steps,
    });
  }
  const done = await agent.beforePromptStep!(meta(), ctx, parent, barrier.step as mls.msg.AIAgentStep, order);
  return {
    dispatched,
    trace: done
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}

function dispatchedIds(intents: mls.msg.AgentIntent[]): string[] {
  const fanout = intents.find((intent): intent is mls.msg.AgentIntentAddStep =>
    intent.type === 'add-step' && intent.step.planning?.planId === 'usecases50-fanout');
  if (!fanout) return [];
  return (fanout.executionMode?.args || []).flatMap(arg => {
    const parsed = parseWorkerArg(arg);
    return parsed ? [parsed.usecaseId] : [];
  });
}

function assertApproved(host: TestHost, stepId: D1StepId, trace: string): void {
  const state = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(state.steps[stepId]?.status, 'approved', `${stepId} ${state.steps[stepId]?.error || ''} ${trace}`);
}

function readSnapshot(host: TestHost): D1InputSnapshot {
  return JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as D1InputSnapshot;
}

function contextFor(): mls.msg.ExecutionContext {
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
        longMemory: { project: String(PROJECT), moduleName: MODULE },
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
  stepId: D1StepId,
  order: number,
  resolver?: D1TestResolver,
): Promise<{ trace: string; intents: mls.msg.AgentIntent[] }> {
  const step = createD1AgentStep(stepId, MODULE, PROJECT, 'run');
  step.stepId = order;
  const intents = stepId === 'resolve25'
    ? await runResolve25(agent, meta(), ctx, parent, PROJECT, MODULE, order, 'run', resolver)
    : await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  return {
    intents,
    trace: intents
      .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
      .map(intent => intent.traceMsg || '')
      .join('\n'),
  };
}
