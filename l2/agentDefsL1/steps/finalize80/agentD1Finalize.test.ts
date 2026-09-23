/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/agentD1Finalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  draftFile,
  inputFile,
  pipelineFile,
  plannerPipelineFile,
  reportFile,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { fingerprintProject, outsideOwnedWrites } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_INPUT_VERSION, type D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { contractSources, coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { coreUsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { parseFinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '../input20/fixtures/head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];

function mdmOntology(entity: ReturnType<typeof coreUsecaseRequest>['entities'][number]): Record<string, unknown> {
  const capabilities: Record<string, string> = {};
  for (const name of entity.capabilities || []) capabilities[name] = name;
  const fields: Record<string, unknown> = {};
  for (const field of entity.fields) fields[field.name] = { type: field.type, derived: field.derived };
  for (const path of entity.platformFields || []) {
    const parts = path.split('.');
    let cursor = fields;
    parts.forEach((key, index) => {
      const last = index === parts.length - 1;
      if (last) {
        cursor[key] = { type: 'string', owner: 'platform' };
        return;
      }
      const current = cursor[key];
      if (!current || typeof current !== 'object' || !('fields' in (current as object))) {
        cursor[key] = { type: 'object', fields: {} };
      }
      cursor = (cursor[key] as { fields: Record<string, unknown> }).fields;
    });
  }
  return {
    entityId: entity.entityId,
    kind: 'role',
    roleTag: `${entity.namespace}.${entity.entityId}`,
    capabilities,
    record: { fields },
  };
}

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

async function readyHost() {
  const host = installStudio(PROJECT);
  for (const rel of walk(FIXTURE, '')) {
    const file = rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
    const info = fileInfoFromDisplay(PROJECT, file);
    assert.ok(info, rel);
    seed(host, info, readFileSync(path.join(FIXTURE, rel), 'utf8'), 'frozen');
  }
  for (const pageId of PAGES) {
    const body = `export const ${pageId}Contract = { "moduleName": "${MODULE}", "pageId": "${pageId}" } as const;\n`;
    seed(host, fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${pageId}.defs.ts`)!, body, 'contract');
  }
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T12:00:00.000Z')));
  host.writes.length = 0;
  return host;
}

void test('a held input20 run is reported as not generated', async () => {
  const host = installStudio(PROJECT);
  const pipeline = createEntryPipeline(PROJECT, MODULE, new Date('2026-09-22T04:41:26.070Z'));
  pipeline.status = 'awaitingStep';
  pipeline.awaitingStep = 'input20';
  pipeline.steps.input20 = {
    status: 'failed',
    updatedAt: pipeline.updatedAt,
    artifactPaths: [`_${PROJECT}_/l1/${MODULE}/pipeline/agentDefsL1/input.json`],
    error: 'CONTRACT_ABSENT:6',
  };
  await writeJson(pipelineFile(PROJECT, MODULE), pipeline);
  const snapshot: D1InputSnapshot = {
    schemaVersion: D1_INPUT_VERSION,
    project: PROJECT,
    moduleName: MODULE,
    device: 'web',
    plannerRun: null,
    sources: [],
    selection: { pages: [], routes: [], usecases: [], ports: [], tables: [], entities: [], outbound: ['consultaConfirmada', 'faltaPacienteRegistrada', 'atendimentoRegistrado'] },
    files: [{
      id: 'usecase:registrarAtendimento',
      artifactType: 'usecase',
      defPath: `l1/${MODULE}/layer_2_application/usecases/registrarAtendimento.defs.ts`,
      action: 'create',
      identity: 'registrarAtendimento',
      ownerRefs: ['usecase:registrarAtendimento'],
      dependsOn: [],
    }],
    removed: [],
    problems: [
      ...Array.from({ length: 6 }, (_, index) => ({
        severity: 'error' as const,
        code: 'CONTRACT_ABSENT',
        path: `l2/${MODULE}/web/contracts/page${index}.defs.ts`,
        message: `L2 contract for page${index} is absent.`,
        ownerRef: `page${index}`,
      })),
      { severity: 'review', code: 'PAYLOAD_UNDECLARED', path: `l4/${MODULE}/ontology/Consulta.defs.ts`, message: 'Transition registrarAtendimento declares no payload.', ownerRef: 'registrarAtendimento' },
    ],
    consumersReleased: false,
    snapshotHash: 'sha256:held',
  };
  await writeJson(inputFile(PROJECT, MODULE), snapshot);
  const before = host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content;
  host.writes.length = 0;

  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const step = createD1AgentStep('finalize80', MODULE, PROJECT, 'run');
  step.stepId = 80;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 1);
  assert.equal(intents.some(intent => intent.type === 'add-step'), false);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /not executed/);
  assert.doesNotMatch(trace?.traceMsg || '', /success|generated/i);
  assert.equal(intents.some(intent => JSON.stringify(intent).includes('-repair-')), false);

  const saved = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  assert.equal(saved.status, 'awaitingStep');
  assert.equal(saved.awaitingStep, 'input20');
  assert.equal(saved.steps.input20?.error, 'CONTRACT_ABSENT:6');
  assert.equal(saved.steps.input20?.status, 'failed');
  assert.equal(saved.steps.finalize80, undefined);
  assert.equal(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content, before);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.ok(report);
  assert.equal(report?.blocking, 'CONTRACT_ABSENT:6');
  assert.equal(report?.defsStatus, 'notRun');
  assert.equal(report?.files.some(file => file.action === 'generated'), false);
  assert.equal(report?.phases.find(phase => phase.stepId === 'support70')?.executed, false);
  assert.equal(report?.executableBackend, false);
  assert.equal(report?.repairOpened, false);
});

void test('finalize80 reports the open gaps and does not run the earlier phases again', async () => {
  const host = await readyHost();
  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const input = createD1AgentStep('input20', MODULE, PROJECT, 'run');
  input.stepId = 20;
  await agent.beforePromptStep!(meta(), ctx, parent, input, 1);
  const domain = createD1AgentStep('domain30', MODULE, PROJECT, 'run');
  domain.stepId = 30;
  await agent.beforePromptStep!(meta(), ctx, parent, domain, 2);
  const persistence = createD1AgentStep('persistence40', MODULE, PROJECT, 'run');
  persistence.stepId = 40;
  await agent.beforePromptStep!(meta(), ctx, parent, persistence, 3);

  const usecaseRequest = coreUsecaseRequest();
  const contracts = contractSources(MODULE, coreControllerRequest().routes);
  for (const contract of contracts) {
    seed(host, fileInfoFromDisplay(PROJECT, contract.path)!, contract.source, 'contract');
  }
  const usecases = buildD1Usecases(usecaseRequest);
  await writeJson(draftFile(PROJECT, MODULE, 'usecases50'), usecases);
  for (const part of usecases.emit) {
    const rendered = renderDefinition(part.definition, part.pipeline);
    assert.equal('issues' in rendered, false);
    if ('issues' in rendered) continue;
    const file = artifactFile(PROJECT, part.pipeline[0]?.defPath || '');
    assert.ok(file);
    seed(host, file!, rendered.source, 'usecase');
  }
  const checkpoint = JSON.parse(host.files[fileKey(pipelineFile(PROJECT, MODULE))]?.content || '{}') as D1PipelineState;
  checkpoint.steps.usecases50 = { status: 'approved', updatedAt: '2026-09-22T12:00:00.000Z', artifactPaths: [] };
  host.files[fileKey(pipelineFile(PROJECT, MODULE))]!.content = JSON.stringify(checkpoint);
  const controllers = createD1AgentStep('controllers60', MODULE, PROJECT, 'run');
  controllers.stepId = 60;
  await agent.beforePromptStep!(meta(), ctx, parent, controllers, 4);
  const support = createD1AgentStep('support70', MODULE, PROJECT, 'run');
  support.stepId = 70;
  await agent.beforePromptStep!(meta(), ctx, parent, support, 5);

  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '') as D1InputSnapshot;
  for (const page of snapshot.selection.pages) {
    const body = page.routes.map(route => `"${route}": { "output": "Out" }`).join(', ');
    const text = `export const ${page.pageId}Contract = { "moduleName": "${MODULE}", "pageId": "${page.pageId}", "routes": { ${body} } } as const;\n`;
    const info = fileInfoFromDisplay(PROJECT, `l2/${MODULE}/web/contracts/${page.pageId}.defs.ts`);
    assert.ok(info);
    seed(host, info!, text, 'contract');
    const source = snapshot.sources.find(item => item.path === `l2/${MODULE}/web/contracts/${page.pageId}.defs.ts`);
    if (source) source.sha256 = await sha256Text(text);
  }
  for (const entity of usecaseRequest.entities) {
    if (entity.storageTarget !== 'mdm') continue;
    const text = `export const ${entity.entityId}Ontology = ${JSON.stringify(mdmOntology(entity))} as const;\n`;
    const info = fileInfoFromDisplay(PROJECT, `l4/${MODULE}/ontology/${entity.entityId}.defs.ts`);
    assert.ok(info);
    seed(host, info, text, 'ontology');
    const source = snapshot.sources.find(item => item.path === `l4/${MODULE}/ontology/${entity.entityId}.defs.ts`);
    if (source) source.sha256 = await sha256Text(text);
  }
  await writeJson(inputFile(PROJECT, MODULE), snapshot);

  const planner = plannerPipelineFile(PROJECT, MODULE);
  const plannerBefore = host.files[fileKey(planner)]?.content;
  const before = await fingerprintProject(PROJECT);
  host.writes.length = 0;

  const step = createD1AgentStep('finalize80', MODULE, PROJECT, 'run');
  step.stepId = 80;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, 6);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  assert.equal(intents.some(intent => JSON.stringify(intent).includes('-repair-')), false);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai' || (intent.type === 'add-step' && String((intent as { step?: { agentName?: string } }).step?.agentName || '').includes('agentCb'))), false);
  const trace = intents.find((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status');
  assert.match(trace?.traceMsg || '', /No model was called/);
  assert.doesNotMatch(trace?.traceMsg || '', /success|generated/i);

  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.ok(report);
  assert.equal(report?.executableBackend, false);
  assert.equal(report?.repairOpened, false);
  assert.equal(report?.llmCalls, 0);
  assert.equal(report?.enumerations.consumed.some(item => item.entityId === 'Consulta' && item.path === 'status'), true);
  assert.equal(report?.enumerations.notConsumed.some(item => item.entityId === 'Paciente' && item.path === 'details.identification.subtype'), true);
  assert.equal(report?.findings.filter(item => item.code === 'INTEGRATION_UNBOUND').length, 3);
  assert.equal(report?.findings.some(item => item.code === 'PAYLOAD_UNDECLARED' && item.ownerRef === 'registrarAtendimento'), true);
  assert.equal(report?.materializationPending.some(item => item.present), false);
  assert.equal(report?.outcome, 'complete', report?.blocking);

  const inventory = await readL1Inventory(PROJECT, MODULE);
  assert.equal(inventory.present, true);
  assert.deepEqual(inventory.usecases.map(item => item.usecaseId).sort(), report?.inventory.usecaseIds);
  assert.deepEqual(inventory.routes, report?.inventory.routes);
  assert.deepEqual(inventory.ports.map(item => item.portId).sort(), report?.inventory.portIds);
  assert.deepEqual(inventory.tables.map(item => item.tableId).sort(), report?.inventory.tableIds);
  assert.equal(report?.inventoryNote.includes('not certification'), true);

  const after = await fingerprintProject(PROJECT);
  assert.deepEqual(outsideOwnedWrites(before, after, MODULE), []);
  assert.equal(host.files[fileKey(planner)]?.content, plannerBefore);
  assert.equal(host.writes.some(key => key.includes('/l5/') || key.includes('/effort.') || key.endsWith('/backend.json')), false);

  const reportBytes = host.files[fileKey(reportFile(PROJECT, MODULE))]?.content;
  host.writes.length = 0;
  await agent.beforePromptStep!(meta(), ctx, parent, step, 7);
  assert.deepEqual(host.writes, []);
  assert.equal(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content, reportBytes);
});
