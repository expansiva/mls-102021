/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_DOMAIN_VERSION, type D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import type { D1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildUsecaseContexts, capabilityNames, loadVerifiedSources, namespaceOf, ontologyTransitions, platformFieldPaths } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { D1_PERSISTENCE_VERSION, type D1PersistenceBuild } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import type { D1AttemptTrace } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import {
  D1_USECASE_VERSION,
  type D1PromptEvidence,
  type D1UsecaseBuild,
  type D1UsecaseEntity,
  type D1UsecaseItem,
  type D1UsecasePlanInput,
  type D1UsecaseProblem,
  type D1UsecaseRequest,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

export interface D1UsecaseWork {
  schemaVersion: typeof D1_USECASE_VERSION;
  repairs: number;
  request: D1UsecaseRequest;
}

export async function loadD1UsecaseWork(project: number, moduleName: string): Promise<{ refusal: string } | { work: D1UsecaseWork }> {
  const snapshot = await readD1Input(project, moduleName);
  if (!snapshot) return { refusal: 'input.json is missing or does not belong to this project. usecases50 wrote nothing.' };
  if (!snapshot.consumersReleased) return { refusal: 'Consumer phases are not released. usecases50 wrote nothing.' };
  const domain = await readDraft(project, moduleName, 'domain30', D1_DOMAIN_VERSION);
  if ('refusal' in domain) return domain;
  const persistence = await readDraft(project, moduleName, 'persistence40', D1_PERSISTENCE_VERSION);
  if ('refusal' in persistence) return persistence;
  const domainBuild = domain.build as D1DomainBuild;
  const persistenceBuild = persistence.build as D1PersistenceBuild;
  if (domainBuild.project !== project || domainBuild.moduleName !== moduleName) {
    return { refusal: 'domain30 draft does not belong to this project. usecases50 wrote nothing.' };
  }
  if (persistenceBuild.project !== project || persistenceBuild.moduleName !== moduleName) {
    return { refusal: 'persistence40 draft does not belong to this project. usecases50 wrote nothing.' };
  }
  const request = await usecaseRequest(project, moduleName, snapshot, domainBuild, persistenceBuild);
  return { work: { schemaVersion: D1_USECASE_VERSION, repairs: 0, request } };
}

export async function readD1UsecaseWork(project: number, moduleName: string): Promise<D1UsecaseWork | null> {
  const text = await readText(workFile(project, moduleName));
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isWork(parsed) || parsed.request.project !== project || parsed.request.moduleName !== moduleName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeD1UsecaseWork(project: number, work: D1UsecaseWork): Promise<void> {
  await writeJson(workFile(project, work.request.moduleName), work);
}

export function workFile(project: number, moduleName: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1/drafts`,
    shortName: 'usecases50-work',
    extension: '.json',
  };
}

export function attemptFile(project: number, moduleName: string, usecaseId: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1/traces`,
    shortName: `usecases50-${usecaseId}`,
    extension: '.json',
  };
}

export async function writeAttempt(project: number, moduleName: string, attempt: D1AttemptTrace): Promise<void> {
  await writeJson(attemptFile(project, moduleName, attempt.usecaseId), attempt);
}

/** The assembled prompt, written before the model replies. Not an attempt: it has no status. */
export async function writePromptEvidence(project: number, moduleName: string, evidence: D1PromptEvidence): Promise<void> {
  await writeJson(attemptFile(project, moduleName, evidence.usecaseId), { usecaseId: evidence.usecaseId, request: evidence });
}

/** A source finding already closed this worker. A later empty reply must not replace it. */
export async function sourceBlockTrace(project: number, moduleName: string, usecaseId: string): Promise<string | null> {
  const text = await readText(attemptFile(project, moduleName, usecaseId));
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isAttempt(parsed) || parsed.status !== 'operational') return null;
    if (!parsed.trace.includes('was not sent to the model')) return null;
    return parsed.trace;
  } catch {
    return null;
  }
}

export async function readPromptEvidence(project: number, moduleName: string, usecaseId: string): Promise<D1PromptEvidence | null> {
  const text = await readText(attemptFile(project, moduleName, usecaseId));
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.request)) return null;
    const request = parsed.request;
    if (request.usecaseId !== usecaseId || typeof request.text !== 'string' || typeof request.sha256 !== 'string') return null;
    if (typeof request.bytes !== 'number' || !Array.isArray(request.sourceHashes)) return null;
    return request as unknown as D1PromptEvidence;
  } catch {
    return null;
  }
}

export async function readAttempts(project: number, moduleName: string, usecaseIds: readonly string[]): Promise<D1AttemptTrace[]> {
  const out: D1AttemptTrace[] = [];
  for (const usecaseId of usecaseIds) {
    const text = await readText(attemptFile(project, moduleName, usecaseId));
    if (!text) continue;
    try {
      const parsed = JSON.parse(text) as unknown;
      if (isAttempt(parsed) && parsed.usecaseId === usecaseId) out.push(parsed);
    } catch {
      /* a broken trace is the same as a missing one */
    }
  }
  return out;
}

export async function commitD1Usecases(project: number, build: D1UsecaseBuild): Promise<{ written: string[]; issues: string[] }> {
  const draftInfo = draftFile(project, build.moduleName, 'usecases50');
  const draftText = `${JSON.stringify(build, null, 2)}\n`;
  const currentDraft = await readText(draftInfo);
  if (currentDraft !== draftText) await writeJson(draftInfo, build);
  if (build.emit.length === 0) {
    if (!build.ok) return { written: [], issues: build.problems.filter(problem => problem.severity === 'error').map(problem => problem.message) };
    return { written: [], issues: [] };
  }
  const rendered = renderParts(project, build.emit);
  if (rendered.issues.length > 0) return { written: [], issues: rendered.issues };
  const committed = await commitD1Unit({
    project,
    moduleName: build.moduleName,
    step: 'usecases50',
    unitId: 'usecases50',
    draftText,
    parts: rendered.parts,
  });
  return { written: committed.written, issues: committed.issues };
}

function renderParts(
  project: number,
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: { defPath: string; outputPath: string }[] }[],
): { parts: D1UnitPart[]; issues: string[] } {
  const parts: D1UnitPart[] = [];
  const issues: string[] = [];
  for (const part of emit) {
    const rendered = renderDefinition(part.definition, part.pipeline[0]?.defPath || '');
    if ('issues' in rendered) {
      issues.push(...rendered.issues);
      continue;
    }
    const defPath = part.pipeline[0]?.defPath || '';
    if (!artifactFile(project, defPath)) {
      issues.push(`defPath is not a file this agent can write: ${defPath}.`);
      continue;
    }
    parts.push({ defPath, source: rendered.source, outputTs: [part.pipeline[0]?.outputPath || ''].filter(Boolean) });
  }
  return { parts, issues };
}

export function plansFromAttempts(attempts: readonly D1AttemptTrace[]): D1UsecasePlanInput[] {
  return attempts.map(attempt => ({
    usecaseId: attempt.usecaseId,
    steps: attempt.status === 'parsed' && Array.isArray(attempt.reply) ? attempt.reply as D1UsecasePlanInput['steps'] : [],
    operational: attempt.status === 'operational',
    trace: attempt.trace,
  }));
}

export function buildFromWork(work: D1UsecaseWork, attempts: readonly D1AttemptTrace[], llmCalls: number): D1UsecaseBuild {
  return buildD1Usecases({ ...work.request, plans: plansFromAttempts(attempts), llmCalls });
}

/**
 * Defs of units that parsed stay. Each identified unit is one error on its
 * usecase id and has no definition. `ok` stays false.
 */
export function holdUnresolvedBuild(
  work: D1UsecaseWork,
  attempts: readonly D1AttemptTrace[],
  identified: readonly { usecaseId: string; code: string; trace: string }[],
  llmCalls: number,
): D1UsecaseBuild {
  const blocked = new Set(identified.map(item => item.usecaseId));
  const good = buildD1Usecases({
    ...work.request,
    usecases: work.request.usecases.filter(usecase => !blocked.has(usecase.usecaseId)),
    plans: plansFromAttempts(attempts.filter(item => item.status === 'parsed' && !blocked.has(item.usecaseId))),
    llmCalls,
  });
  const unresolved: D1UsecaseItem[] = work.request.usecases.filter(usecase => blocked.has(usecase.usecaseId)).map(usecase => ({
    usecaseId: usecase.usecaseId,
    entityId: usecase.entity,
    operation: usecase.operation,
    defPath: usecase.defPath,
    routes: [...usecase.routes],
    trustedContext: 'ctx',
    mdm: null,
    transactionBoundary: null,
    steps: [],
    definition: null,
  }));
  const problems: D1UsecaseProblem[] = [
    ...good.problems.filter(problem => !blocked.has(problem.path)),
    ...identified.map(item => ({
      severity: 'error' as const,
      code: item.code,
      path: item.usecaseId,
      message: `Usecase ${item.usecaseId} is unresolved. ${item.trace}`.replace(/\s+/g, ' ').trim(),
    })),
  ];
  problems.sort((left, right) => problemKey(left).localeCompare(problemKey(right)));
  const usecases = [...good.usecases, ...unresolved].sort((left, right) => left.usecaseId.localeCompare(right.usecaseId));
  return {
    ...good,
    llmCalls,
    ok: false,
    usecases,
    problems,
    emit: good.ok ? good.emit : [],
  };
}

function problemKey(problem: D1UsecaseProblem): string {
  return `${problem.path}\u0000${problem.code}\u0000${problem.message}`;
}

async function usecaseRequest(
  project: number,
  moduleName: string,
  snapshot: D1InputSnapshot,
  domain: D1DomainBuild,
  persistence: D1PersistenceBuild,
): Promise<D1UsecaseRequest> {
  const entityIds = [...new Set([
    ...domain.entities.map(entity => entity.entityId),
    ...snapshot.selection.entities,
  ])];
  const bundle = await loadVerifiedSources(project, moduleName, snapshot, entityIds);
  const entities: D1UsecaseEntity[] = domain.entities.map(plan => entityView(plan, bundle.bodies[plan.entityId] ?? null));
  const usecases = snapshot.selection.usecases.map(usecase => ({
    usecaseId: usecase.usecaseId,
    entity: usecase.entity,
    operation: usecase.operation,
    routes: [...usecase.routes],
    defPath: snapshot.files.find(file => file.artifactType === 'usecase' && file.identity === usecase.usecaseId)?.defPath
      || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
  }));
  const routes = snapshot.selection.routes.map(route => ({
    route: route.route,
    page: route.page,
    kind: route.kind,
    usecaseRef: route.usecaseRef,
  }));
  const ports = persistence.ports.map(port => ({
    portId: port.portId,
    entityId: port.entityId,
    defPath: port.defPath,
    methods: port.methods.map(method => method.name),
    signatures: port.methods.map(method => ({
      name: method.name,
      params: [...method.params],
      returns: method.returns,
    })),
  }));
  const contexts = buildUsecaseContexts({ moduleName, usecases, routes, entities, ports, bundle });
  return {
    project,
    moduleName,
    usecases,
    routes,
    ports,
    entities,
    moduleRules: bundle.moduleRuleText ? Object.keys(bundle.moduleRuleText).sort() : [],
    outbound: bundle.outbound,
    contracts: bundle.contracts,
    contexts,
    sourceFindings: bundle.findings,
    sourceHashes: bundle.hashes,
    files: bundle.files,
    plans: [],
    llmCalls: 0,
  };
}

function entityView(plan: D1DomainBuild['entities'][number], body: unknown | null): D1UsecaseEntity {
  const data = plan.definition && isRecord(plan.definition.data) ? plan.definition.data : {};
  const fields = Array.isArray(data.fields) ? data.fields.flatMap(field => {
    if (!isRecord(field) || typeof field.name !== 'string' || typeof field.type !== 'string') return [];
    return [{ name: field.name, type: field.type, derived: field.derived === true }];
  }) : [];
  const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : {};
  const fromSource = ontologyTransitions(body);
  const transitions = Array.isArray(lifecycle.transitions) ? lifecycle.transitions.flatMap(item => {
    if (!isRecord(item) || typeof item.transitionId !== 'string') return [];
    const source = fromSource.find(entry => entry.transitionId === item.transitionId);
    return [{
      transitionId: item.transitionId,
      from: source?.from.length ? source.from : stringList(item.from),
      to: source?.to || (typeof item.to === 'string' ? item.to : ''),
      by: source?.by.length ? source.by : stringList(item.by),
      ruleRefs: source?.ruleRefs.length ? source.ruleRefs : stringList(item.ruleRefs),
      payload: source?.payload || [],
      description: source?.description || '',
    }];
  }) : [];
  return {
    entityId: plan.entityId,
    storageTarget: plan.storageTarget,
    defPath: plan.defPath,
    namespace: namespaceOf(body),
    fields,
    transitions,
    rules: (plan.rules || []).map(rule => ({ ruleId: rule.ruleId, owner: rule.owner, source: rule.source })),
    uniqueKeys: plan.uniqueKeys.map(key => [...key]),
    enumerations: (plan.enumerations || []).map(item => ({ path: item.path, values: [...item.values] })),
    capabilities: capabilityNames(body),
    platformFields: platformFieldPaths(body),
  };
}

async function readDraft(
  project: number,
  moduleName: string,
  step: 'domain30' | 'persistence40',
  version: string,
): Promise<{ refusal: string } | { build: unknown }> {
  const text = await readText(draftFile(project, moduleName, step));
  if (!text) return { refusal: `${step} draft is missing. usecases50 wrote nothing.` };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed) || parsed.schemaVersion !== version) {
      return { refusal: `${step} draft did not parse. usecases50 wrote nothing.` };
    }
    return { build: parsed };
  } catch {
    return { refusal: `${step} draft did not parse. usecases50 wrote nothing.` };
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function isWork(value: unknown): value is D1UsecaseWork {
  return isRecord(value) && isRecord(value.request) && typeof value.request.project === 'number' && Array.isArray(value.request.usecases);
}

function isAttempt(value: unknown): value is D1AttemptTrace {
  return isRecord(value)
    && typeof value.usecaseId === 'string'
    && (value.status === 'parsed' || value.status === 'repairable' || value.status === 'operational')
    && typeof value.trace === 'string';
}
