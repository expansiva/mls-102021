/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC5.ts" enhancement="_blank"/>

/**
 * Behavior stage. The flow selects the defs. Every case of that cut is
 * executed. A block comes from the def, not from the case id.
 * A lifecycle or payload rule is called on the usecase. A pending grant
 * refuses the route, including a command, and that call does not reach
 * the usecase. --inject disable-rules removes the generated storage and
 * payload checks; those cases must come back failed. A derived MDM
 * usecase is executed on the memory facade: create follows find then
 * create then attach, and update sends expectedVersion. --inject
 * disable-rules also removes that create condition and that version
 * value; those cases must come back failed. --only limits the usecases
 * inside the flows.
 *
 *   tsx --import ./test/register-hooks.mjs mls-102021/l1/agentMaterializeL1/proofC5.ts --evidence <dir> --defs <dir> --repo <dir> [--flow <id>] [--only <ids>] [--inject disable-rules]
 */

import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isRecord, parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { behaviorNeedsLlm, caseBlock, isDerivedMdm, ruleRunsOnUsecase, withoutCreateChecks, withoutLifecycleChecks, withoutPayloadChecks, withoutScopeChecks, withoutStorageChecks, withoutVersionChecks } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { requiredMembers } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { parseCatalog, renderMonitorCatalog, type M1ScenarioCase } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { verifyBatch, type M1Checkpoint, type M1Evidence, type M1Observation, type M1Verdict } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { compileFiles, rememberRoute, publishRoutes, routeCount, runRoute, writeBffHome as writeCaseHome } from '/_102021_/l1/agentMaterializeL1/caseRun.js';
import { createDiskHost, scenarioCatalogRef } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';
import type { BffHandler } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';
import { createMemoryDataRuntime } from '/_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.js';

const PROJECT = 102047;
const MODULE = 'agendaClinica';
const FLOW = 'consultas_recepcionista';
const INJECT = ['disable-rules'] as const;
type InjectMode = '' | typeof INJECT[number];

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const CATALOG_FIXTURE = join(HERE, '../../l2/agentMaterializeL1/testing/catalogFixture.json');

interface ProofArgs { evidence: string; defs: string; repo: string; inject: InjectMode; flows: string[]; only: string[] }
interface SpawnResult { code: number; stdout: string; stderr: string; argv: string[] }
interface SandboxModule { routes?: Array<{ key: string; handler: BffHandler }>; resetMemory?: (seed?: Record<string, unknown>[]) => void; [key: string]: unknown }
interface FlowUnit { defPath: string; definition: M1Definition; code: 'PROMOTED' | 'BLOCKED' }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const problems: string[] = [];
  const evidence = resolve(args.evidence);
  const defs = resolve(args.defs);
  const repo = resolve(args.repo);
  if (isInside(evidence, repo) || evidence === repo) throw new Error('Evidence directory must not be inside the client repository.');
  const before = porcelain(repo);
  const sandboxParent = args.inject ? join(evidence, 'inject', args.inject, 'sandbox') : join(evidence, 'sandbox');
  const outDir = args.inject ? join(evidence, 'inject', args.inject) : evidence;
  const sandboxProject = join(sandboxParent, `mls-${PROJECT}`);
  await rm(sandboxParent, { recursive: true, force: true });
  await mkdir(sandboxProject, { recursive: true });
  await mkdir(outDir, { recursive: true });

  if (existsSync(join(repo, '.git'))) {
    const archived = spawn('git', ['-C', repo, 'archive', 'HEAD', 'l2', 'l4', 'l5']);
    if (archived.code !== 0) throw new Error(archived.stderr || 'git archive failed');
    const extracted = spawn('tar', ['-x', '-C', sandboxProject], archived.stdoutRaw);
    if (extracted.code !== 0) throw new Error(extracted.stderr || 'tar failed');
  } else {
    for (const layer of ['l2', 'l4', 'l5']) {
      if (existsSync(join(repo, layer))) await cp(join(repo, layer), join(sandboxProject, layer), { recursive: true });
    }
  }
  await cp(join(defs, 'l1'), join(sandboxProject, 'l1'), { recursive: true });
  const projectJsonPath = join(sandboxProject, 'l5', 'project.json');
  await mkdir(dirname(projectJsonPath), { recursive: true });
  const projectJson = existsSync(projectJsonPath)
    ? JSON.parse(await readFile(projectJsonPath, 'utf8')) as { appEnv?: unknown }
    : {};
  projectJson.appEnv = 'development';
  await writeFile(projectJsonPath, `${JSON.stringify(projectJson, null, 2)}\n`);
  const catalogRef = scenarioCatalogRef(PROJECT, MODULE);
  await writeCatalog(sandboxProject, catalogRef, args.flows);
  await writeBffHome(join(evidence, 'bff-home'));

  const host = createDiskHost(sandboxParent, sandboxParent, PROJECT, REPO_ROOT);
  host.catalogRef = catalogRef;
  const selected = await flowUnits(sandboxProject, args.flows, args.only);
  const simulate = materialize('simulate', '', sandboxParent);
  const structures = args.flows.map(flow => materialize('structure', flow, sandboxParent));
  const implementRuns = args.flows.map(flow => materialize('implement', flow, sandboxParent));
  const implement = {
    code: implementRuns.some(item => item.code !== 0) ? 1 : 0,
    stdout: implementRuns.map(item => item.stdout).join('\n'),
    stderr: implementRuns.map(item => item.stderr).join('\n'),
    argv: implementRuns.flatMap(item => item.argv),
  };
  if (simulate.code !== 0) problems.push(`simulate exit ${simulate.code}`);
  if (structures.some(item => item.code !== 0)) problems.push('structure exit');
  if (!simulate.stdout.includes('llmCalls: 0')) problems.push('simulate called a model');
  if (!implement.stdout.includes('llmCalls: 0')) problems.push('implement called a model');
  if (selected.units.length === 0) problems.push('the flow selected no derivable usecase');
  for (const unit of selected.units) {
    const promoted = implement.stdout.includes(`PROMOTED ${unit.defPath}`);
    const closed = ['BLOCKED', 'TRANSITION_UNDECLARED', 'GRANT_UNREAD'].some(code => implement.stdout.includes(`${code} ${unit.defPath}`));
    if (unit.code === 'BLOCKED' ? promoted || !closed : !promoted) {
      problems.push(`${unit.definition.artifactId} was not ${unit.code}`);
    }
  }
  for (const port of selected.ports) {
    if (!implement.stdout.includes(`PROMOTED ${port}`)) problems.push(`${port} was not promoted`);
  }

  const controls = controlCases(sandboxProject, selected.units);
  const patchProblems = args.inject === 'disable-rules' ? disableRules(sandboxProject, selected.units) : [];
  const compileLog = compileSlice(sandboxProject, selected.files);
  if (compileLog) problems.push('slice did not compile');
  const scored = await score(host, catalogRef, sandboxProject, selected.units, controls, args.flows, args.inject);
  problems.push(...scored.problems, ...patchProblems);
  problems.push(...verdictProblems(scored.checkpoints, scored.blocked, scored.controls, args.inject));

  const after = porcelain(repo);
  if (after !== before) problems.push('client repository status changed');
  const repoHead = spawn('git', ['-C', repo, 'rev-parse', 'HEAD']).stdout.trim();
  const baseHead = spawn('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD']).stdout.trim();
  const checkpoint = {
    schemaVersion: 'm1_06-proof',
    inject: args.inject || null,
    proofOk: problems.length === 0,
    problems,
    compile: compileLog ? 'failed' : 'clean',
    repoHead,
    baseHead,
    repoStatusUnchanged: after === before,
    checkpoints: scored.checkpoints,
    notes: scored.notes,
  };
  const commands = [process.argv.join(' '), simulate.argv.join(' '), ...structures.map(item => item.argv.join(' ')), ...implementRuns.map(item => item.argv.join(' '))];
  await writeFile(join(outDir, 'commands.txt'), `${commands.join('\n')}\n`);
  await writeFile(join(outDir, 'implement.log'), `${implement.stdout}\n${implement.stderr}`);
  await writeFile(join(outDir, 'compile.log'), compileLog || 'clean\n');
  await writeFile(join(outDir, 'head.txt'), `${repoHead}\n${baseHead}\n`);
  await writeFile(join(outDir, 'checkpoint.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  await writeFile(join(outDir, 'repo-status.txt'), after);
  console.log(`proof: ${problems.length === 0 ? 'ok' : 'failed'}`);
  console.log(`inject: ${args.inject || 'none'}`);
  console.log(`compile: ${compileLog ? 'failed' : 'clean'}`);
  console.log(`checkpoint: ${join(outDir, 'checkpoint.json')}`);
  for (const problem of problems) console.log(`problem: ${problem}`);
  process.exit(problems.length === 0 ? 0 : 1);
}

function verdictProblems(
  checkpoints: readonly M1Checkpoint[],
  blocked: ReadonlySet<string>,
  controls: ReadonlySet<string>,
  inject: InjectMode,
): string[] {
  const problems: string[] = [];
  const rows = checkpoints.flatMap(item => item.evidence);
  if (rows.length === 0) problems.push('the cut has no cases');
  for (const row of rows) {
    if (inject === 'disable-rules' && controls.has(row.caseId)) {
      if (row.verdict !== 'failed') problems.push(`rule control was ${row.verdict}`);
      const owner = checkpoints.find(item => item.evidence.some(evidence => evidence.caseId === row.caseId));
      if (owner?.ready) problems.push(`${row.caseId} was accepted as ready`);
      continue;
    }
    const wanted = blocked.has(row.caseId) ? 'blocked' : 'passed';
    if (row.verdict !== wanted) problems.push(`${row.caseId} was ${row.verdict}`);
  }
  if (rows.some(item => item.verdict === 'expectedRed')) problems.push('a case was expected red');
  if (checkpoints.some(item => item.ready && item.evidence.some(row => row.verdict === 'blocked'))) {
    problems.push('a gap was accepted as ready');
  }
  return problems;
}

function controlCases(sandboxProject: string, units: readonly FlowUnit[]): Set<string> {
  const rules = new Set<string>();
  for (const unit of units) {
    const full = diskOf(sandboxProject, outputOf(unit.defPath));
    if (!existsSync(full)) continue;
    const source = readFileSync(full, 'utf8');
    for (const match of source.matchAll(/\/\/ enforce:(?:storage|payload|lifecycle)[\s\S]*?ruleId: "([^"]+)"/g)) rules.add(match[1]);
  }
  return rules;
}

function disableRules(sandboxProject: string, units: readonly FlowUnit[]): string[] {
  let removed = 0;
  for (const unit of units) {
    const full = diskOf(sandboxProject, outputOf(unit.defPath));
    if (!existsSync(full)) continue;
    const source = readFileSync(full, 'utf8');
    const storage = withoutStorageChecks(source);
    const payload = withoutPayloadChecks(storage.source);
    const lifecycle = withoutLifecycleChecks(payload.source);
    const version = withoutVersionChecks(lifecycle.source);
    const created = withoutCreateChecks(version.source);
    const taken = storage.removed + payload.removed + lifecycle.removed + version.removed + created.removed;
    removed += taken;
    if (taken > 0) writeFileSync(full, created.source);
  }
  for (const flow of new Set(units.flatMap(unit => contractPages(unit.definition)))) {
    const full = diskOf(sandboxProject, outputOf(`_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${flow}.defs.ts`));
    if (!existsSync(full)) continue;
    const scoped = withoutScopeChecks(readFileSync(full, 'utf8'));
    removed += scoped.removed;
    if (scoped.removed > 0) writeFileSync(full, scoped.source);
  }
  return removed > 0 ? [] : ['no generated rule check could be removed'];
}

async function score(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  sandboxProject: string,
  units: readonly FlowUnit[],
  controlRules: ReadonlySet<string>,
  flows: readonly string[],
  inject: InjectMode,
): Promise<{ problems: string[]; checkpoints: M1Checkpoint[]; notes: string[]; blocked: Set<string>; controls: Set<string> }> {
  installRuntime(sandboxProject);
  const catalogText = await host.io.read(catalogRef);
  const parsed = parseCatalog(catalogText ?? '');
  if (!parsed.catalog) throw new Error(parsed.issues.join('; ') || 'catalog unreadable');
  const checkpoints: M1Checkpoint[] = [];
  const notes: string[] = [];
  const problems: string[] = [];
  const blocked = new Set<string>();
  const controls = new Set<string>();
  const cases = units.flatMap(unit => parsed.catalog?.scenarios.find(item => item.artifactId === unit.definition.artifactId)?.cases ?? []);
  const pages = new Set(cases.map(item => item.routine.split('.')[1] ?? '').filter(Boolean));
  for (const unit of units) pages.add(pageOf(unit.definition));
  await registerRoutes(sandboxProject, [...pages]);
  for (const unit of units) {
    const scenario = parsed.catalog.scenarios.find(item => item.artifactId === unit.definition.artifactId);
    if (!scenario) {
      if (isDerivedMdm(unit.definition)) {
        const probed = await probeMdm(sandboxProject, unit, inject === 'disable-rules');
        problems.push(...probed.problems);
        notes.push(...probed.notes);
        for (const id of probed.controlIds) controls.add(id);
        for (const id of probed.blockedIds) blocked.add(id);
        const reported = await report(host, catalogRef, unit.definition, []);
        reported.evidence = probed.evidence;
        reported.ready = probed.evidence.length > 0 && probed.evidence.every(row => row.verdict === 'passed');
        reported.accepted = reported.ready;
        checkpoints.push(reported);
      } else {
        const probed = await probeTransition(sandboxProject, unit);
        problems.push(...probed.problems);
        notes.push(...probed.notes);
      }
      continue;
    }
    for (const item of scenario.cases) {
      if (item.gate === 'compile') continue;
      if (item.routine && !declaredRoutes(unit.definition).includes(item.routine)) continue;
      const block = await caseBlock(unit.definition, unit.defPath, item, ref => readSandbox(sandboxProject, ref));
      if (block && !block.unread) blocked.add(item.caseId);
      else if (!item.expect.ok && item.expect.ruleId && controlRules.has(item.expect.ruleId)) controls.add(item.caseId);
    }
    const applicable = scenario.cases.filter(item => !item.routine || declaredRoutes(unit.definition).includes(item.routine));
    const executed = await executeScenario(sandboxProject, unit, applicable);
    for (const row of rulePlanRows(unit.definition)) {
      if (row.gap !== 'APPLICABILITY_UNDECLARED' || !row.ruleId) continue;
      const caseId = `${unit.definition.artifactId}.ruleCoverage.${row.ruleId}`;
      blocked.add(caseId);
      executed.observations.push(observation(caseId, {
        blocked: true,
        blockOwner: 'toPlanner_aplicabilidade_leitura_x_transicao',
        errorCode: row.gap,
        ruleId: row.ruleId,
        reason: `${row.ruleId} is ${row.gap}`,
      }));
    }
    notes.push(...executed.notes);
    if (textOf(unit.definition.data.operation) === 'transition') {
      const probed = await probeTransition(sandboxProject, unit);
      if (inject === 'disable-rules') {
        if (probed.problems.length === 0) problems.push(`${unit.definition.artifactId} kept the lifecycle and payload checks after they were removed`);
        else problems.push(...probed.problems);
      } else {
        problems.push(...probed.problems);
        notes.push(...probed.notes);
      }
    }
    const reported = await report(host, catalogRef, unit.definition, executed.observations);
    for (const row of executed.observations) {
      if (reported.evidence.some(item => item.caseId === row.caseId)) continue;
      reported.evidence.push({
        caseId: row.caseId,
        verdict: row.blocked ? 'blocked' : 'failed',
        errorCode: row.errorCode,
        status: row.status,
        durationMs: row.durationMs,
        detail: row.reason,
      });
      reported.ready = false;
      reported.accepted = false;
    }
    checkpoints.push(reported);
  }
  const refused = await refusePendingRoutes(sandboxProject, flows);
  problems.push(...refused.problems);
  notes.push(...refused.notes);
  return { problems, checkpoints, notes, blocked, controls };
}

async function executeScenario(
  sandboxProject: string,
  unit: FlowUnit,
  cases: readonly M1ScenarioCase[],
): Promise<{ observations: M1Observation[]; notes: string[] }> {
  const observations: M1Observation[] = [];
  const notes: string[] = [];
  const loaded = await importSandbox(sandboxProject, outputOf(unit.defPath));
  if ('error' in loaded) {
    return { observations: cases.map(item => observation(item.caseId, { broken: 'import', reason: loaded.error })), notes };
  }
  for (const item of cases) {
    if (item.gate === 'compile') {
      observations.push(observation(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'imported' }));
      continue;
    }
    const started = Date.now();
    const block = await caseBlock(unit.definition, unit.defPath, item, ref => readSandbox(sandboxProject, ref));
    if (block?.unread) {
      observations.push(observation(item.caseId, { ok: false, status: 0, errorCode: 'GRANT_UNREAD', durationMs: Date.now() - started, reason: `${item.routine} grant was not read` }));
      continue;
    }
    if (block) {
      observations.push(observation(item.caseId, {
        blocked: true,
        blockOwner: block.owner,
        errorCode: block.gap,
        ruleId: block.ruleId || null,
        durationMs: Date.now() - started,
        reason: block.ruleId ? `${block.ruleId} is ${block.gap}` : `${item.routine} is ${block.gap}`,
      }));
      continue;
    }
    const onUsecase = await ruleRunsOnUsecase(unit.definition, item.expect.ruleId ?? '', ref => readSandbox(sandboxProject, ref));
    if (onUsecase) {
      const invoked = await invokeUsecase(sandboxProject, unit.defPath, unit.definition, item);
      if (item.mutating && item.expect.ok && !invoked.reason.startsWith('saved ')) notes.push(`${item.caseId} did not return a saved id`);
      observations.push(observation(item.caseId, {
        ok: invoked.ok,
        status: invoked.status,
        errorCode: invoked.code,
        ruleId: invoked.ruleId,
        durationMs: Date.now() - started,
        fields: fieldNames(invoked.data),
        reason: invoked.reason,
      }));
      continue;
    }
    const routed = await callRoute(sandboxProject, unit.definition, item, started);
    if (item.mutating && item.expect.ok && !routed.reason.startsWith('saved ')) notes.push(`${item.caseId} did not return a saved id`);
    observations.push(routed);
  }
  return { observations, notes };
}

interface Invoked {
  ok: boolean;
  status: number;
  code: string | null;
  ruleId: string | null;
  data: unknown;
  reason: string;
}

async function invokeUsecase(
  sandboxProject: string,
  defPath: string,
  definition: M1Definition,
  item: M1ScenarioCase,
): Promise<Invoked> {
  const loaded = await importSandbox(sandboxProject, outputOf(defPath));
  if ('error' in loaded) return { ok: false, status: 0, code: 'IMPORT', ruleId: null, data: null, reason: loaded.error };
  const fn = loaded.module[definition.artifactId];
  if (typeof fn !== 'function') {
    return { ok: false, status: 0, code: 'EXPORT', ruleId: null, data: null, reason: `${definition.artifactId} is not exported` };
  }
  const ports = await portsFor(sandboxProject, definition);
  if (!ports) return { ok: false, status: 0, code: 'PORT', ruleId: null, data: null, reason: `${definition.artifactId} port was not loaded` };
  await resetStore(sandboxProject, definition, await seedRows(sandboxProject, definition, item));
  try {
    const data = await (fn as (...args: unknown[]) => Promise<unknown>)(await paramsFor(sandboxProject, definition, item), {}, ports);
    const id = isRecord(data) && typeof data.id === 'string' ? data.id : '';
    return { ok: true, status: 200, code: null, ruleId: null, data, reason: id ? `saved ${id}` : 'returned' };
  } catch (error) {
    const outcome = await thrownOutcome(error);
    return {
      ok: false,
      status: outcome.status ?? 0,
      code: outcome.errorCode ?? null,
      ruleId: outcome.ruleId ?? null,
      data: null,
      reason: outcome.reason ?? '',
    };
  }
}

async function portsFor(sandboxProject: string, definition: M1Definition): Promise<Record<string, unknown> | null> {
  const names = Array.isArray(definition.data.ports)
    ? definition.data.ports.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const dep = definition.dependencies.find(path => path.includes('/ports/'));
  if (!dep || names.length === 0) return {};
  const loaded = await importSandbox(sandboxProject, outputOf(dep));
  if ('error' in loaded) return null;
  const ports: Record<string, unknown> = {};
  for (const name of names) {
    const pending = loaded.module[`pending${name}`];
    if (pending === undefined) return null;
    ports[name.charAt(0).toLowerCase() + name.slice(1)] = pending;
  }
  return ports;
}

async function refusePendingRoutes(
  sandboxProject: string,
  flows: readonly string[],
): Promise<{ problems: string[]; notes: string[] }> {
  const problems: string[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const flow of flows) {
    const pageRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${flow}.defs.ts`;
    const controller = await readDefinitionFile(sandboxProject, pageRef);
    if (!controller) continue;
    const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
    for (const handler of handlers) {
      const route = textOf(handler.route);
      const usecaseId = textOf(handler.usecaseId);
      if (!route || !usecaseId || seen.has(route)) continue;
      seen.add(route);
      const defPath = controller.dependencies.find(path => path.endsWith(`/${usecaseId}.defs.ts`)) ?? '';
      const definition = defPath ? await readDefinitionFile(sandboxProject, defPath) : null;
      if (!definition) continue;
      const block = await caseBlock(definition, defPath, { routine: route, expect: { ruleId: null } }, ref => readSandbox(sandboxProject, ref));
      if (!block || block.unread || !block.gap) continue;
      const prepared = await denialCase(sandboxProject, definition, route);
      const called = await callRoute(sandboxProject, definition, prepared.item, Date.now());
      const after = prepared.statusField ? await storedStatus(sandboxProject, definition, prepared.statusField) : null;
      const kind = textOf(handler.kind) || 'route';
      if (called.status !== 403 || called.errorCode !== block.gap) {
        problems.push(`${route} ${kind} returned ${called.errorCode ?? 'ok'} ${called.status}, expected ${block.gap} 403`);
      } else if (after !== null && prepared.before && after !== prepared.before) {
        problems.push(`${route} reached the usecase with pending grant ${block.gap}`);
      } else {
        notes.push(`${route} ${kind} refused ${block.gap}`);
      }
    }
  }
  return { problems, notes };
}

async function denialCase(
  sandboxProject: string,
  definition: M1Definition,
  route: string,
): Promise<{ item: M1ScenarioCase; statusField: string; before: string }> {
  if (textOf(definition.data.operation) !== 'transition') {
    return { item: probeCase(definition.artifactId, route, { id: 'row-1' }), statusField: '', before: '' };
  }
  const lifecycle = isRecord(definition.data.lifecycle) ? definition.data.lifecycle : null;
  const entityRef = definition.dependencies.find(path => path.includes('/entities/')) ?? '';
  const entity = entityRef ? await readDefinitionFile(sandboxProject, entityRef) : null;
  const spec = entity ? transitionOf(entity, textOf(lifecycle?.transitionId)) : null;
  const statusField = entity ? enumName(entity) : '';
  const flat = spec && statusField
    ? await probeFlat(sandboxProject, { defPath: '', definition, code: 'PROMOTED' }, spec.from[0] ?? '', statusField, true)
    : { id: 'row-1' };
  return { item: probeCase(definition.artifactId, route, flat), statusField, before: spec?.from[0] ?? '' };
}

async function storedStatus(sandboxProject: string, definition: M1Definition, statusField: string): Promise<string | null> {
  const ports = await portsFor(sandboxProject, definition);
  const port = ports ? Object.values(ports)[0] as { list?: (filter: Record<string, unknown>) => Promise<unknown[]> } : null;
  if (!port?.list) return null;
  const rows = await port.list({ id: 'row-1' });
  const row = rows[0];
  if (!isRecord(row) || typeof row[statusField] !== 'string') return null;
  return row[statusField];
}

async function callRoute(
  sandboxProject: string,
  definition: M1Definition,
  item: M1ScenarioCase,
  started: number,
): Promise<M1Observation> {
  return runRoute(sandboxProject, String(PROJECT), MODULE, definition, item, started);
}

async function seedRows(sandboxProject: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, unknown>[]> {
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  const entity = dep ? await readDefinitionFile(sandboxProject, dep) : null;
  const fields = entity && Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  return item.synthetic.map(row => {
    const flat = { ...row } as Record<string, unknown>;
    const record: Record<string, unknown> = {};
    for (const field of fields) {
      const path = typeof field.name === 'string' ? field.name : '';
      if (!path) continue;
      if (!path.includes('.')) {
        if (flat[path] !== undefined) record[path] = flat[path];
      } else if (flat[path.split('.').pop() ?? ''] !== undefined) {
        assignPath(record, path, flat[path.split('.').pop() ?? '']);
      }
    }
    return record;
  });
}

async function paramsFor(sandboxProject: string, definition: M1Definition, item: M1ScenarioCase): Promise<Record<string, unknown>> {
  const contract = contractOf(definition, item.routine);
  const contractText = contract ? await readSandbox(sandboxProject, contract.path) : null;
  const required = contract && contractText ? (requiredMembers(contractText, contract.inputType) ?? []) : [];
  const types = inputTypes(definition);
  const names = required.length > 0 ? required : [...types.keys()];
  const row = item.synthetic[0] ? { ...item.synthetic[0] } as Record<string, unknown> : {};
  const params: Record<string, unknown> = {};
  for (const field of names) {
    if (typeof row[field] === 'string' && row[field] !== '') {
      params[field] = row[field];
      continue;
    }
    const nested = contractText && contract ? nestedMembers(contractText, contract.inputType, field) : null;
    if (nested) {
      const value: Record<string, string> = {};
      for (const key of nested) {
        if (typeof row[key] === 'string') value[key] = row[key];
      }
      params[field] = value;
      continue;
    }
    const literal = /"([^"]+)"/.exec(types.get(field) ?? '')?.[1] ?? '';
    params[field] = literal || 'sample';
  }
  return params;
}

function nestedMembers(source: string, typeName: string, field: string): string[] | null {
  const tokenText = `export interface ${typeName} `;
  const at = source.indexOf(tokenText);
  if (at < 0) return null;
  const open = source.indexOf('{', at);
  if (open < 0) return null;
  const lines = source.slice(open).split('\n');
  let depth = 0;
  let inside = false;
  const names: string[] = [];
  for (const line of lines) {
    if (!inside && depth === 1) {
      const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\??\s*:\s*\{/.exec(line);
      if (match && match[1] === field) inside = true;
    } else if (inside && depth === 2) {
      const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?\??\s*:/.exec(line);
      if (match) names.push(match[1]);
    }
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (inside && depth < 2) break;
  }
  return inside ? names : null;
}

async function resetStore(sandboxProject: string, definition: M1Definition, seed: Record<string, unknown>[]): Promise<void> {
  const dep = definition.dependencies.find(path => path.includes('/ports/'));
  if (!dep) return;
  const loaded = await importSandbox(sandboxProject, outputOf(dep));
  if ('error' in loaded || typeof loaded.module.resetMemory !== 'function') return;
  loaded.module.resetMemory(seed);
}

async function registerRoutes(sandboxProject: string, pages: readonly string[]): Promise<void> {
  for (const page of new Set(pages)) {
    const ref = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
    const loaded = await importSandbox(sandboxProject, outputOf(ref));
    if ('error' in loaded) continue;
    for (const route of loaded.module.routes ?? []) rememberRoute(route.key, route.handler);
  }
  if (routeCount() > 0) await publishProofRoutes();
}

async function flowUnits(sandboxProject: string, flows: readonly string[], only: readonly string[]): Promise<{ units: FlowUnit[]; ports: string[]; files: string[] }> {
  const units: FlowUnit[] = [];
  const ports = new Set<string>();
  const files = new Set<string>();
  const seen = new Set<string>();
  for (const flow of flows) {
    const page = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${flow}.defs.ts`;
    const controller = await readDefinitionFile(sandboxProject, page);
    if (!controller) continue;
    files.add(relOf(page));
    const scope = controller.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
    if (scope) files.add(relOf(scope));
    const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
    for (const handler of handlers) {
      const usecaseId = typeof handler.usecaseId === 'string' ? handler.usecaseId : '';
      if (only.length > 0 && !only.includes(usecaseId)) continue;
      const defPath = controller.dependencies.find(path => path.endsWith(`/${usecaseId}.defs.ts`)) ?? '';
      if (!defPath || seen.has(defPath)) continue;
      const definition = await readDefinitionFile(sandboxProject, defPath);
      if (!definition || behaviorNeedsLlm(definition)) continue;
      seen.add(defPath);
      const catalog = parseCatalog(await readFile(CATALOG_FIXTURE, 'utf8'));
      const cases = catalog.catalog?.scenarios.find(item => item.artifactId === definition.artifactId)?.cases ?? [];
      let blocked = false;
      for (const item of cases) {
        if (item.gate === 'compile') continue;
        if (item.routine && !declaredRoutes(definition).includes(item.routine)) continue;
        const block = await caseBlock(definition, defPath, item, ref => readSandbox(sandboxProject, ref));
        if (block && !block.unread) blocked = true;
      }
      for (const route of declaredRoutes(definition)) {
        const block = await caseBlock(definition, defPath, { routine: route, expect: { ruleId: null } }, ref => readSandbox(sandboxProject, ref));
        if (block && !block.unread) blocked = true;
      }
      units.push({ defPath, definition, code: blocked ? 'BLOCKED' : 'PROMOTED' });
      for (const dep of definition.dependencies) {
        if (dep.includes('/ports/')) ports.add(dep);
        if (dep.includes('/entities/') || dep.includes('/ports/')) files.add(relOf(dep));
      }
      files.add(relOf(defPath));
    }
  }
  return { units, ports: [...ports], files: [...files] };
}

function routesByArtifact(sandboxProject: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const root = join(sandboxProject, 'l1');
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.defs.ts') && full.includes(`${sep}usecases${sep}`)) {
        const text = readFileSync(full, 'utf8');
        const id = /"artifactId": "([^"]+)"/.exec(text)?.[1] ?? '';
        const routes = [...text.matchAll(/"route": "([^"]+)"/g)].map(match => match[1]);
        if (id && routes.length > 0) found.set(id, [...new Set(routes)]);
      }
    }
  };
  walk(root);
  return found;
}

function declaredRoutes(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  return refs.map(item => textOf(item.route)).filter(Boolean);
}

function rulePlanRows(definition: M1Definition): Array<{ ruleId: string; gap: string }> {
  if (!Array.isArray(definition.data.rulePlan)) return [];
  return definition.data.rulePlan.filter(isRecord).map(row => ({
    ruleId: textOf(row.ruleId),
    gap: textOf(row.gap),
  }));
}

function pageOf(definition: M1Definition): string {
  return contractPages(definition)[0] ?? '';
}

function contractPages(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  return [...new Set(refs.map(item => textOf(item.route).split('.')[1] ?? '').filter(Boolean))];
}

interface MdmProbe {
  problems: string[];
  notes: string[];
  evidence: M1Evidence[];
  controlIds: string[];
  blockedIds: string[];
}

function evidenceRow(caseId: string, verdict: M1Verdict, detail: string, errorCode: string | null = null, status: number | null = null): M1Evidence {
  return { caseId, verdict, errorCode, status, durationMs: 0, detail };
}

async function probeMdm(sandboxProject: string, unit: FlowUnit, injected: boolean): Promise<MdmProbe> {
  const problems: string[] = [];
  const notes: string[] = [];
  const evidence: M1Evidence[] = [];
  const controlIds: string[] = [];
  const blockedIds: string[] = [];
  const definition = unit.definition;
  const id = definition.artifactId;
  const operation = textOf(definition.data.operation);
  const source = await readSandbox(sandboxProject, outputOf(unit.defPath));
  const pages = contractPages(definition);
  let called = false;
  for (const page of pages) {
    const controller = await readSandbox(sandboxProject, outputOf(`_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/${page}.defs.ts`));
    if (controller?.includes(`${id}(`)) called = true;
  }
  if (!called) problems.push(`${id} is not called by its controller`);
  if (operation === 'update' && !source?.includes('// enforce:version')) {
    const caseId = `${id}.staleVersion`;
    blockedIds.push(caseId);
    evidence.push(evidenceRow(caseId, 'blocked', 'blocked: x1_05', 'PRECONDITION_UNDECLARED', 409));
    notes.push(`${id} blocked PRECONDITION_UNDECLARED`);
    return { problems, notes, evidence, controlIds, blockedIds };
  }
  const loaded = await importSandbox(sandboxProject, outputOf(unit.defPath));
  if ('error' in loaded || typeof loaded.module[id] !== 'function') {
    problems.push(`${id} did not import`);
    evidence.push(evidenceRow(`${id}.probe`, 'failed', 'error' in loaded ? loaded.error : 'not exported'));
    return { problems, notes, evidence, controlIds, blockedIds };
  }
  const runtime = createMemoryDataRuntime();
  const ctx = createRequestContext(runtime, { sandbox: true, moduleId: definition.moduleName });
  const seen: string[] = [];
  const entity = ctx.mdm.entity as unknown as Record<string, (...args: never[]) => Promise<unknown>>;
  for (const name of ['findByDocument', 'findByContact', 'create', 'attachRole', 'update', 'get']) {
    const original = entity[name];
    if (typeof original !== 'function') continue;
    entity[name] = (async (...args: never[]) => {
      seen.push(name);
      return original.apply(ctx.mdm.entity, args);
    }) as typeof original;
  }
  const call = loaded.module[id] as (input: Record<string, unknown>, context: unknown) => Promise<unknown>;
  try {
    if (operation === 'create') await probeCreate(definition, call, ctx, seen, evidence, notes, controlIds, injected);
    else if (operation === 'update') await probeUpdate(sandboxProject, definition, call, ctx, evidence, notes, controlIds, injected);
    else if (operation === 'list') await probeList(sandboxProject, definition, call, ctx, evidence, notes);
    else problems.push(`${id} operation ${operation} was not probed`);
  } catch (error) {
    const outcome = await thrownOutcome(error);
    problems.push(`${id} probe threw ${outcome.errorCode ?? 'INTERNAL_ERROR'}`);
    evidence.push(evidenceRow(`${id}.probe`, 'failed', outcome.reason ?? '', outcome.errorCode ?? null, outcome.status ?? 500));
  }
  return { problems, notes, evidence, controlIds, blockedIds };
}

async function probeCreate(
  definition: M1Definition,
  call: (input: Record<string, unknown>, context: unknown) => Promise<unknown>,
  ctx: ReturnType<typeof createRequestContext>,
  seen: string[],
  evidence: M1Evidence[],
  notes: string[],
  controlIds: string[],
  injected: boolean,
): Promise<void> {
  const id = definition.artifactId;
  const input = mdmSample(definition);
  const start = seen.length;
  const first = await call(input, ctx);
  const order = seen.slice(start).filter(name => name === 'findByDocument' || name === 'findByContact' || name === 'create' || name === 'attachRole');
  const savedId = isRecord(first) && typeof first.id === 'string' ? first.id : '';
  const ordered = order[0]?.startsWith('find') && order.includes('create') && order[order.length - 1] === 'attachRole';
  evidence.push(evidenceRow(`${id}.creates`, savedId && ordered ? 'passed' : 'failed', savedId ? `saved ${savedId} via ${order.join(' -> ')}` : 'no id'));
  if (savedId && ordered) notes.push(`${id} ${order.join(' -> ')} ${savedId}`);
  const again = seen.length;
  const second = await call(input, ctx);
  const creates = seen.slice(again).filter(name => name === 'create').length;
  const same = isRecord(second) && second.id === savedId;
  const controlId = `${id}.attachExisting`;
  controlIds.push(controlId);
  const held = Boolean(same && creates === 0);
  evidence.push(evidenceRow(controlId, injected ? (creates > 0 ? 'failed' : 'passed') : (held ? 'passed' : 'failed'), held ? `reused ${savedId}` : `create calls ${creates}`));
  if (!injected && held) notes.push(`${id} reused ${savedId}`);
  if (injected && creates > 0) notes.push(`${id} attachExisting failed`);
}

async function probeUpdate(
  sandboxProject: string,
  definition: M1Definition,
  call: (input: Record<string, unknown>, context: unknown) => Promise<unknown>,
  ctx: ReturnType<typeof createRequestContext>,
  evidence: M1Evidence[],
  notes: string[],
  controlIds: string[],
  injected: boolean,
): Promise<void> {
  const id = definition.artifactId;
  const subtype = await subtypeOf(sandboxProject, definition);
  const seeded = await ctx.mdm.entity.create({
    details: { subtype, name: 'Ada', countryCode: 'US', docType: 'Passport', docId: `DOC${id}` },
  } as never) as { mdmId: string; version: number };
  const input = mdmSample(definition, { id: seeded.mdmId, version: seeded.version, 'details.identification.name': 'Ada Updated' });
  const saved = await call(input, ctx);
  const wrote = isRecord(saved) && typeof saved.id === 'string';
  evidence.push(evidenceRow(`${id}.updates`, wrote ? 'passed' : 'failed', wrote ? `saved ${String(saved.id)}` : 'update did not return'));
  if (wrote) notes.push(`${id} updated ${String(saved.id)}`);
  const controlId = `${id}.staleVersion`;
  controlIds.push(controlId);
  try {
    await call(mdmSample(definition, { id: seeded.mdmId, version: seeded.version, 'details.identification.name': 'Stale' }), ctx);
    evidence.push(evidenceRow(controlId, 'failed', 'stale version was stored', null, 200));
    if (injected) notes.push(`${id} staleVersion failed`);
  } catch (error) {
    const outcome = await thrownOutcome(error);
    const conflict = outcome.errorCode === 'CONCURRENCY_CONFLICT';
    evidence.push(evidenceRow(
      controlId,
      injected ? (conflict ? 'passed' : 'failed') : (conflict ? 'passed' : 'failed'),
      outcome.reason ?? '',
      outcome.errorCode ?? null,
      outcome.status ?? 0,
    ));
    if (!injected && conflict) notes.push(`${id} staleVersion 409`);
  }
}

async function probeList(
  sandboxProject: string,
  definition: M1Definition,
  call: (input: Record<string, unknown>, context: unknown) => Promise<unknown>,
  ctx: ReturnType<typeof createRequestContext>,
  evidence: M1Evidence[],
  notes: string[],
): Promise<void> {
  const id = definition.artifactId;
  const subtype = await subtypeOf(sandboxProject, definition);
  const role = literalOf(definition);
  const seeded = await ctx.mdm.entity.create({
    details: { subtype, name: 'Ada', countryCode: 'US', docType: 'Passport', docId: `DOC${id}` },
  } as never) as { mdmId: string };
  if (role) await ctx.mdm.entity.attachRole(seeded.mdmId, role);
  const listed = await call(nameInput(definition), ctx);
  const rows = Array.isArray(listed) ? listed : [];
  const hit = rows.some(row => isRecord(row) && row.id === seeded.mdmId);
  evidence.push(evidenceRow(`${id}.lists`, hit ? 'passed' : 'failed', hit ? `listed ${seeded.mdmId}` : `missing from ${rows.length} rows`));
  if (hit) notes.push(`${id} listed ${seeded.mdmId}`);
}

function mdmSample(definition: M1Definition, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  const mdm = definition.data.mdm;
  if (isRecord(mdm) && Array.isArray(mdm.calls)) {
    for (const call of mdm.calls) {
      if (!isRecord(call) || !Array.isArray(call.arguments)) continue;
      for (const arg of call.arguments) {
        if (!isRecord(arg) || !isRecord(arg.origin) || arg.origin.kind !== 'contract') continue;
        const path = textOf(arg.origin.path);
        if (!path || path === 'id' || path === 'version' || valueAt(input, path) !== undefined) continue;
        assignPath(input, path, sampleLeaf(path));
      }
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (key.includes('.')) assignPath(input, key, value);
    else input[key] = value;
  }
  return input;
}

function nameInput(definition: M1Definition): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  const mdm = definition.data.mdm;
  if (!isRecord(mdm) || !Array.isArray(mdm.calls)) return input;
  for (const call of mdm.calls) {
    if (!isRecord(call) || call.method !== 'listByType' || !Array.isArray(call.arguments)) continue;
    for (const arg of call.arguments) {
      if (!isRecord(arg) || !isRecord(arg.origin) || arg.origin.kind !== 'contract') continue;
      const path = textOf(arg.origin.path);
      if (path) assignPath(input, path, 'Ada');
    }
  }
  return input;
}

function sampleLeaf(path: string): unknown {
  const leaf = path.split('.').pop() ?? '';
  if (leaf === 'name') return 'Ada';
  if (leaf === 'docType') return 'Passport';
  if (leaf === 'docId') return 'DOC1';
  if (leaf === 'countryCode') return 'US';
  if (leaf === 'notes' || leaf === 'occupation') return 'sample';
  if (leaf === 'aliases') return ['Ada'];
  if (leaf === 'page') return 1;
  return {};
}

function literalOf(definition: M1Definition): string {
  const mdm = definition.data.mdm;
  if (!isRecord(mdm) || !Array.isArray(mdm.calls)) return '';
  for (const call of mdm.calls) {
    if (!isRecord(call) || !Array.isArray(call.arguments)) continue;
    for (const arg of call.arguments) {
      if (isRecord(arg) && isRecord(arg.origin) && arg.origin.kind === 'literal' && typeof arg.value === 'string') return arg.value;
    }
  }
  return '';
}

async function subtypeOf(sandboxProject: string, definition: M1Definition): Promise<string> {
  for (const dep of definition.dependencies) {
    if (!dep.includes('/ontology/') || dep.endsWith('/mdm.defs.ts')) continue;
    const text = await readSandbox(sandboxProject, dep);
    const match = text ? /"subtype"\s*:\s*"([^"]+)"/.exec(text) : null;
    if (match?.[1]) return match[1];
  }
  return '';
}

function valueAt(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const part of path.split('.')) {
    if (!isRecord(node)) return undefined;
    node = node[part];
  }
  return node;
}

async function probeTransition(sandboxProject: string, unit: FlowUnit): Promise<{ problems: string[]; notes: string[] }> {
  if (textOf(unit.definition.data.operation) !== 'transition') return { problems: [], notes: [] };
  const lifecycle = isRecord(unit.definition.data.lifecycle) ? unit.definition.data.lifecycle : null;
  const transitionId = textOf(lifecycle?.transitionId);
  const entityRef = unit.definition.dependencies.find(path => path.includes('/entities/')) ?? '';
  const entity = entityRef ? await readDefinitionFile(sandboxProject, entityRef) : null;
  const spec = entity ? transitionOf(entity, transitionId) : null;
  const statusField = entity ? enumName(entity) : '';
  const source = await readSandbox(sandboxProject, outputOf(unit.defPath));
  const flowRule = /\/\/ enforce:lifecycle[\s\S]*?ruleId: "([^"]*)"/.exec(source ?? '')?.[1] ?? '';
  const payloadRule = /\/\/ enforce:payload[\s\S]*?ruleId: "([^"]*)"/.exec(source ?? '')?.[1] ?? '';
  const route = pageRoute(unit.definition);
  const payloadPaths = isRecord(unit.definition.data.lifecycle) && Array.isArray(unit.definition.data.lifecycle.payload)
    ? unit.definition.data.lifecycle.payload.filter((item): item is string => typeof item === 'string')
    : [];
  if (!spec || !statusField || !route) {
    return { problems: [`${unit.definition.artifactId} transition stayed unemitted: transition shape is incomplete`], notes: [] };
  }
  const outside = (entity ? stateNames(entity) : []).find(state => !spec.from.includes(state)) ?? '';
  const problems: string[] = [];
  const notes: string[] = [];
  const allowed = await runProbe(sandboxProject, unit, route, spec.from[0] ?? '', statusField, true);
  const allowedState = isRecord(allowed.data) ? allowed.data[statusField] : '';
  if (!allowed.ok || allowedState !== spec.to) problems.push(`${unit.definition.artifactId} allowed transition returned ${allowed.code ?? allowedState}`);
  else notes.push(`${unit.definition.artifactId} ${spec.from[0]} -> ${spec.to}`);
  if (outside) {
    const refused = await runProbe(sandboxProject, unit, route, outside, statusField, true);
    if (refused.ok || refused.code !== 'VALIDATION_ERROR' || (flowRule && refused.ruleId !== flowRule)) {
      problems.push(`${unit.definition.artifactId} invalid transition returned ${refused.code ?? 'ok'} ${refused.ruleId ?? ''}`);
    } else notes.push(`${unit.definition.artifactId} refused ${outside}`);
  }
  if (payloadPaths.length > 0) {
    const missing = await runProbe(sandboxProject, unit, route, spec.from[0] ?? '', statusField, false);
    if (missing.ok || missing.code !== 'VALIDATION_ERROR' || (payloadRule && missing.ruleId !== payloadRule)) {
      problems.push(`${unit.definition.artifactId} missing payload returned ${missing.code ?? 'ok'} ${missing.ruleId ?? ''}`);
    } else notes.push(`${unit.definition.artifactId} refused an empty payload`);
  }
  return { problems, notes };
}

async function runProbe(
  sandboxProject: string,
  unit: FlowUnit,
  route: string,
  status: string,
  statusField: string,
  withPayload: boolean,
): Promise<{ ok: boolean; code: string | null; ruleId: string | null; data: unknown }> {
  const flat = await probeFlat(sandboxProject, unit, status, statusField, withPayload);
  const invoked = await invokeUsecase(sandboxProject, unit.defPath, unit.definition, probeCase(unit.definition.artifactId, route, flat));
  return { ok: invoked.ok, code: invoked.code, ruleId: invoked.ruleId, data: invoked.data };
}

function probeCase(artifactId: string, route: string, row: Record<string, unknown>): M1ScenarioCase {
  return {
    caseId: `${artifactId}.probe`,
    gate: 'business',
    mandatory: true,
    source: 'lifecycle',
    expectation: '',
    preconditions: [],
    synthetic: [{
      entity: 'row',
      id: typeof row.id === 'string' ? row.id : 'row-1',
      professionalId: typeof row.professionalId === 'string' ? row.professionalId : '',
      patientId: typeof row.patientId === 'string' ? row.patientId : '',
      scheduledAt: typeof row.scheduledAt === 'string' ? row.scheduledAt : '',
      status: typeof row.status === 'string' ? row.status : '',
      version: typeof row.version === 'number' ? row.version : 1,
      attendanceNote: typeof row.attendanceNote === 'string' ? row.attendanceNote : '',
    }],
    actorId: 'probe',
    routine: route,
    mutating: true,
    expect: { ok: true, status: 200, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
    expectedFailure: null,
  };
}

async function probeFlat(sandboxProject: string, unit: FlowUnit, status: string, statusField: string, withPayload: boolean): Promise<Record<string, unknown>> {
  const entityRef = unit.definition.dependencies.find(path => path.includes('/entities/')) ?? '';
  const entity = entityRef ? await readDefinitionFile(sandboxProject, entityRef) : null;
  const fields = entity && Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const row: Record<string, unknown> = {};
  for (const field of fields) {
    const path = textOf(field.name);
    if (!path || path.includes('.')) continue;
    if (path === statusField) row[path] = status;
    else if (field.derived === true && (field.type === 'integer' || field.type === 'number')) row[path] = 1;
    else row[path] = path === 'id' || textOf(field.type) === 'uuid' ? 'row-1' : 'sample';
  }
  const payload = isRecord(unit.definition.data.lifecycle) ? unit.definition.data.lifecycle.payload : [];
  if (Array.isArray(payload)) {
    for (const path of payload) {
      if (typeof path !== 'string') continue;
      const tail = path.split('.').pop() ?? '';
      if (tail) row[tail] = withPayload ? 'noted' : '';
    }
  }
  return row;
}

async function shapeRow(sandboxProject: string, definition: M1Definition, flat: Record<string, unknown>): Promise<Record<string, unknown>> {
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  const entity = dep ? await readDefinitionFile(sandboxProject, dep) : null;
  const fields = entity && Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    const path = textOf(field.name);
    if (!path) continue;
    if (!path.includes('.')) {
      if (flat[path] !== undefined) record[path] = flat[path];
    } else if (flat[path.split('.').pop() ?? ''] !== undefined) {
      assignPath(record, path, flat[path.split('.').pop() ?? '']);
    }
  }
  return record;
}

function transitionOf(entity: M1Definition, transitionId: string): { from: string[]; to: string } | null {
  const lifecycle = entity.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.transitions)) return null;
  const found = lifecycle.transitions.find(item => isRecord(item) && item.transitionId === transitionId);
  if (!isRecord(found) || !Array.isArray(found.from) || typeof found.to !== 'string') return null;
  return { from: found.from.filter((item): item is string => typeof item === 'string'), to: found.to };
}

function stateNames(entity: M1Definition): string[] {
  const lifecycle = entity.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.states)) return [];
  return lifecycle.states.flatMap(item => isRecord(item) && typeof item.state === 'string' ? [item.state] : []);
}

function enumName(entity: M1Definition): string {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const enums = fields.filter(field => field.type === 'enum' && typeof field.name === 'string' && !String(field.name).includes('.'));
  return enums.length === 1 ? String(enums[0].name) : '';
}

function pageRoute(definition: M1Definition): string {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  return textOf(refs[0]?.route);
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function authoritiesFor(item: M1ScenarioCase, definition: M1Definition, grants: unknown): string[] {
  if (!item.actorId) return [];
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
  const handler = handlers.find(entry => isRecord(entry) && entry.route === item.routine);
  const grantIds = isRecord(handler) && Array.isArray(handler.grantIds) ? handler.grantIds.filter((entry): entry is string => typeof entry === 'string') : [];
  const rows = Array.isArray(grants) ? grants.filter(isRecord) : [];
  const authorities: string[] = [];
  for (const grantId of grantIds) {
    const grant = rows.find(entry => entry.grantId === grantId);
    if (!grant || typeof grant.actorRef !== 'string' || !grant.actorRef) continue;
    authorities.push(`${definition.moduleName}:${grant.actorRef}`);
  }
  return authorities;
}

async function writeBffHome(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeCaseHome(dir, String(PROJECT), MODULE);
}

async function publishProofRoutes(): Promise<void> {
  await publishRoutes(String(PROJECT), MODULE);
}

async function report(
  host: ReturnType<typeof createDiskHost>,
  catalogRef: string,
  definition: M1Definition,
  observations: readonly M1Observation[],
): Promise<M1Checkpoint> {
  const handler = handlerFor(definition.artifactType, 'implement');
  if (!handler) throw new Error(definition.artifactType);
  const now = new Date().toISOString();
  return verifyBatch({
    handler,
    io: host.io,
    catalogRef,
    artifactId: definition.artifactId,
    observations,
    runId: 'm1-06',
    commit: 'proof',
    startedAt: now,
    finishedAt: now,
    monitorError: null,
  });
}

async function loadDefinition(host: ReturnType<typeof createDiskHost>, defPath: string): Promise<M1Definition> {
  const text = await host.io.read(defPath);
  if (!text) throw new Error(`Unreadable ${defPath}`);
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) throw new Error(parsed.issues.join('; '));
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) throw new Error(`${defPath} ${definition.issues.join('; ')}`);
  return definition;
}

async function writeCatalog(sandboxProject: string, catalogRef: string, flows: readonly string[]): Promise<void> {
  const parsed = parseCatalog(await readFile(CATALOG_FIXTURE, 'utf8'));
  if (!parsed.catalog) throw new Error(parsed.issues.join('; '));
  const pages = new Set(flows);
  const routes = routesByArtifact(sandboxProject);
  for (const [artifactId, declared] of routes) {
    routes.set(artifactId, declared.filter(route => pages.has(route.split('.')[1] ?? '')));
  }
  for (const scenario of parsed.catalog.scenarios) {
    const declared = routes.get(scenario.artifactId) ?? [];
    if (declared.length === 0) continue;
    scenario.cases = scenario.cases.filter(item => !item.routine || declared.includes(item.routine));
    for (const route of declared) {
      if (scenario.cases.some(item => item.routine === route)) continue;
      const tail = route.split('.').slice(1).join('.');
      scenario.cases.push({
        caseId: `${scenario.artifactId}.access.${tail}`,
        gate: 'business',
        mandatory: true,
        source: 'grant path',
        expectation: 'The route follows the grant. A missing scope path stays blocked and does not certify the unit.',
        preconditions: ['actor from the session'],
        synthetic: [],
        actorId: 'professional-1',
        routine: route,
        mutating: textOf(scenario.artifactId).startsWith('registrar'),
        expect: { ok: true, status: 200, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
        expectedFailure: {
          caseId: `${scenario.artifactId}.access.${tail}`,
          stage: 'structure',
          errorCode: 'USECASE_NOT_IMPLEMENTED',
          status: 501,
        },
      });
    }
  }
  const match = /^_\d+_\/(.+)$/.exec(catalogRef);
  if (!match) throw new Error(catalogRef);
  const full = join(sandboxProject, match[1]);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, renderMonitorCatalog(parsed.catalog, catalogRef));
}

function compileSlice(sandboxProject: string, slice: readonly string[]): string {
  return compileFiles(REPO_ROOT, sandboxProject, String(PROJECT), slice);
}

function materialize(stage: string, flow: string, sandboxParent: string): SpawnResult {
  const tsx = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
  const hook = join(REPO_ROOT, 'test/register-hooks.mjs');
  const cli = join(HERE, 'nodejsMaterializeL1.ts');
  const argv = [tsx, '--import', hook, cli, '--project', String(PROJECT), '--module', MODULE, '--stage', stage, '--source-root', sandboxParent, '--output', sandboxParent];
  if (flow) argv.push('--flow', flow);
  const result = spawnSync(argv[0], argv.slice(1), { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', argv };
}

function parseArgs(argv: readonly string[]): ProofArgs {
  const values = new Map<string, string>();
  const flows: string[] = [];
  const only: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token.startsWith('--') || !value || value.startsWith('--')) throw new Error(`Missing value for ${token}.`);
    if (token === '--flow') flows.push(value);
    else if (token === '--only') only.push(...value.split(',').map(item => item.trim()).filter(Boolean));
    else values.set(token, value);
    index += 1;
  }
  const evidence = values.get('--evidence') ?? '';
  const defs = values.get('--defs') ?? '';
  const repo = values.get('--repo') ?? '';
  const inject = values.get('--inject') ?? '';
  if (!evidence || !defs || !repo) throw new Error('Pass --evidence, --defs and --repo.');
  if (inject && !INJECT.includes(inject as typeof INJECT[number])) throw new Error('Inject must be disable-rules.');
  return { evidence, defs, repo, inject: inject as InjectMode, flows: flows.length > 0 ? flows : [FLOW], only };
}

async function importSandbox(sandboxProject: string, ref: string): Promise<{ module: SandboxModule } | { error: string }> {
  try {
    return { module: await import(pathToFileURL(diskOf(sandboxProject, ref)).href) as SandboxModule };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

let runtimeReady = false;
function installRuntime(sandboxProject: string): void {
  if (runtimeReady) return;
  runtimeReady = true;
  const runtime = Module as unknown as { _resolveFilename: (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) => string };
  const original = runtime._resolveFilename;
  const prefix = `/_${PROJECT}_/l1/${MODULE}/`;
  runtime._resolveFilename = function (this: unknown, request: string, parent: unknown, isMain: boolean, options?: unknown) {
    if (request.startsWith(prefix)) {
      const rel = request.slice(`/_${PROJECT}_/`.length).replace(/\.js$/, '.ts');
      const candidate = join(sandboxProject, rel);
      if (existsSync(candidate)) return candidate;
    }
    return original.call(this, request, parent, isMain, options);
  };
}

function observation(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: patch.durationMs ?? 0,
    broken: patch.broken ?? 'none',
    thrown: patch.thrown ?? false,
    skipped: false,
    inconclusive: false,
    blocked: patch.blocked ?? false,
    blockOwner: patch.blockOwner ?? '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: patch.ruleId ?? null,
    fields: patch.fields ?? [],
    rowActorIds: patch.rowActorIds ?? [],
    reason: patch.reason ?? '',
  };
}

async function thrownOutcome(error: unknown): Promise<Partial<M1Observation>> {
  const imported = await import('/_102034_/l1/server/layer_2_controllers/contracts.js') as {
    AppError: new (...args: never[]) => Error & { code: string; statusCode: number; details?: unknown };
  };
  if (error instanceof imported.AppError) {
    const details = error.details;
    const ruleId = isRecord(details) && typeof details.ruleId === 'string' ? details.ruleId : null;
    return { ok: false, status: error.statusCode, errorCode: error.code, ruleId, reason: error.message };
  }
  return { thrown: true, ok: false, status: 500, errorCode: 'INTERNAL_ERROR', reason: error instanceof Error ? error.message : String(error) };
}

function fieldNames(data: unknown): string[] {
  if (Array.isArray(data)) return [...new Set(data.flatMap(item => fieldNames(item)))];
  if (!isRecord(data)) return [];
  const names = Object.keys(data);
  if (isRecord(data.details)) names.push(...Object.keys(data.details));
  return names;
}

function outputOf(ref: string): string { return ref.replace(/\.defs\.ts$/, '.ts'); }
function relOf(ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(outputOf(ref));
  if (!match) throw new Error(ref);
  return match[1];
}
async function readSandbox(sandboxProject: string, ref: string): Promise<string | null> {
  try {
    return await readFile(diskOf(sandboxProject, ref), 'utf8');
  } catch {
    return null;
  }
}
async function readDefinitionFile(sandboxProject: string, ref: string): Promise<M1Definition | null> {
  const text = await readSandbox(sandboxProject, ref);
  if (!text) return null;
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) return null;
  const definition = readDefinition(parsed.definition);
  return 'issues' in definition ? null : definition;
}
function contractOf(definition: M1Definition, routine: string): { path: string; inputType: string } | null {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const refs = fn && Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
  const match = refs.find(item => item.route === routine && String(item.symbol ?? '').endsWith('Output'))
    ?? refs.find(item => String(item.symbol ?? '').endsWith('Output'));
  if (!match) return null;
  const symbol = String(match.symbol ?? '');
  const route = String(match.route ?? '');
  const projections = Array.isArray(definition.data.routeProjections) ? definition.data.routeProjections.filter(isRecord) : [];
  const projection = projections.find(item => item.route === route);
  const contractPath = projection && typeof projection.contractPath === 'string' ? projection.contractPath : '';
  const path = definition.dependencies.find(item => contractPath && (item === contractPath || item.endsWith(`/${contractPath}`)))
    ?? definition.dependencies.find(item => route.split('.')[1] && item.endsWith(`/${route.split('.')[1]}.defs.ts`))
    ?? '';
  return path ? { path, inputType: symbol.replace(/Output$/, 'Input') } : null;
}
function inputTypes(definition: M1Definition): Map<string, string> {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : null;
  const inputs = fn && Array.isArray(fn.input) ? fn.input.filter(isRecord) : [];
  return new Map(inputs.map(field => [String(field.name ?? ''), String(field.type ?? '')]));
}
function assignPath(record: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean);
  let node = record;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      node[part] = value;
      return;
    }
    const next = isRecord(node[part]) ? node[part] : {};
    node[part] = next;
    node = next;
  });
}
function diskOf(sandboxProject: string, ref: string): string {
  const match = /^_\d+_\/(.+)$/.exec(ref);
  if (!match) throw new Error(ref);
  return join(sandboxProject, match[1]);
}
function spawn(command: string, args: readonly string[], input?: Buffer): SpawnResult & { stdoutRaw: Buffer } {
  const result = spawnSync(command, args, { input, cwd: REPO_ROOT, maxBuffer: 256 * 1024 * 1024 });
  const stdoutRaw = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? '');
  const stderrRaw = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? '');
  return { code: result.status ?? 1, stdout: stdoutRaw.toString('utf8'), stderr: stderrRaw.toString('utf8'), argv: [command, ...args], stdoutRaw };
}
function porcelain(repo: string): string { return spawn('git', ['-C', repo, 'status', '--porcelain']).stdout; }
function isInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  if (rel === '') return true;
  if (isAbsolute(rel)) return false;
  return rel !== '..' && !rel.startsWith(`..${sep}`);
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
