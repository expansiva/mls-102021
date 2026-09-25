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
import { grantsOf, requiredMembers } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { resolveGrant } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';
import {
  M1_CATALOG_SCHEMA,
  M1_STUB_ERROR,
  M1_STUB_STATUS,
  canonicalJson,
  testFileFor,
  type M1Scenario,
  type M1ScenarioCase,
  type M1ScenarioCatalog,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';

export const M1_CATALOG_RECIPE = '2026-09-25-m1-catalog-derive-v1' as const;

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
  recipeVersion: typeof M1_CATALOG_RECIPE;
}

/** A unit that will not write its `.ts` is a gap, not an executable scenario. */
export function catalogWithheld(
  units: readonly PlannedUnit[],
  boundHandlers: ReadonlySet<string>,
): Map<string, string> {
  const withheld = new Map<string, string>();
  for (const unit of units) {
    if (unit.action === 'reuse' || unit.action === 'verify') continue;
    if (unit.action === 'generate') {
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
    const cases = casesFor(definition, defPath, defs, texts, gaps);
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
    catalog: { schemaVersion: M1_CATALOG_SCHEMA, moduleName, store: 'memory', scenarios },
    gaps,
    recipeVersion: M1_CATALOG_RECIPE,
  };
}

function casesFor(
  definition: M1Definition,
  defPath: string,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
  gaps: CatalogGap[],
): M1ScenarioCase[] {
  const cases: M1ScenarioCase[] = [];
  if (STRUCTURE_COMPILE.has(definition.artifactType)) {
    cases.push(compileCase(definition));
  }
  if (definition.artifactType === 'usecase') {
    cases.push(stubCase(definition, defPath));
    noteRuleGaps(definition, defPath, gaps);
  }
  if (definition.artifactType === 'httpController') {
    cases.push(...routeCases(definition, defPath, defs, texts, gaps));
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
  });
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
): M1ScenarioCase[] {
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers.filter(isRecord) : [];
  const scope = [...defs.values()].find(item => item.artifactType === 'accessScope' && item.moduleName === definition.moduleName);
  const grants = scope ? grantsOf(scope.data) : [];
  const cases: M1ScenarioCase[] = [];
  const routes = handlers
    .map(item => ({
      route: typeof item.route === 'string' ? item.route : '',
      usecaseId: typeof item.usecaseId === 'string' ? item.usecaseId : '',
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
    }));
    const field = requiredField(route.usecaseId, route.route, defs, texts);
    if (!field) {
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: 'httpController',
        origin: `${defPath}#${route.route}`,
        reason: 'contract required field was not read',
      });
      continue;
    }
    const open = route.grantIds.every(id => {
      const grant = grants.find(item => item.grantId === id);
      return grant && !('code' in resolveGrant(grants, id));
    });
    if (!open || route.grantIds.length === 0) {
      gaps.push({
        artifactId: definition.artifactId,
        artifactType: 'httpController',
        origin: `${defPath}#${route.route}`,
        reason: 'grant is not resolved, so a contract case would fail for another cause',
      });
      continue;
    }
    const actor = grants.find(item => item.grantId === route.grantIds[0])?.actorRef || '';
    cases.push(base(definition, {
      caseId: `${definition.artifactId}.contract.${tail}.${field}`,
      gate: 'contract',
      source: `${defPath}#${route.route}`,
      expectation: `A body without ${field} is VALIDATION_ERROR before the usecase runs.`,
      preconditions: [`${field} omitted`],
      actorId: actor,
      routine: route.route,
      mutating: false,
      expect: { ok: false, status: 400, errorCode: 'VALIDATION_ERROR', ruleId: null, forbiddenFields: [], isolatedActorField: null },
      expectedFailure: null,
    }));
  }
  return cases;
}

function requiredField(
  usecaseId: string,
  route: string,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
): string {
  const usecase = [...defs.values()].find(item => item.artifactType === 'usecase' && item.artifactId === usecaseId);
  if (!usecase) return '';
  const projections = Array.isArray(usecase.data.routeProjections) ? usecase.data.routeProjections.filter(isRecord) : [];
  const projection = projections.find(item => item.route === route);
  const contractPath = typeof projection?.contractPath === 'string' ? projection.contractPath : '';
  if (!contractPath) return '';
  const text = textFor(contractPath, usecase.dependencies, texts);
  if (!text) return '';
  const input = inputName(route, text);
  if (!input) return '';
  const required = requiredMembers(text, input);
  return required && required.length > 0 ? required[0] : '';
}

function textFor(contractPath: string, dependencies: readonly string[], texts: Readonly<Record<string, string>>): string {
  const ref = dependencies.find(path => path === contractPath || path.endsWith(`/${contractPath}`)) || contractPath;
  return texts[ref] || texts[contractPath] || '';
}

function inputName(routine: string, source: string): string {
  const tail = routine.split('.').pop() ?? '';
  const stem = tail.replace(/^(cmd|qry)/, '');
  const name = stem.charAt(0).toUpperCase() + stem.slice(1);
  const candidate = name.endsWith('Input') ? name : `${name}Input`;
  if (source.includes(`export interface ${candidate} `)) return candidate;
  return '';
}

function base(definition: M1Definition, patch: Omit<M1ScenarioCase, 'mandatory' | 'synthetic'>): M1ScenarioCase {
  return { ...patch, mandatory: true, synthetic: [] };
}

export function catalogBytes(catalog: M1ScenarioCatalog): string {
  return canonicalJson(catalog);
}
