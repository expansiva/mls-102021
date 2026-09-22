/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/io.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { draftFile, type D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, type D1UnitPart } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { readText, writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { artifactFile, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_DOMAIN_VERSION, type D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { contractPath, entityPath, isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, readD1Input } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { D1_PERSISTENCE_VERSION, type D1PersistenceBuild } from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';
import type { D1AttemptTrace } from '/_102021_/l2/agentDefsL1/steps/usecases50/dispatch.js';
import { buildD1Usecases } from '/_102021_/l2/agentDefsL1/steps/usecases50/gate.js';
import {
  D1_USECASE_VERSION,
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
  emit: readonly { definition: Parameters<typeof renderDefinition>[0]; pipeline: Parameters<typeof renderDefinition>[1] }[],
): { parts: D1UnitPart[]; issues: string[] } {
  const parts: D1UnitPart[] = [];
  const issues: string[] = [];
  for (const part of emit) {
    const rendered = renderDefinition(part.definition, part.pipeline);
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
  snapshot: {
    selection: {
      routes: Array<{ route: string; page: string; kind: string; usecaseRef: string }>;
      usecases: Array<{ usecaseId: string; entity: string; operation: string; routes: string[] }>;
      pages: Array<{ pageId: string }>;
    };
    files: Array<{ artifactType: string; identity: string; defPath: string }>;
  },
  domain: D1DomainBuild,
  persistence: D1PersistenceBuild,
): Promise<D1UsecaseRequest> {
  const entities: D1UsecaseEntity[] = [];
  for (const plan of domain.entities) {
    entities.push(await entityView(project, moduleName, plan));
  }
  const rulesText = await readLogical(project, `l4/${moduleName}/rules.defs.ts`);
  const integrationText = await readLogical(project, `l4/${moduleName}/integration.defs.ts`);
  const rules = rulesText ? parseD1Source(rulesText, 'defs') : null;
  const integration = integrationText ? parseD1Source(integrationText, 'defs') : null;
  const moduleRules = isRecord(rules) && isRecord(rules.rules) ? Object.keys(rules.rules) : [];
  const outbound = outboundOf(integration);
  const pages = new Set(snapshot.selection.pages.map(page => page.pageId));
  for (const route of snapshot.selection.routes) pages.add(route.page);
  const contracts = [];
  for (const pageId of [...pages].sort()) {
    if (!isSafeToken(pageId)) continue;
    const path = contractPath(moduleName, pageId);
    const source = await readLogical(project, path);
    contracts.push({ pageId, path, source: source || '' });
  }
  const fileByIdentity = new Map(snapshot.files.filter(file => file.artifactType === 'usecase').map(file => [file.identity, file.defPath]));
  return {
    project,
    moduleName,
    usecases: snapshot.selection.usecases.map(usecase => ({
      usecaseId: usecase.usecaseId,
      entity: usecase.entity,
      operation: usecase.operation,
      routes: [...usecase.routes],
      defPath: fileByIdentity.get(usecase.usecaseId) || `l1/${moduleName}/layer_2_application/usecases/${usecase.usecaseId}.defs.ts`,
    })),
    routes: snapshot.selection.routes.map(route => ({
      route: route.route,
      page: route.page,
      kind: route.kind,
      usecaseRef: route.usecaseRef,
    })),
    ports: persistence.ports.map(port => ({
      portId: port.portId,
      entityId: port.entityId,
      defPath: port.defPath,
      methods: port.methods.map(method => method.name),
    })),
    entities,
    moduleRules,
    outbound,
    contracts,
    plans: [],
    llmCalls: 0,
  };
}

async function entityView(
  project: number,
  moduleName: string,
  plan: D1DomainBuild['entities'][number],
): Promise<D1UsecaseEntity> {
  const data = plan.definition && isRecord(plan.definition.data) ? plan.definition.data : {};
  const fields = Array.isArray(data.fields) ? data.fields.flatMap(field => {
    if (!isRecord(field) || typeof field.name !== 'string' || typeof field.type !== 'string') return [];
    return [{ name: field.name, type: field.type, derived: field.derived === true }];
  }) : [];
  const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : {};
  const transitions = Array.isArray(lifecycle.transitions) ? lifecycle.transitions.flatMap(item => {
    if (!isRecord(item) || typeof item.transitionId !== 'string') return [];
    return [{
      transitionId: item.transitionId,
      from: stringList(item.from),
      to: typeof item.to === 'string' ? item.to : '',
      by: stringList(item.by),
      ruleRefs: stringList(item.ruleRefs),
    }];
  }) : [];
  const bodyText = await readLogical(project, entityPath(moduleName, plan.entityId));
  const body = bodyText ? parseD1Source(bodyText, 'defs') : null;
  const roleTag = isRecord(body) && typeof body.roleTag === 'string' ? body.roleTag : '';
  const namespace = roleTag.includes('.') ? roleTag.slice(0, roleTag.indexOf('.')) : roleTag;
  return {
    entityId: plan.entityId,
    storageTarget: plan.storageTarget,
    defPath: plan.defPath,
    namespace,
    fields,
    transitions,
    rules: (plan.rules || []).map(rule => ({ ruleId: rule.ruleId, owner: rule.owner })),
    enumerations: (plan.enumerations || []).map(item => ({ path: item.path, values: [...item.values] })),
  };
}

function outboundOf(value: unknown): D1UsecaseRequest['outbound'] {
  if (!isRecord(value) || !Array.isArray(value.outbound)) return [];
  const out: D1UsecaseRequest['outbound'] = [];
  for (const item of value.outbound) {
    if (!isRecord(item)) continue;
    const eventId = typeof item.event === 'string' ? item.event : typeof item.eventId === 'string' ? item.eventId : '';
    const on = typeof item.on === 'string' ? item.on : '';
    if (eventId && on) out.push({ eventId, on });
  }
  return out;
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

async function readLogical(project: number, logicalPath: string): Promise<string | null> {
  const info = artifactFile(project, qualifyDefPath(project, logicalPath));
  if (!info) return null;
  return readText(info);
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
