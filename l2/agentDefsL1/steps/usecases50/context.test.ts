/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { createD1AgentStep, createEntryPipeline, pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { workerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { attemptFile, readD1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import type { D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '../../../../../mls-102047');
const MDM = path.resolve(HERE, '../../../../../mls-102034/l4/ontology/mdm.defs.ts');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const RULE = 'A conclusão de uma consulta como atendida exige uma anotação do profissional sobre o atendimento.';
const RULE_CHANGED = 'A conclusão de uma consulta como atendida exige uma nota clínica alterada.';
const PROFESSIONAL_LIST = 'agendaClinica.consultas_profissional.qryListConsulta';
const RECEPTION_LIST = 'agendaClinica.consultas_recepcionista.qryListConsulta';

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function context(): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'defs',
    status: 'waiting_human_input',
    nextSteps: [],
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

function seedTree(host: ReturnType<typeof installStudio>, dir: string, prefix: string, edit?: (logical: string, text: string) => string): void {
  for (const rel of walk(dir, '')) {
    const logical = `${prefix}/${rel}`;
    const text = readFileSync(path.join(dir, rel), 'utf8');
    const info = fileInfoFromDisplay(PROJECT, logical);
    if (!info) continue;
    seed(host, info, edit ? edit(logical, text) : text, 'frozen');
  }
}

async function openLive(edit?: (logical: string, text: string) => string) {
  const host = installStudio(PROJECT);
  seedTree(host, path.join(APP, 'l4', MODULE), `l4/${MODULE}`, edit);
  seedTree(host, path.join(APP, 'l2', MODULE, 'web', 'contracts'), `l2/${MODULE}/web/contracts`, edit);
  const catalog = fileInfoFromDisplay(102034, 'l4/ontology/mdm.defs.ts');
  assert.ok(catalog);
  seed(host, catalog, readFileSync(MDM, 'utf8'), 'catalog');
  seed(host, fileInfoFromDisplay(PROJECT, `l1/${MODULE}/pipeline/pipeline.json`)!, `${JSON.stringify({
    schemaVersion: '2026-09-20-p1-pipeline-v1',
    flowId: 'agentPlannerL1',
    moduleName: MODULE,
    status: 'complete',
    steps: { plan20: { status: 'approved', artifactPaths: [`l4/${MODULE}/pool/l2/web/backend.json`] } },
    thread: 'agendaClinica-d114',
    round: 1,
  })}\n`, 'planner');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/steps/usecases50', shortName: 'prompt', extension: '.md' }, readFileSync(path.join(HERE, 'prompt.md'), 'utf8'), 'prompt');
  seed(host, { project: 102021, level: 2, folder: 'agentDefsL1/skills', shortName: 'usecase', extension: '.md' }, readFileSync(path.join(HERE, '../../skills/usecase.md'), 'utf8'), 'skill');
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-23T12:00:00.000Z')));
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  parent.nextSteps = [];
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  const inputIntents = await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);
  const step = createD1AgentStep('usecases50', MODULE, PROJECT, 'run');
  step.stepId = 50;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 4);
  const status = [...inputIntents, ...intents]
    .filter((item): item is mls.msg.AgentIntentUpdateStatus => item.type === 'update-status')
    .map(item => item.traceMsg)
    .join(' ');
  const fanout = intents.find((item): item is mls.msg.AgentIntentAddStep => item.type === 'add-step' && item.executionMode?.type === 'parallel');
  assert.ok(fanout, status);
  return { host, agent, ctx, parent, args: fanout.executionMode?.args || [] };
}

function argFor(args: readonly string[], usecaseId: string, feedback = ''): string {
  if (!feedback) {
    const found = args.find(item => item.includes(`"usecaseId":"${usecaseId}"`));
    assert.ok(found, usecaseId);
    return found;
  }
  return workerArg({
    planId: 'usecases50-repair-1',
    moduleName: MODULE,
    project: PROJECT,
    usecaseId,
    attempt: 1,
    unitAttempts: 1,
    globalAttempts: 1,
    feedback,
  });
}

async function promptFor(
  opened: Awaited<ReturnType<typeof openLive>>,
  usecaseId: string,
  feedback = '',
): Promise<{ prompt: string; status: string }> {
  const worker: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 51,
    interaction: null,
    stepTitle: usecaseId,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentDefsL1',
    prompt: argFor(opened.args, usecaseId, feedback),
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const prepared = await opened.agent.beforePromptStep!(meta(), opened.ctx, opened.parent, worker, 5);
  const ready = prepared.find((item): item is mls.msg.AgentIntentPromptReady => item.type === 'prompt_ready');
  const status = prepared
    .filter((item): item is mls.msg.AgentIntentUpdateStatus => item.type === 'update-status')
    .map(item => item.traceMsg)
    .join(' ');
  return { prompt: ready?.humanPrompt || '', status };
}

function section(prompt: string, route: string): string {
  const marker = `Route ${route}\n`;
  const start = prompt.indexOf(marker);
  assert.ok(start >= 0, route);
  const next = prompt.indexOf('\nRoute ', start + marker.length);
  return prompt.slice(start, next === -1 ? prompt.length : next);
}

void test('the real hook gives registrarAtendimento the note, the rule and the contract', async () => {
  const opened = await openLive();
  const { prompt } = await promptFor(opened, 'registrarAtendimento');
  assert.match(prompt, /This operation is the lifecycle transition registrarAtendimento/);
  assert.match(prompt, /Payload: details\.attendanceNote/);
  assert.match(prompt, new RegExp(RULE.replace(/[.]/g, '\\.')));
  assert.match(prompt, /Owner: module/);
  assert.match(prompt, /Source: l4\/agendaClinica\/rules\.defs\.ts/);
  assert.match(prompt, /Input RegistrarAtendimentoInput/);
  assert.match(prompt, /details\.attendanceNote\?: string/);
  assert.match(prompt, /transition\(Consulta, transitionId\): Consulta/);
  assert.match(prompt, /Effect atendimentoRegistrado/);
  assert.match(prompt, /Publica que uma consulta foi atendida/);
  assert.doesNotMatch(prompt, /uniqueProfessionalSchedule/);

  const evidence = JSON.parse(opened.host.files[fileKey(attemptFile(PROJECT, MODULE, 'registrarAtendimento'))]?.content || '{}') as {
    request?: { text?: string; bytes?: number; sha256?: string; snapshotHash?: string; sourceHashes?: Array<{ path: string; sha256: string }> };
  };
  assert.equal(evidence.request?.text, prompt);
  assert.equal(evidence.request?.bytes, new TextEncoder().encode(prompt).length);
  assert.equal(evidence.request?.sha256, await sha256Text(prompt));
  assert.match(evidence.request?.snapshotHash || '', /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    evidence.request?.sourceHashes?.some(item => item.path === 'l4/agendaClinica/rules.defs.ts' && /^sha256:[a-f0-9]{64}$/.test(item.sha256)),
    true,
  );

  const repair = await promptFor(opened, 'registrarAtendimento', 'Payload was empty.');
  assert.match(repair.prompt, /Payload: details\.attendanceNote/);
  assert.match(repair.prompt, new RegExp(RULE.replace(/[.]/g, '\\.')));
  assert.match(repair.prompt, /Payload was empty/);

  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const port = work.request.ports.find(item => item.entityId === 'Consulta');
  assert.ok(port);
  const accepted: D1WorkerStep[] = [
    { kind: 'context', source: 'ctx' },
    { kind: 'rule', ruleId: 'attendanceNoteRequired' },
    { kind: 'transition', transitionId: 'registrarAtendimento', payload: ['details.attendanceNote'] },
    { kind: 'port', call: 'transition', port: port.portId },
  ];
  const allowed = buildD1Usecases({ ...work.request, plans: [{ usecaseId: 'registrarAtendimento', steps: accepted }], llmCalls: 1 });
  assert.equal(allowed.problems.some(item => item.path === 'registrarAtendimento' && item.code === 'PAYLOAD_UNAUTHORIZED'), false);
  const refused = buildD1Usecases({
    ...work.request,
    plans: [{ usecaseId: 'registrarAtendimento', steps: [{ kind: 'transition', transitionId: 'registrarAtendimento', payload: ['notAField'] }] }],
    llmCalls: 1,
  });
  assert.equal(refused.problems.some(item => item.code === 'PAYLOAD_UNAUTHORIZED'), true);
});

void test('updateProfissional receives platform fields and is not a lifecycle', async () => {
  const opened = await openLive();
  const { prompt } = await promptFor(opened, 'updateProfissional');
  assert.match(prompt, /This operation is not a lifecycle transition/);
  assert.doesNotMatch(prompt, /This operation is the lifecycle transition/);
  assert.match(prompt, /Capability edit\.platformFields/);
  assert.match(prompt, /Atualiza os dados de plataforma usados pelo profissional/);
  const fields = prompt.slice(prompt.indexOf('Effective platform fields:'), prompt.indexOf('\nRoute '));
  assert.match(fields, /details\.identification\.name/);
  assert.match(fields, /details\.person\.occupation/);
  assert.doesNotMatch(fields, /details\.identification\.status/);
  assert.doesNotMatch(fields, /details\.identification\.subtype/);
  assert.doesNotMatch(prompt, /details\.attendanceNote/);
  assert.match(prompt, /rule-foreign-namespace-refused/);
  assert.match(prompt, /A caller carrying a moduleId may write the platform keys/);
});

void test('listConsulta keeps each route contract and access apart', async () => {
  const opened = await openLive();
  const { prompt } = await promptFor(opened, 'listConsulta');
  const professional = section(prompt, PROFESSIONAL_LIST);
  const reception = section(prompt, RECEPTION_LIST);
  assert.match(professional, /attendanceNote/);
  assert.match(professional, /Access grant profissionalAgendaDiaria/);
  assert.match(professional, /Disclosure fullRecord/);
  assert.match(professional, /Anchor: Paciente/);
  assert.doesNotMatch(professional, /Consulta\.patientId/);
  assert.doesNotMatch(professional, /recepcionistaAgendaConsultas/);
  assert.match(reception, /Access grant recepcionistaAgendaConsultas/);
  assert.match(reception, /- Consulta\.patientId/);
  assert.doesNotMatch(reception, /attendanceNote/);
  assert.doesNotMatch(reception, /profissionalAgendaDiaria/);
  assert.doesNotMatch(reception, /Disclosure fullRecord/);
  const grants = prompt.match(/Access grant recepcionistaAgendaConsultas/g) || [];
  assert.ok(grants.length >= 2, String(grants.length));
  assert.doesNotMatch(prompt, /attendanceNoteRequired/);
  assert.doesNotMatch(prompt, /RegistrarAtendimentoInput/);

  const other = await promptFor(opened, 'createPaciente');
  assert.doesNotMatch(other.prompt, /attendanceNoteRequired/);
  assert.doesNotMatch(other.prompt, /RegistrarAtendimentoInput/);
  assert.doesNotMatch(other.prompt, /details\.attendanceNote/);
  assert.doesNotMatch(other.prompt, /profissionalAgendaDiaria/);
});

void test('a changed rule and contract change the request, and a later edit is refused', async () => {
  const changed = await openLive((logical, text) => {
    if (logical === 'l4/agendaClinica/rules.defs.ts') return text.replace(RULE, RULE_CHANGED);
    if (logical === 'l2/agendaClinica/web/contracts/consultas_profissional.defs.ts') return text.replaceAll('"attendanceNote"', '"clinicalNote"');
    return text;
  });
  const { prompt } = await promptFor(changed, 'registrarAtendimento');
  assert.match(prompt, new RegExp(RULE_CHANGED.replace(/[.]/g, '\\.')));
  assert.doesNotMatch(prompt, new RegExp(RULE.replace(/[.]/g, '\\.')));
  assert.match(prompt, /clinicalNote/);
  assert.doesNotMatch(prompt, /attendanceNote\?:/);

  const opened = await openLive();
  const info = fileInfoFromDisplay(PROJECT, 'l2/agendaClinica/web/contracts/consultas_profissional.defs.ts');
  assert.ok(info);
  const stored = opened.host.files[fileKey(info)];
  stored.content = stored.content.replaceAll('"attendanceNote"', '"clinicalNote"');
  const blocked = await promptFor(opened, 'registrarAtendimento');
  assert.equal(blocked.prompt, '');
  assert.match(blocked.status, /SOURCE_CHANGED|changed after the approved snapshot/);
  assert.match(blocked.status, /consultas_profissional\.defs\.ts/);
  const kept = await promptFor(opened, 'createPaciente');
  assert.match(kept.prompt, /Usecase createPaciente is already chosen/);
  assert.doesNotMatch(kept.prompt, /clinicalNote/);
  assert.doesNotMatch(kept.prompt, /attendanceNoteRequired/);
});
