/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/proofC1.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  generatedAllowsSkip,
  M1_RECEIPT_SCHEMA,
  parseDefinitionSource,
  readDefinition,
  receiptPathFor,
  referenceIssues,
  semanticHash,
  type M1Definition,
  type MaterializationReceipt,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { definitionIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  createD1AgentStep,
  createEntryPipeline,
  inputFile,
  pipelineFile,
  reportFile,
  type D1PipelineState,
  type D1StepId,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { unitIsIntact } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { fileKey, installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { parseRendered } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { fileInfoFromDisplay, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { parseFinalizeReport, type D1FinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';
import { CALL_ABSENT, CALL_HISTORY_ABSENT, accountCalls, readCallLog } from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';
import { fixturePlan } from '/_102021_/l2/agentDefsL1/steps/usecases50/fixtures/cases.js';
import { commitD1Usecases, loadD1UsecaseWork } from '/_102021_/l2/agentDefsL1/steps/usecases50/io.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import { readUsecaseFidelity } from '/_102021_/l2/agentDefsL1/steps/usecases50/fidelity.js';
import type { D1UsecaseBuild, D1UsecaseRequest } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO = path.resolve(HERE, '../../../../..');
const CLINIC = AGENDA_CLINICA_F35E28A;
const PROJECT = 102047;
const MODULE = 'agendaClinica';
const PIPELINE_EXPORT = 'export const pipeline';
/** Design forecast recorded in the agent readme. A count, not a pass limit. */
const HISTORICAL_DEF_COUNT = 32;

interface SavedDef {
  key: string;
  logical: string;
  qualified: string;
  source: string;
  definition: M1Definition;
}

void test('controlled agendaClinica replay writes v2 defs without touching the bench', async () => {
  const clinicBefore = clinicFingerprint();
  const host = installStudio(PROJECT);
  const seeded = seedClinic(host);
  await writeJson(pipelineFile(PROJECT, MODULE), createEntryPipeline(PROJECT, MODULE, new Date('2026-09-25T12:00:00.000Z')));

  const agent = createAgent();
  const ctx = context();
  const parent = ctx.task!.iaCompressed!.nextSteps![0] as mls.msg.AIAgentStep;
  const inputTrace = await runStep(agent, ctx, parent, 'input20', 20);
  const snapshot = JSON.parse(host.files[fileKey(inputFile(PROJECT, MODULE))]?.content || '{}') as {
    consumersReleased?: boolean;
    snapshotHash?: string;
    sources?: Array<{ path: string; sha256: string; bytes: number; state: string }>;
    problems?: Array<{ severity: string; code: string; path: string; message: string }>;
  };
  const inputErrors = (snapshot.problems || []).filter(problem => problem.severity === 'error');
  assert.equal(snapshot.consumersReleased, true, `${inputTrace}\n${inputErrors.map(problem => `${problem.code} ${problem.path} ${problem.message}`).join('\n')}`);
  assert.match(inputTrace, /recorded the inventory/);

  const domainTrace = await runStep(agent, ctx, parent, 'domain30', 30);
  assert.match(domainTrace, /No model was called/, domainTrace);
  assert.doesNotMatch(domainTrace, /wrote nothing|refused/i, domainTrace);
  const persistenceTrace = await runStep(agent, ctx, parent, 'persistence40', 40);
  assert.match(persistenceTrace, /No model was called/, persistenceTrace);
  assert.doesNotMatch(persistenceTrace, /wrote nothing|refused/i, persistenceTrace);

  const loaded = await loadD1UsecaseWork(PROJECT, MODULE);
  assert.equal('work' in loaded, true, 'refusal' in loaded ? loaded.refusal : '');
  if (!('work' in loaded)) return;
  const request = loaded.work.request;
  const omitted = plansFor(request, true);
  const prescribed = plansFor(request, false);
  assert.equal(omitted.ok, true, problemsOf(omitted));
  assert.equal(prescribed.ok, true, problemsOf(prescribed));
  assert.equal(omitted.normalizations.some(item => item.code === 'RULE_RESTORED'), true);
  assert.deepEqual(await hashesOf(omitted), await hashesOf(prescribed));

  const committed = await commitD1Usecases(PROJECT, prescribed);
  assert.deepEqual(committed.issues, []);
  approve(host, 'usecases50');
  const controllersTrace = await runStep(agent, ctx, parent, 'controllers60', 60);
  assert.match(controllersTrace, /No model was called/, controllersTrace);
  assert.doesNotMatch(controllersTrace, /wrote nothing|refused/i, controllersTrace);
  const supportTrace = await runStep(agent, ctx, parent, 'support70', 70);
  assert.match(supportTrace, /No model was called/, supportTrace);
  assert.doesNotMatch(supportTrace, /wrote nothing|refused/i, supportTrace);
  const finalizeTrace = await runStep(agent, ctx, parent, 'finalize80', 80);
  assert.match(finalizeTrace, /No model was called/, finalizeTrace);
  const report = parseFinalizeReport(host.files[fileKey(reportFile(PROJECT, MODULE))]?.content || '');
  assert.ok(report, finalizeTrace);
  if (!report) return;
  assert.equal(report.outcome, 'complete', report.blocking);
  assert.equal(report.executableBackend, false);
  assert.equal(report.calls.repliesDelivered, null);
  assert.notEqual(report.calls.repliesDelivered, 0);
  assert.equal(report.calls.repliesUnknown, CALL_ABSENT);
  assert.equal(report.calls.finalizeCalledModel, false);

  const defs = readDefs(host);
  assert.ok(defs.length > 0);
  const tableDef = defs.find(def => def.definition.artifactType === 'table');
  assert.equal(tableDef?.definition.artifactId, 'consulta');
  assert.equal(tableDef?.definition.data.tableId, 'consulta');
  for (const def of defs) {
    assert.equal(def.source.includes(PIPELINE_EXPORT), false, def.logical);
    assert.equal(parseRendered(def.source)?.definition != null, true, def.logical);
    assert.ok(['pending', 'generated', 'blocked', 'failed'].includes(def.definition.status), def.logical);
    assert.deepEqual(def.definition.dependencies, [...new Set(def.definition.dependencies)].sort(), def.logical);
    for (const dep of def.definition.dependencies) {
      assert.match(dep, /^_\d+_\/l\d+\//, `${def.logical} ${dep}`);
      assert.equal(textOf(host, dep) != null, true, `${def.logical} missing ${dep}`);
    }
  }
  const blocked = defs.filter(def => def.definition.status === 'blocked');
  assert.equal(blocked.every(def => def.definition.artifactType === 'integrationOutbound'), true, blocked.map(def => def.definition.artifactId).join(','));
  assert.equal(defs.filter(def => def.definition.artifactType !== 'integrationOutbound').every(def => def.definition.status === 'pending'), true);

  const listed = dataOf(defs, 'listConsulta');
  const note = ruleRow(listed, 'attendanceNoteRequired');
  const own = ruleRow(listed, 'professionalOwnAppointment');
  assert.ok(note && own);
  assert.equal(note.gap, 'APPLICABILITY_UNDECLARED');
  assert.equal(note.enforcement, 'pending');
  assert.equal(note.consumer, 'operation:list');
  assert.deepEqual(shape(note), shape(own));
  assert.equal(String(note.consumer).startsWith('route:'), false);
  const created = dataOf(defs, 'createConsulta');
  const storage = rows(created, 'rulePlan').find(row => row.ruleId === '' && String(row.origin).endsWith('#uniqueKeys'));
  assert.equal(storage?.enforcement, 'local');
  assert.equal(storage?.consumer, 'operation:create');
  const unbound = ruleRow(created, 'uniqueProfessionalSchedule');
  assert.equal(unbound?.gap, 'RULE_UNBOUND');
  assert.equal(unbound?.enforcement, 'pending');
  const closed = dataOf(defs, 'registrarAtendimento');
  const enforced = rows(closed, 'rulePlan').filter(row => row.enforcement === 'local' && row.ruleId).map(row => String(row.ruleId)).sort();
  assert.deepEqual(enforced, ['attendanceNoteRequired', 'consultationTransitionFlow', 'professionalOwnAppointment']);

  const scope = dataOf(defs, 'accessScope');
  const grants = rows(scope, 'grants');
  assert.ok(grants.length > 0);
  for (const grant of grants) {
    assert.equal(typeof grant.scopeMode, 'string', String(grant.grantId));
    assert.ok(grant.scopeMode, String(grant.grantId));
    assert.equal(grant.session, 'verified', String(grant.grantId));
    assert.ok(Array.isArray(grant.path), String(grant.grantId));
    assert.equal(typeof grant.pending, 'string', String(grant.grantId));
  }
  const anchors = grants.filter(grant => grant.pending === 'ACCESS_ANCHOR');
  assert.ok(anchors.length > 0);
  assert.ok(grants.some(grant => grant.pending !== 'ACCESS_ANCHOR'));

  const mdmDefs = defs.filter(def => def.definition.artifactType === 'usecase' && isRecord(def.definition.data.mdm));
  assert.ok(mdmDefs.length > 0);
  for (const def of mdmDefs) {
    const calls = rows(def.definition.data.mdm as Record<string, unknown>, 'calls');
    assert.ok(calls.length > 0, def.definition.artifactId);
    for (const call of calls) {
      for (const arg of rows(call, 'arguments')) {
        const origin = isRecord(arg.origin) ? arg.origin : null;
        assert.equal(typeof origin?.kind, 'string', `${def.definition.artifactId} ${String(call.method)} ${String(arg.name)}`);
      }
    }
  }

  const inventory = await readL1Inventory(PROJECT, MODULE);
  assert.equal(inventory.present, true);
  assert.deepEqual(inventory.usecases.map(item => item.usecaseId).sort(), [...report.inventory.usecaseIds].sort());
  assert.deepEqual(inventory.routes, report.inventory.routes);
  assert.deepEqual(inventory.ports.map(item => item.portId).sort(), [...report.inventory.portIds].sort());
  assert.deepEqual(inventory.tables.map(item => item.tableId).sort(), [...report.inventory.tableIds].sort());

  const knownFiles = [...new Set(Object.values(host.files).map(qualifiedOf))].sort();
  const index = {
    files: knownFiles,
    artifacts: defs.map(def => ({
      artifactType: def.definition.artifactType,
      artifactId: def.definition.artifactId,
      defPath: def.qualified,
    })),
  };
  for (const def of defs) {
    const issues = referenceIssues(def.definition, index);
    assert.deepEqual(issues, [], `${def.logical}\n${issues.join('\n')}`);
  }

  const sample = defs.find(def => def.definition.artifactId === 'listConsulta');
  assert.ok(sample);
  if (!sample) return;
  const mutated = structuredClone(sample.definition);
  const plan = rows(mutated.data, 'rulePlan');
  assert.ok(plan[0]);
  plan[0].enforcement = plan[0].enforcement === 'local' ? 'pending' : 'local';
  const sameHash = await semanticHash(sample.definition);
  const changedHash = await semanticHash(mutated);
  assert.notEqual(changedHash, sameHash);
  assert.equal(await semanticHash({ ...sample.definition, status: 'generated' }), sameHash);
  const depHashes = await dependencyHashes(host, sample.definition);
  const receipt = receiptFor(sample, sameHash, depHashes);
  assert.equal(await generatedAllowsSkip({ ...sample.definition, status: 'generated' }, receipt, depHashes), true);
  assert.equal(await generatedAllowsSkip(mutated, receipt, depHashes), false);

  const strippedScope = structuredClone(defs.find(def => def.definition.artifactId === 'accessScope')!.definition);
  delete (rows(strippedScope.data, 'grants')[0] || {}).scopeMode;
  assert.equal(definitionIssues(strippedScope).some(issue => issue.includes('scopeMode')), true);
  const mdmSample = mdmDefs[0];
  const strippedMdm = structuredClone(mdmSample.definition);
  const firstArg = rows(rows(strippedMdm.data.mdm as Record<string, unknown>, 'calls')[0] || {}, 'arguments')[0];
  assert.ok(firstArg);
  delete firstArg.origin;
  const renderedMdm = renderSource(strippedMdm, mdmSample.qualified);
  const fidelity = readUsecaseFidelity(renderedMdm, request.files);
  assert.equal(fidelity.problems.some(problem => problem.code === 'MDM_CALL_MISSING'), true, fidelity.problems.map(problem => problem.message).join('\n'));
  const missingDep = structuredClone(sample.definition);
  missingDep.dependencies = [...missingDep.dependencies, `_${PROJECT}_/l4/${MODULE}/ontology/missing.defs.ts`];
  assert.equal(referenceIssues(missingDep, index).some(issue => issue.startsWith('Missing dependency')), true);

  const original = sample.source;
  const generated = original.replace('"status": "pending"', '"status": "generated"');
  const target = host.files[sample.key]!;
  target.content = generated;
  target.updatedAt = 'm1-status';
  const receiptInfo = fileInfoFromDisplay(PROJECT, receiptPathFor(sample.logical));
  assert.ok(receiptInfo);
  seed(host, receiptInfo!, `${JSON.stringify(receipt, null, 2)}\n`, 'm1-receipt');
  assert.equal(await unitIsIntact(PROJECT, MODULE, 'usecases50', 'usecases50', snapshot.snapshotHash || ''), true);
  const beforeResume = defSnapshot(host);
  const resumeTrace = await runStep(agent, ctx, parent, 'usecases50', 51, 'resume');
  assert.match(resumeTrace, /kept the defs/);
  assert.match(resumeTrace, /No model was called/);
  assert.equal(host.files[sample.key]?.content, generated);
  assert.equal(host.files[sample.key]?.updatedAt, 'm1-status');
  assert.deepEqual(defSnapshot(host), beforeResume);

  target.content = original;
  target.updatedAt = 'manual-pending';
  const pendingSnap = defSnapshot(host);
  const pendingTrace = await runStep(agent, ctx, parent, 'usecases50', 52, 'resume');
  assert.match(pendingTrace, /No model was called/);
  assert.equal(host.files[sample.key]?.content, original);
  assert.equal(host.files[sample.key]?.content.includes('"status": "pending"'), true);
  assert.equal(host.files[sample.key]?.content.includes('"status": "generated"'), false);
  assert.deepEqual(defSnapshot(host), pendingSnap);

  target.content = original.replace('"usecaseId": "listConsulta"', '"usecaseId": "listOther"');
  assert.equal(await unitIsIntact(PROJECT, MODULE, 'usecases50', 'usecases50', snapshot.snapshotHash || ''), false);
  target.content = original;

  const calls = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(calls.repliesDelivered, null);
  assert.notEqual(calls.repliesDelivered, 0);
  assert.equal(calls.invocationReplies, 0);
  assert.equal(calls.repliesUnknown, CALL_HISTORY_ABSENT);
  assert.deepEqual(clinicFingerprint(), clinicBefore);

  const gaps = gapList(defs, report);
  const units = [];
  for (const def of defs) {
    units.push({
      logical: def.logical,
      qualified: def.qualified,
      artifactType: def.definition.artifactType,
      artifactId: def.definition.artifactId,
      status: def.definition.status,
      dependencies: def.definition.dependencies,
      semanticHash: await semanticHash(def.definition),
    });
  }
  exportProof(process.env.D1_C1_EXPORT || '', {
    units,
    seeded,
    sources: snapshot.sources || [],
    defs,
    report,
    inventory,
    gaps,
    comparison: {
      omittedRulesHash: await hashesOf(omitted),
      prescribedRulesHash: await hashesOf(prescribed),
      semanticEditHash: changedHash,
      equivalent: true,
    },
    resume: {
      keptGenerated: true,
      keptManualPending: true,
      repliesDelivered: calls.repliesDelivered,
      repliesUnknown: calls.repliesUnknown,
      invocationReplies: calls.invocationReplies,
    },
    tests: [
      'proofC1.test.ts controlled agendaClinica replay writes v2 defs without touching the bench',
      'd1Receipt.test.ts a v2 status edit stays intact and a behavior edit does not',
    ],
  });
});

function plansFor(request: D1UsecaseRequest, omitRules: boolean): D1UsecaseBuild {
  return buildD1Usecases({
    ...request,
    llmCalls: 0,
    plans: request.usecases.map(usecase => {
      const plan = fixturePlan(request, usecase);
      return omitRules ? { ...plan, steps: plan.steps.filter(step => step.kind !== 'rule') } : plan;
    }),
  });
}

async function hashesOf(build: D1UsecaseBuild): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const part of build.emit) out[part.definition.artifactId] = await semanticHash(part.definition);
  return out;
}

function problemsOf(build: D1UsecaseBuild): string {
  return build.problems.filter(problem => problem.severity === 'error').map(problem => `${problem.code} ${problem.path} ${problem.message}`).join('\n');
}

function seedClinic(host: TestHost): string[] {
  const seeded: string[] = [];
  const add = (abs: string, logical: string, project = PROJECT) => {
    if (!existsSync(abs) || !statSync(abs).isFile()) return;
    const info = fileInfoFromDisplay(project, logical);
    if (!info || host.files[fileKey(info)]) return;
    seed(host, info, readFileSync(abs, 'utf8'), 'source');
    seeded.push(`_${project}_/${logical}`);
  };
  const walk = (dir: string, logicalRoot: string) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const logical = `${logicalRoot}/${name}`;
      if (statSync(abs).isDirectory()) walk(abs, logical);
      else add(abs, logical);
    }
  };
  walk(path.join(CLINIC, 'l4/agendaClinica'), 'l4/agendaClinica');
  walk(path.join(CLINIC, 'l2/agendaClinica/web/contracts'), 'l2/agendaClinica/web/contracts');
  add(path.join(CLINIC, 'l1/agendaClinica/pipeline/pipeline.json'), 'l1/agendaClinica/pipeline/pipeline.json');
  for (let pass = 0; pass < 3; pass += 1) {
    const text = Object.values(host.files).map(file => file.content).join('\n');
    for (const match of text.matchAll(/_(\d+)_\/(l\d+\/[A-Za-z0-9_./-]+\.defs\.ts)/g)) {
      const project = Number(match[1]);
      if (project === PROJECT) continue;
      add(path.join(MONOREPO, `mls-${project}`, match[2]), match[2], project);
    }
  }
  return seeded.sort();
}

function clinicFingerprint(): string[] {
  const roots = [
    path.join(CLINIC, 'l1/agendaClinica'),
    path.join(CLINIC, 'l2/agendaClinica'),
    path.join(CLINIC, 'l4/agendaClinica'),
  ];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = statSync(abs);
      if (stat.isDirectory()) walk(abs);
      else out.push(`${abs.slice(CLINIC.length + 1)}:${stat.size}:${Math.trunc(stat.mtimeMs)}`);
    }
  };
  for (const root of roots) walk(root);
  return out.sort();
}

function readDefs(host: TestHost): SavedDef[] {
  const defs: SavedDef[] = [];
  for (const [key, file] of Object.entries(host.files)) {
    if (file.project !== PROJECT || file.level !== 1 || file.extension !== '.defs.ts') continue;
    if (!file.folder.startsWith(`${MODULE}/`) || file.folder.includes('/pipeline/')) continue;
    const logical = `l1/${file.folder}/${file.shortName}${file.extension}`;
    const parsed = parseRendered(file.content);
    assert.ok(parsed, logical);
    if (!parsed) continue;
    const read = readDefinition(parsed.definition);
    assert.equal('issues' in read, false, 'issues' in read ? `${logical} ${read.issues.join('; ')}` : logical);
    if ('issues' in read) continue;
    defs.push({ key, logical, qualified: `_${PROJECT}_/${logical}`, source: file.content, definition: read });
  }
  return defs.sort((left, right) => left.logical.localeCompare(right.logical));
}

function dataOf(defs: readonly SavedDef[], artifactId: string): Record<string, unknown> {
  const found = defs.find(def => def.definition.artifactId === artifactId);
  assert.ok(found, artifactId);
  return found?.definition.data || {};
}

function rows(value: unknown, key?: string): Array<Record<string, unknown>> {
  const list = key === undefined ? value : (isRecord(value) ? value[key] : undefined);
  if (!Array.isArray(list)) return [];
  return list.filter(isRecord);
}

function ruleRow(data: Record<string, unknown>, ruleId: string): Record<string, unknown> | undefined {
  return rows(data, 'rulePlan').find(row => row.ruleId === ruleId);
}

function shape(row: Record<string, unknown>): Record<string, unknown> {
  const { ruleId: _ruleId, ...rest } = row;
  return rest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function textOf(host: TestHost, qualified: string): string | null {
  const match = /^_(\d+)_\/(l\d+\/.+)$/.exec(qualified);
  if (!match) return null;
  const info = fileInfoFromDisplay(Number(match[1]), match[2]);
  if (!info) return null;
  return host.files[fileKey(info)]?.content ?? null;
}

function qualifiedOf(file: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }): string {
  return `_${file.project}_/l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
}

async function dependencyHashes(host: TestHost, definition: M1Definition): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const dep of definition.dependencies) {
    const text = textOf(host, dep);
    if (text != null) hashes[dep] = await sha256Text(text);
  }
  return hashes;
}

function receiptFor(def: SavedDef, hash: string, dependencyHashes: Record<string, string>): MaterializationReceipt {
  return {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: 'm1',
    candidateId: '',
    defPath: def.qualified,
    artifactType: def.definition.artifactType,
    artifactId: def.definition.artifactId,
    recipeVersion: 'm1',
    semanticHash: hash,
    dependencyHashes,
    sourceHashes: {},
    outputHashes: { [def.qualified.replace(/\.defs\.ts$/, '.ts')]: 'sha256:output' },
    stage: 'verify',
    verifications: [{ id: 'compile', kind: 'compile', passed: true, detail: 'ok' }],
    failures: [],
    attempts: 1,
    reason: '',
  };
}

function renderSource(definition: M1Definition, defPath: string): string {
  const parsed = parseDefinitionSource(`export const definition = ${JSON.stringify({ ...definition }, null, 2)} as const;\n`);
  assert.equal('definition' in parsed, true);
  const header = `/// <mls fileReference="${defPath}" enhancement="_blank"/>\n\n`;
  return `${header}export const definition = ${JSON.stringify(definition, null, 2)} as const;\n\nexport default definition;\n`;
}

function gapList(defs: readonly SavedDef[], report: D1FinalizeReport): Array<Record<string, string>> {
  const gaps: Array<Record<string, string>> = [];
  for (const def of defs) {
    if (def.definition.artifactType !== 'usecase') continue;
    for (const row of rows(def.definition.data, 'rulePlan')) {
      if (!row.gap || row.gap === 'none') continue;
      gaps.push({
        unit: def.definition.artifactId,
        code: String(row.gap),
        consumer: String(row.consumer),
        ruleId: String(row.ruleId),
        owner: ownerOf(String(row.gap)),
      });
    }
  }
  const scope = defs.find(def => def.definition.artifactId === 'accessScope');
  for (const grant of rows(scope?.definition.data || {}, 'grants')) {
    if (grant.pending !== 'ACCESS_ANCHOR') continue;
    gaps.push({
      unit: 'accessScope',
      code: 'ACCESS_ANCHOR',
      consumer: String(grant.grantId),
      ruleId: '',
      owner: 'L4 ns5_69 personEntity',
    });
  }
  for (const def of defs.filter(item => item.definition.status === 'blocked')) {
    gaps.push({
      unit: def.definition.artifactId,
      code: 'blocked',
      consumer: def.logical,
      ruleId: '',
      owner: 'runtime mechanism (integration stays unbound)',
    });
  }
  for (const finding of report.findings) {
    if (finding.severity !== 'error' && finding.code !== 'INTEGRATION_UNBOUND') continue;
    gaps.push({ unit: finding.ownerRef || finding.path, code: finding.code, consumer: finding.path, ruleId: '', owner: ownerOf(finding.code) });
  }
  gaps.push({ unit: 'module', code: 'EXECUTABLE_BACKEND', consumer: '', ruleId: '', owner: 'x1_01 materializes; this replay does not' });
  return gaps;
}

function ownerOf(code: string): string {
  if (code === 'ACCESS_ANCHOR') return 'L4 ns5_69 personEntity';
  if (code === 'APPLICABILITY_UNDECLARED') return 'planner toPlanner_aplicabilidade_leitura_x_transicao';
  if (code === 'MDM_CONTRACT_UNREAD') return 'L2 contract';
  if (code === 'INTEGRATION_UNBOUND' || code === 'MECHANISM_INCOMPATIBLE') return 'runtime mechanism';
  if (code === 'RULE_UNBOUND' || code === 'DELEGATION_UNPROVEN') return 'source does not bind the rule; the unit stays pending';
  return 'recorded gap';
}

function defSnapshot(host: TestHost): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of readDefs(host)) out[def.logical] = `${host.files[def.key]?.updatedAt}\n${def.source}`;
  return out;
}

function approve(host: TestHost, stepId: D1StepId): void {
  const key = fileKey(pipelineFile(PROJECT, MODULE));
  const state = JSON.parse(host.files[key]?.content || '{}') as D1PipelineState;
  state.steps[stepId] = { status: 'approved', updatedAt: '2026-09-25T12:00:00.000Z', artifactPaths: [] };
  host.files[key]!.content = JSON.stringify(state);
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

async function runStep(
  agent: ReturnType<typeof createAgent>,
  ctx: mls.msg.ExecutionContext,
  parent: mls.msg.AIAgentStep,
  stepId: D1StepId,
  order: number,
  command: 'run' | 'resume' = 'run',
): Promise<string> {
  const step = createD1AgentStep(stepId, MODULE, PROJECT, command);
  step.stepId = order;
  const intents = await agent.beforePromptStep!(meta(), ctx, parent, step, order);
  const traces = intents
    .filter((intent): intent is mls.msg.AgentIntentUpdateStatus => intent.type === 'update-status')
    .map(intent => intent.traceMsg || '');
  return traces.join('\n') || JSON.stringify(intents.map(intent => intent.type));
}

function exportProof(dir: string, payload: {
  seeded: string[];
  sources: unknown;
  defs: SavedDef[];
  units: unknown;
  report: D1FinalizeReport;
  inventory: unknown;
  gaps: unknown;
  comparison: unknown;
  resume: unknown;
  tests: string[];
}): void {
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'sources.json'), `${JSON.stringify({ seeded: payload.seeded, snapshot: payload.sources, historicalDefCountDiagnostic: HISTORICAL_DEF_COUNT, defCount: payload.defs.length }, null, 2)}\n`);
  writeFileSync(path.join(dir, 'units.json'), `${JSON.stringify({ historicalDefCountDiagnostic: HISTORICAL_DEF_COUNT, defCount: payload.defs.length, units: payload.units }, null, 2)}\n`);
  writeFileSync(path.join(dir, 'inventory.json'), `${JSON.stringify(payload.inventory, null, 2)}\n`);
  writeFileSync(path.join(dir, 'report.json'), `${JSON.stringify(payload.report, null, 2)}\n`);
  writeFileSync(path.join(dir, 'gaps.json'), `${JSON.stringify(payload.gaps, null, 2)}\n`);
  writeFileSync(path.join(dir, 'comparison.json'), `${JSON.stringify(payload.comparison, null, 2)}\n`);
  writeFileSync(path.join(dir, 'resume.json'), `${JSON.stringify(payload.resume, null, 2)}\n`);
  writeFileSync(path.join(dir, 'tests.txt'), `${payload.tests.join('\n')}\n`);
  for (const def of payload.defs) {
    const dest = path.join(dir, 'defs', def.logical);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, def.source);
  }
}
