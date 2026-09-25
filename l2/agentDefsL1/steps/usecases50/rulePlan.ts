/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/rulePlan.ts" enhancement="_blank"/>

import { isRecord, isStorageConstraintRow } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { mdmCapabilityCalls } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import type { D1RulePlanRow } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

/**
 * Applicability is citation, not a rule name and not a sentence.
 * A transition citation is mandatory on that transition and is not exclusive.
 * A write records uniqueKeys as its own storage row, with no rule id.
 * A module rule no transition cites stays pending on that write.
 * A read does not infer an actor or a route: each rules[] id a transition
 * also cites is one pending row on the operation.
 * A platform catalog entry has no structured method field, so it stays pending.
 */

const WRITE_OPERATIONS = new Set(['create', 'update', 'patch']);
const READ_OPERATIONS = new Set(['list', 'get', 'read']);

export interface RulePlanRule {
  ruleId: string;
  owner: 'module' | 'platform';
  source: string;
  text: string;
}

export interface RulePlanTransition {
  transitionId: string;
  by: readonly string[];
  ruleRefs: readonly string[];
  payload: readonly string[];
}

export interface RulePlanGrant {
  grantId: string;
  actorRef: string;
  scope: string;
}

export interface RulePlanRoute {
  route: string;
  contractPath: string;
  grants: readonly RulePlanGrant[];
}

export interface RulePlanInput {
  moduleName: string;
  entityId: string;
  usecaseId: string;
  operation: string;
  rules: readonly RulePlanRule[];
  transitions: readonly RulePlanTransition[];
  uniqueKeys: readonly (readonly string[])[];
  capabilities: readonly string[];
  routes: readonly RulePlanRoute[];
  /**
   * Facade methods the binding calls. Not evidence: the catalog names no method
   * in a structured field, and a sentence is not a call.
   */
  mdmMethods: readonly string[];
}

export interface RulePlanEntity {
  rules: readonly { ruleId: string; owner: 'module' | 'platform'; source?: string }[];
  transitions: readonly RulePlanTransition[];
  uniqueKeys?: readonly (readonly string[])[];
  capabilities?: readonly string[];
  namespace: string;
  storageTarget: string;
  platformFields?: readonly string[];
}

export interface RulePlanFile {
  path: string;
  text: string;
}

/** Rule ids the operation enforces. Pending rows are not in this list. */
export function enforcedRuleIds(rows: readonly D1RulePlanRow[]): string[] {
  const out: string[] = [];
  for (const row of rows) {
    if (row.enforcement === 'pending' || !row.ruleId || out.includes(row.ruleId)) continue;
    out.push(row.ruleId);
  }
  return out;
}

export function originFile(origin: string): string {
  const hash = origin.indexOf('#');
  return hash < 0 ? origin : origin.slice(0, hash);
}

export function planRuleApplicability(input: RulePlanInput): D1RulePlanRow[] {
  const rows: D1RulePlanRow[] = [];
  const transitions = input.transitions;
  const moduleRules = input.rules.filter(rule => rule.owner === 'module');
  const citedBy = new Map<string, RulePlanTransition[]>();
  for (const transition of transitions) {
    for (const ruleId of transition.ruleRefs) {
      const list = citedBy.get(ruleId) || [];
      list.push(transition);
      citedBy.set(ruleId, list);
    }
  }
  const transition = input.operation === 'transition'
    ? transitions.find(item => item.transitionId === input.usecaseId) || null
    : null;
  if (transition) {
    const origin = `l4/${input.moduleName}/ontology/${input.entityId}.defs.ts#transitions.${transition.transitionId}.ruleRefs`;
    for (const ruleId of transition.ruleRefs) {
      push(rows, {
        ruleId,
        origin,
        consumer: `usecase:${input.usecaseId}`,
        enforcement: 'local',
        gap: '',
      });
    }
  }

  const constraint = constraintOrigin(input);
  if (constraint && writesConstraint(input.operation, transition, input.uniqueKeys)) {
    push(rows, {
      ruleId: '',
      origin: constraint,
      consumer: `operation:${input.operation}`,
      enforcement: 'local',
      gap: '',
    });
  }

  if (WRITE_OPERATIONS.has(input.operation)) {
    for (const rule of moduleRules) {
      if (citedBy.get(rule.ruleId)?.length) continue;
      push(rows, {
        ruleId: rule.ruleId,
        origin: `${rule.source}#${rule.ruleId}`,
        consumer: `operation:${input.operation}`,
        enforcement: 'pending',
        gap: 'RULE_UNBOUND',
      });
    }
  }

  if (READ_OPERATIONS.has(input.operation)) {
    const origin = `l4/${input.moduleName}/ontology/${input.entityId}.defs.ts#rules`;
    for (const rule of input.rules) {
      if (!citedBy.get(rule.ruleId)?.length) continue;
      push(rows, {
        ruleId: rule.ruleId,
        origin,
        consumer: `operation:${input.operation}`,
        enforcement: 'pending',
        gap: 'APPLICABILITY_UNDECLARED',
      });
    }
  }

  for (const rule of input.rules) {
    if (rule.owner !== 'platform') continue;
    if (rows.some(row => row.ruleId === rule.ruleId)) continue;
    push(rows, {
      ruleId: rule.ruleId,
      origin: `${rule.source}#${rule.ruleId}`,
      consumer: `operation:${input.operation}`,
      enforcement: 'pending',
      gap: 'DELEGATION_UNPROVEN',
    });
  }

  rows.sort((left, right) => rowKey(left).localeCompare(rowKey(right)));
  return rows;
}

/**
 * Same plan the gate writes and the fidelity reader recomputes.
 * An ontology file wins over the entity draft. Routes stay on the input.
 * A grant does not place a rule.
 */
export function rulePlanForUsecase(input: {
  moduleName: string;
  entityId: string;
  usecaseId: string;
  operation: string;
  files?: readonly RulePlanFile[];
  entity: RulePlanEntity;
  routes: readonly RulePlanRoute[];
}): D1RulePlanRow[] {
  const files = input.files || [];
  const ontologyPath = `l4/${input.moduleName}/ontology/${input.entityId}.defs.ts`;
  const ontologyText = fileText(files, ontologyPath);
  const ontology = ontologyText == null ? null : parseD1Source(ontologyText, 'defs');
  const fromFile = ontology != null;
  const transitions = fromFile ? transitionsOf(ontology) : input.entity.transitions.map(cloneTransition);
  const uniqueKeys = fromFile ? uniqueKeysOf(ontology) : input.entity.uniqueKeys?.map(key => [...key]) || [];
  const capabilities = fromFile ? capabilityNamesOf(ontology) : [...(input.entity.capabilities || [])];
  const rules = fromFile
    ? rulesFromFiles(input.moduleName, ontology, transitions, files)
    : input.entity.rules.map(rule => ({
      ruleId: rule.ruleId,
      owner: rule.owner,
      source: rule.source || `l4/${input.moduleName}/rules.defs.ts`,
      text: '',
    }));
  const routes = routesForPlan(input.moduleName, input.entityId, input.routes, files);
  const storage = fromFile ? storageOf(ontology) : input.entity.storageTarget;
  const mdmMethods = storage === 'mdm'
    ? mdmCapabilityCalls(capabilities.filter(name => capabilityApplies(name, input.operation))).map(call => call.method)
    : [];
  return planRuleApplicability({
    moduleName: input.moduleName,
    entityId: input.entityId,
    usecaseId: input.usecaseId,
    operation: input.operation,
    rules,
    transitions,
    uniqueKeys,
    capabilities,
    routes,
    mdmMethods,
  });
}

export function capabilityApplies(name: string, operation: string): boolean {
  if (operation === 'update') return name === 'edit.platformFields' || name.startsWith('edit.');
  if (operation === 'create') return name.startsWith('register.') || name === 'create';
  if (operation === 'list' || operation === 'get') return name.startsWith('read.') || name.startsWith('locate.') || name.startsWith('list');
  return false;
}

function writesConstraint(
  operation: string,
  transition: RulePlanTransition | null,
  uniqueKeys: readonly (readonly string[])[],
): boolean {
  if (WRITE_OPERATIONS.has(operation)) return true;
  if (operation !== 'transition' || !transition) return false;
  const columns = new Set(uniqueKeys.flat());
  return transition.payload.some(path => columns.has(path));
}

function constraintOrigin(input: RulePlanInput): string | null {
  const base = `l4/${input.moduleName}/ontology/${input.entityId}.defs.ts`;
  if (input.uniqueKeys.some(key => key.length > 0)) return `${base}#uniqueKeys`;
  if (input.capabilities.includes('uniqueKey')) return `${base}#capabilities.uniqueKey`;
  return null;
}

function push(rows: D1RulePlanRow[], row: D1RulePlanRow): void {
  if (!row.ruleId && !isStorageConstraintRow(row)) return;
  if (rows.some(item => item.ruleId === row.ruleId && item.consumer === row.consumer && item.origin === row.origin && item.gap === row.gap)) return;
  rows.push(row);
}

function rowKey(row: D1RulePlanRow): string {
  return `${row.consumer}\u0000${row.ruleId}\u0000${row.origin}\u0000${row.enforcement}`;
}

function routesForPlan(
  moduleName: string,
  entityId: string,
  routes: readonly RulePlanRoute[],
  files: readonly RulePlanFile[],
): RulePlanRoute[] {
  const accessText = fileText(files, `l4/${moduleName}/access.defs.ts`);
  const needsText = fileText(files, `l4/${moduleName}/pool/l1/web/needs.json`);
  const access = accessText == null ? null : parseD1Source(accessText, 'defs');
  const needs = needsText == null ? null : parseJson(needsText);
  if (!access || !needs) {
    return routes.map(route => ({
      route: route.route,
      contractPath: route.contractPath,
      grants: route.grants.map(grant => ({ ...grant })),
    }));
  }
  return routes.map(route => {
    const page = pageIdFromContract(moduleName, route.contractPath);
    return {
      route: route.route,
      contractPath: route.contractPath,
      grants: grantsFor(access, pageActors(needs, page), entityId),
    };
  });
}

function rulesFromFiles(
  moduleName: string,
  ontology: unknown,
  transitions: readonly RulePlanTransition[],
  files: readonly RulePlanFile[],
): RulePlanRule[] {
  const modulePath = `l4/${moduleName}/rules.defs.ts`;
  const moduleBody = parseD1Source(fileText(files, modulePath) || '', 'defs');
  const moduleText = ruleMap(moduleBody);
  const catalogs = catalogMaps(ontology, files);
  const cited = stringList(isRecord(ontology) ? ontology.rules : undefined);
  for (const transition of transitions) {
    for (const ruleId of transition.ruleRefs) {
      if (!cited.includes(ruleId)) cited.push(ruleId);
    }
  }
  const rules: RulePlanRule[] = [];
  for (const ruleId of cited) {
    const catalog = catalogs.find(item => Object.prototype.hasOwnProperty.call(item.rules, ruleId));
    if (catalog) {
      rules.push({ ruleId, owner: 'platform', source: catalog.path, text: catalog.rules[ruleId] });
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(moduleText, ruleId)) {
      rules.push({ ruleId, owner: 'module', source: modulePath, text: moduleText[ruleId] });
      continue;
    }
    rules.push({ ruleId, owner: 'module', source: modulePath, text: '' });
  }
  return rules;
}

function catalogMaps(ontology: unknown, files: readonly RulePlanFile[]): Array<{ path: string; rules: Record<string, string> }> {
  if (!isRecord(ontology) || typeof ontology.source !== 'string' || !ontology.source.trim()) return [];
  const path = ontology.source.trim().replace(/^\//, '');
  const text = fileText(files, path) || fileText(files, `/${path}`) || fileText(files, ontology.source.trim());
  const body = text == null ? null : parseD1Source(text, 'defs');
  const rules = ruleMap(body);
  if (!Object.keys(rules).length) return [];
  return [{ path: ontology.source.trim(), rules }];
}

function transitionsOf(body: unknown): RulePlanTransition[] {
  if (!isRecord(body) || !Array.isArray(body.transitions)) return [];
  const out: RulePlanTransition[] = [];
  for (const item of body.transitions) {
    if (!isRecord(item) || typeof item.transitionId !== 'string') continue;
    out.push({
      transitionId: item.transitionId,
      by: stringList(item.by),
      ruleRefs: stringList(item.ruleRefs),
      payload: stringList(item.payload),
    });
  }
  return out;
}

function cloneTransition(transition: RulePlanTransition): RulePlanTransition {
  return {
    transitionId: transition.transitionId,
    by: [...transition.by],
    ruleRefs: [...transition.ruleRefs],
    payload: [...transition.payload],
  };
}

function uniqueKeysOf(body: unknown): string[][] {
  if (!isRecord(body) || !Array.isArray(body.uniqueKeys)) return [];
  const out: string[][] = [];
  for (const row of body.uniqueKeys) {
    if (!Array.isArray(row)) continue;
    const fields = row.filter((item): item is string => typeof item === 'string' && item.length > 0);
    if (fields.length) out.push(fields);
  }
  return out;
}

function capabilityNamesOf(body: unknown): string[] {
  if (!isRecord(body) || !isRecord(body.capabilities)) return [];
  const caps = body.capabilities;
  return Object.keys(caps).filter(name => typeof caps[name] === 'string').sort();
}

function storageOf(body: unknown): string {
  if (!isRecord(body)) return '';
  if (body.kind === 'role') return 'mdm';
  if (isRecord(body.storage) && typeof body.storage.target === 'string') return body.storage.target;
  return '';
}

function grantsFor(access: unknown, actors: readonly string[], entityId: string): RulePlanGrant[] {
  if (!isRecord(access) || !Array.isArray(access.grants)) return [];
  const out: RulePlanGrant[] = [];
  for (const grant of access.grants) {
    if (!isRecord(grant) || typeof grant.grantId !== 'string') continue;
    const actorRef = typeof grant.actorRef === 'string' ? grant.actorRef : '';
    if (!actors.includes(actorRef) || !stringList(grant.entityRefs).includes(entityId)) continue;
    const scope = isRecord(grant.dataScope) && typeof grant.dataScope.mode === 'string' ? grant.dataScope.mode : '';
    out.push({ grantId: grant.grantId, actorRef, scope });
  }
  return out;
}

function pageActors(needs: unknown, pageId: string): string[] {
  if (!pageId || !isRecord(needs) || !Array.isArray(needs.pages)) return [];
  const page = needs.pages.find(item => isRecord(item) && item.pageId === pageId);
  if (!isRecord(page)) return [];
  return stringList(page.actors);
}

function pageIdFromContract(moduleName: string, contractPath: string): string {
  const prefix = `l2/${moduleName}/web/contracts/`;
  const suffix = '.defs.ts';
  if (!contractPath.startsWith(prefix) || !contractPath.endsWith(suffix)) return '';
  const page = contractPath.slice(prefix.length, -suffix.length);
  if (!page || page.includes('/')) return '';
  return page;
}

function ruleMap(body: unknown): Record<string, string> {
  if (!isRecord(body) || !isRecord(body.rules)) return {};
  const out: Record<string, string> = {};
  for (const [ruleId, text] of Object.entries(body.rules)) {
    if (typeof text === 'string') out[ruleId] = text;
  }
  return out;
}

function fileText(files: readonly RulePlanFile[], path: string): string | null {
  const found = files.find(file => file.path === path);
  return found ? found.text : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
