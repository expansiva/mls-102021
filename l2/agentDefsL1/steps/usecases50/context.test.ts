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
import { D1_MDM_CALLS } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import type { D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { workerArg } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { attemptFile, readD1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { closedFromRequest, parseWorkerReply, usecaseTool, workerStepShape } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = AGENDA_CLINICA_F35E28A;
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
): Promise<{ prompt: string; system: string; tool: mls.msg.LLMTool | null; status: string }> {
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
  return {
    prompt: ready?.humanPrompt || '',
    system: ready?.systemPrompt || '',
    tool: ready?.tools?.[0] || null,
    status,
  };
}

function section(prompt: string, route: string): string {
  const marker = `Route ${route}\n`;
  const start = prompt.indexOf(marker);
  assert.ok(start >= 0, route);
  const next = prompt.indexOf('\nRoute ', start + marker.length);
  return prompt.slice(start, next === -1 ? prompt.length : next);
}

/** Route text only. Pending rows of the operation sit after the last route. */
function routeBody(prompt: string, route: string): string {
  const body = section(prompt, route);
  const pending = body.indexOf('\nPending ');
  return pending === -1 ? body : body.slice(0, pending);
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
  const professional = routeBody(prompt, PROFESSIONAL_LIST);
  const reception = routeBody(prompt, RECEPTION_LIST);
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
  assert.doesNotMatch(prompt, /Rule attendanceNoteRequired/);
  assert.doesNotMatch(prompt, /Rule uniqueProfessionalSchedule/);
  assert.doesNotMatch(prompt, /Rule professionalOwnAppointment/);
  assert.doesNotMatch(prompt, /ACCESS_FILTER_UNBOUND/);
  assert.doesNotMatch(prompt, /uniqueProfessionalSchedule/);
  assert.match(prompt, /Pending attendanceNoteRequired\nGap: APPLICABILITY_UNDECLARED/);
  assert.match(prompt, /Pending professionalOwnAppointment\nGap: APPLICABILITY_UNDECLARED/);
  assert.doesNotMatch(professional, /Pending /);
  assert.doesNotMatch(reception, /Pending /);
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

void test('prepareWorker offers only this operation, on the first request and on repair', async () => {
  const opened = await openLive();
  const work = await readD1UsecaseWork(PROJECT, MODULE);
  assert.ok(work);
  const facade = D1_MDM_CALLS.join(', ');

  const update = await promptFor(opened, 'updateProfissional');
  const updateRepair = await promptFor(opened, 'updateProfissional', 'Transition was invented.');
  assert.ok(update.tool);
  assert.deepEqual(updateRepair.tool, update.tool);
  const updateClosed = closedFor(work.request, 'updateProfissional');
  assert.deepEqual(update.tool, usecaseTool(updateClosed));
  const updateShape = workerStepShape(updateClosed);
  assert.equal(shapeOf(update.prompt), updateShape);
  assert.equal(update.system.includes(updateShape), true);
  assert.equal(shapeOf(updateRepair.prompt), updateShape);
  assert.equal(updateRepair.prompt.includes('Transition was invented.'), true);
  assert.equal(kindsOf(update.tool).includes('transition'), false);
  assert.equal(kindsOf(update.tool).includes('port'), false);
  assert.equal(kindsOf(update.tool).includes('effect'), false);
  assert.equal(updateShape.includes('- transition:'), false);
  assert.equal(updateShape.includes('- port:'), false);
  assert.equal(updateShape.includes('- effect:'), false);
  assert.equal(update.prompt.includes(facade), false);
  assert.equal(update.system.includes(facade), false);
  assert.equal(updateShape.includes('call attachRole'), false);
  const updateSteps = fixturePlan(work.request, usecaseOf(work.request, 'updateProfissional')).steps;
  for (const step of updateSteps) assert.equal(fits(update.tool, step), true, JSON.stringify(step));
  assert.equal(parseWorkerReply({ steps: updateSteps }).problems.length, 0);
  const updateGate = buildD1Usecases(only(work.request, 'updateProfissional', updateSteps));
  assert.equal(updateGate.ok, true, updateGate.problems.map(item => item.message).join('; '));
  const invented = { kind: 'transition' as const, transitionId: 'agendaClinica.dados_profissional.cmdUpdateProfissional', payload: [] as string[] };
  assert.equal(fits(update.tool, invented), false);
  const inventedGate = buildD1Usecases(only(work.request, 'updateProfissional', [...updateSteps, invented]));
  assert.equal(inventedGate.problems.some(item => item.code === 'INVALID_TRANSITION'), true);

  const created = await promptFor(opened, 'createRecepcionista');
  const createdRepair = await promptFor(opened, 'createRecepcionista', 'Port was invented.');
  assert.ok(created.tool);
  assert.deepEqual(createdRepair.tool, created.tool);
  assert.equal(kindsOf(created.tool).includes('transition'), false);
  assert.equal(kindsOf(created.tool).includes('port'), false);
  assert.equal(kindsOf(created.tool).includes('effect'), false);
  assert.equal(shapeOf(created.prompt).includes('- effect:'), false);
  assert.equal(created.prompt.includes(facade), false);
  const createdSteps = fixturePlan(work.request, usecaseOf(work.request, 'createRecepcionista')).steps;
  for (const step of createdSteps) assert.equal(fits(created.tool, step), true, JSON.stringify(step));
  assert.equal(parseWorkerReply({ steps: createdSteps }).problems.length, 0);
  const createdGate = buildD1Usecases(only(work.request, 'createRecepcionista', createdSteps));
  assert.equal(createdGate.ok, true, createdGate.problems.map(item => item.message).join('; '));
  const portStep = { kind: 'port' as const, call: 'create', port: 'RecepcionistaRepository' };
  assert.equal(fits(created.tool, portStep), false);
  const portGate = buildD1Usecases(only(work.request, 'createRecepcionista', [...createdSteps, portStep]));
  assert.equal(portGate.problems.some(item => item.code === 'MDM_LOCAL_PORT'), true);

  const attended = await promptFor(opened, 'registrarAtendimento');
  const attendedRepair = await promptFor(opened, 'registrarAtendimento', 'Payload was empty.');
  assert.ok(attended.tool);
  assert.deepEqual(attendedRepair.tool, attended.tool);
  const attendedShape = shapeOf(attended.prompt);
  assert.equal(attended.system.includes(attendedShape), true);
  assert.equal(attended.prompt.includes(facade), false);
  assert.deepEqual(enumOf(attended.tool, 'transition', 'transitionId'), ['registrarAtendimento']);
  const payload = enumOf(attended.tool, 'transition', 'payload');
  assert.equal(payload.includes('details.attendanceNote'), true);
  assert.ok(payload.length > 1, payload.join(','));
  assert.equal(attendedShape.includes('details.attendanceNote'), true);
  assert.deepEqual(enumOf(attended.tool, 'port', 'call'), ['transition']);
  assert.deepEqual(enumOf(attended.tool, 'effect', 'eventId'), ['atendimentoRegistrado']);
  const nested = fixturePlan(work.request, usecaseOf(work.request, 'registrarAtendimento')).steps.map(step => (
    step.kind === 'transition' ? { ...step, payload: ['details.attendanceNote'] } : step
  ));
  for (const step of nested) assert.equal(fits(attended.tool, step), true, JSON.stringify(step));
  assert.equal(parseWorkerReply({ steps: nested }).problems.length, 0);
  const nestedGate = buildD1Usecases(only(work.request, 'registrarAtendimento', nested));
  assert.equal(nestedGate.problems.some(item => item.code === 'PAYLOAD_UNAUTHORIZED'), false, nestedGate.problems.map(item => item.message).join('; '));
  const foreignPayload = { kind: 'transition' as const, transitionId: 'registrarAtendimento', payload: ['notAField'] };
  assert.equal(fits(attended.tool, foreignPayload), false);
  const foreignGate = buildD1Usecases(only(work.request, 'registrarAtendimento', [foreignPayload]));
  assert.equal(foreignGate.problems.some(item => item.code === 'PAYLOAD_UNAUTHORIZED'), true);
  const wrongId = { kind: 'transition' as const, transitionId: 'confirmarConsulta', payload: [] as string[] };
  assert.equal(fits(attended.tool, wrongId), false);
  const wrongGate = buildD1Usecases(only(work.request, 'registrarAtendimento', [wrongId]));
  assert.equal(wrongGate.problems.some(item => item.code === 'INVALID_TRANSITION'), true);

  const confirm = await promptFor(opened, 'confirmarConsulta');
  assert.ok(confirm.tool);
  const confirmBranch = anyOf(confirm.tool).find(item => kindOf(item) === 'transition');
  assert.ok(confirmBranch);
  const confirmPayload = (confirmBranch.properties as Record<string, { const?: unknown }>).payload;
  assert.deepEqual(confirmPayload.const, []);
  assert.equal(fits(confirm.tool, { kind: 'transition', transitionId: 'confirmarConsulta', payload: [] }), true);
  assert.equal(fits(confirm.tool, { kind: 'transition', transitionId: 'confirmarConsulta', payload: ['id'] }), false);
  assert.equal(fits(confirm.tool, { kind: 'transition', transitionId: 'confirmarConsulta', payload: ['details.attendanceNote'] }), false);
  assert.deepEqual(enumOf(confirm.tool, 'context', 'source'), ['ctx']);
  assert.equal(fits(confirm.tool, { kind: 'context', source: 'input' }), false);
  assert.equal(kindsOf(confirm.tool).includes('effect'), true);

  const listed = await promptFor(opened, 'listConsulta');
  assert.ok(listed.tool);
  assert.equal(kindsOf(listed.tool).includes('transition'), false);
  assert.equal(kindsOf(listed.tool).includes('effect'), false);
  assert.deepEqual(enumOf(listed.tool, 'port', 'call'), ['list']);
  assert.equal(shapeOf(listed.prompt).includes('- transition:'), false);
  assert.equal(shapeOf(listed.prompt).includes('- effect:'), false);
  assert.equal(listed.prompt.includes(facade), false);

  const people = await promptFor(opened, 'listProfissional');
  assert.ok(people.tool);
  const pairs = mdmPairs(people.tool);
  assert.ok(pairs.length > 1, String(pairs.length));
  const swapped = pairs.find(pair => pairs.some(other => other.call !== pair.call && other.capability !== pair.capability));
  assert.ok(swapped, pairs.map(pair => `${pair.call}/${pair.capability}`).join('; '));
  const other = pairs.find(pair => pair.call !== swapped.call && pair.capability !== swapped.capability);
  assert.ok(other);
  const crossed = { kind: 'mdm' as const, namespace: swapped.namespace, call: swapped.call, entity: swapped.entity, capability: other.capability };
  assert.equal(fits(people.tool, crossed), false);
  assert.equal(fits(people.tool, { kind: 'mdm', namespace: swapped.namespace, call: swapped.call, entity: swapped.entity, capability: swapped.capability }), true);
  const crossedGate = buildD1Usecases(only(work.request, 'listProfissional', [{ kind: 'context', source: 'ctx' }, crossed]));
  assert.equal(crossedGate.problems.some(item => item.code === 'MDM_CALL_INCOMPATIBLE'), true);
});

function closedFor(request: Parameters<typeof closedFromRequest>[0], usecaseId: string) {
  const usecase = usecaseOf(request, usecaseId);
  const packet = request.contexts?.find(item => item.usecaseId === usecaseId);
  return closedFromRequest(request, usecase, packet);
}

function usecaseOf(request: Parameters<typeof closedFromRequest>[0], usecaseId: string) {
  const usecase = request.usecases.find(item => item.usecaseId === usecaseId);
  assert.ok(usecase, usecaseId);
  return usecase;
}

function only(request: Parameters<typeof closedFromRequest>[0], usecaseId: string, steps: D1WorkerStep[]) {
  return {
    ...request,
    usecases: request.usecases.filter(item => item.usecaseId === usecaseId),
    routes: request.routes.filter(item => item.usecaseRef === usecaseId),
    plans: [{ usecaseId, steps }],
    llmCalls: 1,
  };
}

function shapeOf(prompt: string): string {
  const marker = 'Each step is one kind.';
  const at = prompt.indexOf(marker);
  assert.ok(at >= 0);
  const rest = prompt.slice(at);
  const feedback = rest.indexOf('\n\nThe previous reply was refused:');
  return feedback === -1 ? rest : rest.slice(0, feedback);
}

function kindsOf(tool: mls.msg.LLMTool): string[] {
  const kinds: string[] = [];
  for (const branch of anyOf(tool)) {
    const kind = kindOf(branch);
    if (kind && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds;
}

function enumOf(tool: mls.msg.LLMTool, kind: string, key: string): string[] {
  const branch = anyOf(tool).find(item => kindOf(item) === kind);
  assert.ok(branch, kind);
  const props = branch.properties as Record<string, { enum?: unknown[]; items?: { enum?: unknown[] } }>;
  const schema = props[key];
  assert.ok(schema, key);
  if (Array.isArray(schema.enum)) return schema.enum.map(String);
  if (schema.items && Array.isArray(schema.items.enum)) return schema.items.enum.map(String);
  return [];
}

function mdmPairs(tool: mls.msg.LLMTool): Array<{ call: string; capability: string; namespace: string; entity: string }> {
  return anyOf(tool).filter(branch => kindOf(branch) === 'mdm').map(branch => ({
    call: oneEnum(branch, 'call'),
    capability: oneEnum(branch, 'capability'),
    namespace: oneEnum(branch, 'namespace'),
    entity: oneEnum(branch, 'entity'),
  }));
}

function oneEnum(branch: Record<string, unknown>, key: string): string {
  const props = branch.properties as Record<string, { enum?: unknown[] }>;
  const values = props[key]?.enum;
  assert.ok(values && values.length === 1, key);
  return String(values[0]);
}

function anyOf(tool: mls.msg.LLMTool): Array<Record<string, unknown>> {
  const parameters = tool.function.parameters;
  assert.ok(parameters);
  const steps = (parameters.properties as { steps?: { items?: { anyOf?: unknown } } }).steps;
  const found = steps?.items?.anyOf;
  assert.ok(Array.isArray(found));
  return found.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function kindOf(branch: Record<string, unknown>): string {
  const props = branch.properties as { kind?: { const?: unknown } } | undefined;
  return typeof props?.kind?.const === 'string' ? props.kind.const : '';
}

function fits(tool: mls.msg.LLMTool, step: D1WorkerStep | Record<string, unknown>): boolean {
  const record = step as unknown as Record<string, unknown>;
  return anyOf(tool).some(branch => {
    const props = branch.properties;
    const required = branch.required;
    if (!props || typeof props !== 'object' || Array.isArray(props) || !Array.isArray(required)) return false;
    const properties = props as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.some(key => !Object.hasOwn(properties, key))) return false;
    if (required.some(key => typeof key !== 'string' || !Object.hasOwn(record, key))) return false;
    return required.every(key => typeof key === 'string' && valueFits(properties[key], record[key]));
  });
}

function valueFits(schema: unknown, value: unknown): boolean {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
  const node = schema as { const?: unknown; enum?: unknown[]; type?: unknown; items?: unknown };
  if (Object.hasOwn(node, 'const')) return JSON.stringify(value) === JSON.stringify(node.const);
  if (Array.isArray(node.enum)) return node.enum.some(item => JSON.stringify(item) === JSON.stringify(value));
  if (node.type === 'array') {
    if (!Array.isArray(value)) return false;
    return node.items ? value.every(item => valueFits(node.items, item)) : true;
  }
  if (node.type === 'string') return typeof value === 'string' && value.length > 0;
  return false;
}
