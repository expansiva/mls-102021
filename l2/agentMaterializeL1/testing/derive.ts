/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/derive.ts" enhancement="_blank"/>

/**
 * Technical scenario catalog derived from validated defs. No model and no
 * reading of generated TypeScript to invent an oracle. A local rulePlan row
 * is an obligation, not a test.
 */

import {
  isRecord,
  outputPathFromDefPath,
  readDefinition,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { PlannedUnit, PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import {
  M1_CATALOG_SCHEMA_V11,
  M1_EXISTING_RECORD,
  M1_STUB_ERROR,
  M1_STUB_STATUS,
  canonicalJson,
  testFileFor,
  type M1Scenario,
  type M1ScenarioCase,
  type M1ScenarioCatalog,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  M1_OBLIGATION_BLOCKER,
  M1_OBLIGATION_OWNER,
  routeObligations,
  type M1Obligation,
} from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import { readFixturePlan } from '/_102021_/l2/agentMaterializeL1/contracts/fixture.js';
import { classifyObligation, fixtureModel, runtimeGap, type M1FixtureModel } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';

export const M1_CATALOG_RECIPE = '2026-09-27-m1-catalog-derive-v5' as const;

const STRUCTURE_COMPILE = new Set([
  'domainEntity',
  'valueObject',
  'repositoryPort',
  'usecase',
  'httpController',
  'accessScope',
  'authorityMap',
]);

export interface CatalogGap {
  artifactId: string;
  artifactType: string;
  origin: string;
  reason: string;
}

export interface DerivedCatalog {
  catalog: M1ScenarioCatalog;
  gaps: CatalogGap[];
  /** Authenticated route cases, declared with their blocker. Not in the catalog and not executed. */
  obligations: M1Obligation[];
  recipeVersion: typeof M1_CATALOG_RECIPE;
}

/**
 * A unit that will not write its `.ts` is a gap, not an executable scenario.
 * A unit whose output was already promoted (`promoted`, from its receipt) keeps its scenarios
 * even when it is blocked now: its output and its test are on disk and read the catalog (m1_32).
 */
export function catalogWithheld(
  units: readonly PlannedUnit[],
  boundHandlers: ReadonlySet<string>,
  promoted: ReadonlySet<string> = new Set(),
): Map<string, string> {
  const withheld = new Map<string, string>();
  for (const unit of units) {
    if (promoted.has(unit.defPath)) continue;
    const action = unit.action === 'blocked' && unit.heldAction ? unit.heldAction : unit.action;
    if (action === 'reuse' || action === 'verify') continue;
    if (unit.action === 'blocked' && unit.reason.startsWith('STATUS_FAILED')) continue;
    if (action === 'generate') {
      if (unit.handlerId && boundHandlers.has(unit.handlerId)) continue;
      const handler = unit.handlerId || unit.artifactType || 'unknown';
      withheld.set(unit.defPath, `HANDLER_UNBOUND: ${handler} has no executor.`);
      continue;
    }
    withheld.set(unit.defPath, unit.reason || unit.action);
  }
  return withheld;
}

export function deriveCatalog(
  moduleName: string,
  units: readonly PlanUnitInput[],
  texts: Readonly<Record<string, string>>,
  withheld: ReadonlyMap<string, string> = new Map(),
): DerivedCatalog {
  const defs = new Map<string, M1Definition>();
  for (const unit of units) {
    const parsed = readDefinition(unit.definition);
    if ('issues' in parsed || parsed.moduleName !== moduleName) continue;
    defs.set(unit.defPath, parsed);
  }
  const gaps: CatalogGap[] = [];
  const obligations: M1Obligation[] = [];
  const scenarios: M1Scenario[] = [];
  const ordered = [...defs.entries()].sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0);
  for (const [defPath, definition] of ordered) {
    const held = withheld.get(defPath);
    if (held) {
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: definition.artifactType,
        origin: defPath,
        reason: held,
      });
      continue;
    }
    const handler = handlerFor(definition.artifactType, 'structure');
    if (!handler) continue;
    const productionFile = outputPathFromDefPath(defPath);
    if (!productionFile) continue;
    const cases = casesFor(definition, defPath, defs, texts, gaps, obligations);
    if (cases.length === 0) continue;
    cases.sort((left, right) => left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0);
    scenarios.push({
      scenarioId: definition.artifactId,
      source: defPath,
      artifactType: definition.artifactType,
      artifactId: definition.artifactId,
      handlerId: handler.id,
      productionFile,
      testFile: testFileFor(productionFile),
      cases,
    });
  }
  scenarios.sort((left, right) => left.scenarioId < right.scenarioId ? -1 : left.scenarioId > right.scenarioId ? 1 : 0);
  gaps.sort((left, right) => canonicalJson(left) < canonicalJson(right) ? -1 : canonicalJson(left) > canonicalJson(right) ? 1 : 0);
  return {
    catalog: { schemaVersion: M1_CATALOG_SCHEMA_V11, moduleName, store: 'memory', scenarios },
    gaps,
    obligations: obligations.sort((left, right) => left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0),
    recipeVersion: M1_CATALOG_RECIPE,
  };
}

function casesFor(
  definition: M1Definition,
  defPath: string,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
  gaps: CatalogGap[],
  obligations: M1Obligation[],
): M1ScenarioCase[] {
  const cases: M1ScenarioCase[] = [];
  if (STRUCTURE_COMPILE.has(definition.artifactType)) {
    cases.push(compileCase(definition));
  }
  if (definition.artifactType === 'usecase') {
    cases.push(...usecaseCases(definition, defPath));
    noteRuleGaps(definition, defPath, gaps);
  }
  if (definition.artifactType === 'httpController') {
    cases.push(...routeCases(definition, defPath, defs, texts, gaps, obligations));
  }
  return cases;
}

function compileCase(definition: M1Definition): M1ScenarioCase {
  return base(definition, {
    caseId: `${definition.artifactId}.compile`,
    gate: 'compile',
    source: `${definition.artifactType} structure`,
    expectation: 'The emitted file imports. A broken import is a failure, not an expected red.',
    preconditions: [],
    actorId: '',
    routine: '',
    mutating: false,
    expect: { ok: true, status: 0, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
    expectedFailure: null,
    runner: 'module',
  });
}

const RECORD_OPERATIONS = new Set(['update', 'transition', 'get', 'read']);

function needsStoredRecord(definition: M1Definition): boolean {
  const operation = typeof definition.data.operation === 'string' ? definition.data.operation : '';
  if (!RECORD_OPERATIONS.has(operation)) return false;
  if (operation === 'get' || operation === 'read') return selectorPath(definition) !== '';
  return true;
}

function selectorPath(definition: M1Definition): string {
  if (!Array.isArray(definition.data.uses)) return '';
  const found = definition.data.uses.find(item => isRecord(item) && item.role === 'selector' && item.source === 'input');
  return isRecord(found) && typeof found.path === 'string' ? found.path : '';
}

function usecaseCases(definition: M1Definition, defPath: string): M1ScenarioCase[] {
  const positive = stubCase(definition, defPath);
  if (!needsStoredRecord(definition)) return [positive];
  positive.preconditions = [...positive.preconditions, M1_EXISTING_RECORD];
  const negative = base(definition, {
    caseId: `${definition.artifactId}.missingRecord`,
    gate: 'business',
    source: `${defPath}#operation`,
    expectation: 'An id that is not stored is NOT_FOUND. This is not the positive case.',
    preconditions: ['memory store', 'no database'],
    actorId: '',
    routine: '',
    mutating: false,
    expect: { ok: false, status: 404, errorCode: 'NOT_FOUND', ruleId: null, forbiddenFields: [], isolatedActorField: null },
    runner: 'module',
    expectedFailure: {
      caseId: `${definition.artifactId}.missingRecord`,
      stage: 'structure',
      errorCode: M1_STUB_ERROR,
      status: M1_STUB_STATUS,
    },
  });
  return [positive, negative];
}

function stubCase(definition: M1Definition, defPath: string): M1ScenarioCase {
  return base(definition, {
    caseId: `${definition.artifactId}.reachesStub`,
    gate: 'business',
    source: `${defPath}#operation`,
    expectation: 'A valid call reaches the structure stub. Import, auth and database errors are not this red.',
    preconditions: ['memory store', 'no database'],
    actorId: '',
    routine: '',
    mutating: false,
    expect: { ok: true, status: 200, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
    runner: 'module',
    expectedFailure: {
      caseId: `${definition.artifactId}.reachesStub`,
      stage: 'structure',
      errorCode: M1_STUB_ERROR,
      status: M1_STUB_STATUS,
    },
  });
}

function noteRuleGaps(definition: M1Definition, defPath: string, gaps: CatalogGap[]): void {
  const plan = Array.isArray(definition.data.rulePlan) ? definition.data.rulePlan : [];
  for (const row of plan) {
    if (!isRecord(row)) continue;
    const enforcement = String(row.enforcement ?? '');
    const origin = String(row.origin ?? defPath);
    if (enforcement === 'local') {
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: definition.artifactType,
        origin,
        reason: 'local rulePlan row is an obligation, not an oracle',
      });
      continue;
    }
    if (enforcement === 'pending' || String(row.gap ?? '')) {
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: definition.artifactType,
        origin,
        reason: String(row.gap || 'pending rule has no decidable oracle'),
      });
    }
  }
}

function routeCases(
  definition: M1Definition,
  defPath: string,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
  gaps: CatalogGap[],
  obligations: M1Obligation[],
): M1ScenarioCase[] {
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers.filter(isRecord) : [];
  const cases: M1ScenarioCase[] = [];
  const routes = handlers
    .map(item => ({
      route: typeof item.route === 'string' ? item.route : '',
      usecaseId: typeof item.usecaseId === 'string' ? item.usecaseId : '',
      kind: typeof item.kind === 'string' ? item.kind : '',
      grantIds: Array.isArray(item.grantIds) ? item.grantIds.filter((id): id is string => typeof id === 'string') : [],
    }))
    .filter(item => item.route)
    .sort((left, right) => left.route < right.route ? -1 : left.route > right.route ? 1 : 0);
  for (const route of routes) {
    const tail = route.route.split('.').pop() || route.route;
    cases.push(base(definition, {
      caseId: `${definition.artifactId}.auth.${tail}`,
      gate: 'auth',
      source: `${defPath}#${route.route}`,
      expectation: 'An http caller with no authority is refused before the usecase.',
      preconditions: ['verifiedAuthorities is empty', 'source is http'],
      actorId: '',
      routine: route.route,
      mutating: false,
      expect: { ok: false, status: 403, errorCode: 'FORBIDDEN_ACTOR', ruleId: null, forbiddenFields: [], isolatedActorField: null },
      expectedFailure: null,
      runner: 'route',
      caller: { source: 'http', authorities: [] },
    }));
    const derived = routeObligations({ ...route, controller: definition, defPath }, defs, texts);
    if ('gap' in derived) {
      gaps.push({ artifactId: definition.artifactId, artifactType: 'httpController', origin: `${defPath}#${route.route}`, reason: derived.gap });
      continue;
    }
    const model = fixtureModelOf(defs);
    for (const item of derived.obligations) {
      obligations.push(item);
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: 'httpController',
        origin: `${defPath}#${route.route}`,
        reason: `${memoryReason(model, item)}; runtime proof ${M1_OBLIGATION_BLOCKER} (${M1_OBLIGATION_OWNER})${model ? `: ${runtimeGap(model.plan, item)}` : ''}`,
      });
    }
  }
  return cases;
}

/** The certification fixture the seeds def carries (m1_28); null without one. */
export function fixtureModelOf(defs: ReadonlyMap<string, M1Definition>): M1FixtureModel | null {
  const seeds = [...defs.values()].find(item => item.artifactType === 'persistenceSeeds' && item.data.fixture !== undefined);
  if (!seeds) return null;
  const plan = readFixturePlan(seeds.data.fixture);
  return 'issues' in plan ? null : fixtureModel(plan, defs);
}

/** Memory status of one obligation, with its owner. Nothing in the agent executes it (m1_33); the runtime blocker follows. */
function memoryReason(model: M1FixtureModel | null, item: M1Obligation): string {
  if (!model) return `FIXTURE_PLAN_ABSENT (L1): ${item.caseId} is declared, not executed; the seeds def carries no certification fixture`;
  const blocked = classifyObligation(model, item);
  if (blocked) return `${blocked.gap} (${blocked.owner}): ${item.caseId} is declared, not executed`;
  return `FIXTURE_MEMORY_AT_IMPLEMENT (L1): ${item.caseId} is declared, not executed: an obligation, not a catalog case the monitor runs`;
}

function base(definition: M1Definition, patch: Omit<M1ScenarioCase, 'mandatory' | 'synthetic'>): M1ScenarioCase {
  return { ...patch, mandatory: true, synthetic: [] };
}

export function catalogBytes(catalog: M1ScenarioCatalog): string {
  return canonicalJson(catalog);
}
