/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/plan.ts" enhancement="_blank"/>

import {
  parseDefinitionSource,
  readDefinition,
  renderDefinition,
  type M1Definition,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import { allowedPaths } from '/_102021_/l2/agentNewReleaseL1/helpers/guard.js';
import {
  applyStructuralRemoval,
  citedToken,
  citesRemoval,
  removalReady,
  structuralRemoval,
  type StructuralRemoval,
} from '/_102021_/l2/agentNewReleaseL1/helpers/removals.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import type { ChangeEffortFile, EffortAnswer, EffortUnitRef, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

export interface NewReleaseEdit {
  path: string;
  source: string;
}

export type NewReleasePath = 'def-edit' | 'generator';

export type NewReleasePlan =
  | {
    ok: true;
    path: NewReleasePath;
    edits: NewReleaseEdit[];
    targets: string[];
    allowed: string[];
    removes: string[];
    flow: boolean;
    /** Units the defs generator rebuilds with `/units`, in effort order, without repeats. */
    units: EffortUnitRef[];
  }
  | { ok: false; reason: string };

const APPLIED = new Set(['usecase', 'entity', 'request']);

/** Pure. Applies one master's rule add/remove onto the def sources. Does not write. */
export function planNewReleaseL1(
  effort: unknown,
  masterProject: string,
  defs: Record<string, string>,
): NewReleasePlan {
  const gate = validateChangeEffort(effort);
  if (!gate.ok) {
    return { ok: false, reason: gate.issues.map(issue => issue.path ? `${issue.code} at ${issue.path}` : issue.code).join('; ') };
  }
  const file = gate.file;
  const ofMaster = file.perItem.flatMap(row => row.answers.filter(answer => answer.master.project === masterProject));
  const answers = withoutRemovedUnits(ofMaster);
  if (answers.length === 0) {
    return { ok: false, reason: `change effort has no answer from master ${masterProject}` };
  }
  const refusals: string[] = [];
  for (const answer of answers) refusals.push(...refusalOf(answer));
  if (refusals.length > 0) return { ok: false, reason: refusals.join('\n') };
  const removes = workflowRemoves(answers);
  const flow = flowOf(answers, removes);
  const scoped = collectUnits(file, answers, defs);
  if (!scoped.ok) return scoped;
  const path: NewReleasePath = scoped.units.length > 0 ? 'generator' : 'def-edit';
  return {
    ok: true,
    path,
    edits: scoped.edits,
    targets: targetsOf(answers),
    allowed: path === 'generator' ? allowedPaths(answers, defs) : [],
    removes,
    flow,
    units: scoped.units,
  };
}

/** Keys of an entity `changed` item that are prose. A difference only in these does not go to `/units`. */
const ENTITY_TEXT_KEYS = new Set(['description', 'title', 'capabilities', 'rules']);

/**
 * Mechanical edits first. Then `/units` receives every `create`, every workflow that stays,
 * every `regenerateDefs` unit of a contract change, and any other `regenerateDefs` unit this
 * request did not edit. An entity `changed` item whose differing keys are all prose does not
 * send its units. A unit edited by any item of this request is not sent again.
 */
function collectUnits(
  file: ChangeEffortFile,
  answers: EffortAnswer[],
  defs: Record<string, string>,
): { ok: true; edits: NewReleaseEdit[]; units: EffortUnitRef[] } | { ok: false; reason: string } {
  const sources = { ...defs };
  const edits: NewReleaseEdit[] = [];
  const deferred: Array<{ unit: EffortUnitRef; force: boolean }> = [];
  const hold = (unit: EffortUnitRef, force: boolean) => deferred.push({ unit, force });
  for (const answer of answers) {
    for (const unit of answer.create) hold(unit, true);
    const item = itemOf(file, answer.item);
    const ruleEdit = !!item && isRuleEdit(item);
    const removal = item ? structuralRemoval(item) : null;
    if (ruleEdit && !ruleIdOf(item)) return { ok: false, reason: `${answer.item}: rule id is missing` };
    if (removal && !removalReady(removal)) return { ok: false, reason: `${answer.item}: ${removal.kind} id is missing` };
    const contractChange = answer.contract === 'change';
    const textOnly = !!item && entityTextOnly(item);
    for (const unit of answer.regenerateDefs) {
      if (contractChange || unit.kind === 'workflow') {
        hold(unit, true);
        continue;
      }
      if (textOnly) continue;
      if (ruleEdit) {
        const ruleId = ruleIdOf(item);
        const op = item.op === 'added' ? 'added' : 'removed';
        const usecases = new Set(answer.regenerateDefs.filter(row => row.kind === 'usecase').map(row => row.id));
        if (!APPLIED.has(unit.kind) || (op === 'added' && unit.kind === 'request' && !requestCitesUsecase(defs[unit.path], usecases))) {
          hold(unit, false);
          continue;
        }
        const applied = applyUnit(sources, unit, op, ruleId, usecases);
        if (!applied.ok) {
          if (applied.reason === 'cannot tell which route takes the rule') {
            hold(unit, false);
            continue;
          }
          return { ok: false, reason: `${answer.item}: ${applied.reason}` };
        }
        if (applied.edit) edits.push(applied.edit);
        continue;
      }
      if (removal) {
        const applied = applyRemoval(sources, unit, removal);
        if (!applied.ok) {
          if (applied.reason.endsWith('and is not applied mechanically')) {
            hold(unit, false);
            continue;
          }
          return { ok: false, reason: `${answer.item}: ${applied.reason}` };
        }
        if (applied.edit) edits.push(applied.edit);
        continue;
      }
      hold(unit, false);
    }
  }
  const edited = new Set(edits.map(edit => edit.path));
  const units: EffortUnitRef[] = [];
  const seen = new Set<string>();
  for (const entry of deferred) {
    const key = `${entry.unit.kind}:${entry.unit.id}`;
    if (seen.has(key)) continue;
    if (!entry.force && edited.has(entry.unit.path)) continue;
    seen.add(key);
    units.push(entry.unit);
  }
  return { ok: true, edits, units };
}

/** Entity `changed` whose every differing key is prose (`description`, `title`, `capabilities`, `rules`). */
function entityTextOnly(item: L4DiffItem): boolean {
  if (item.kind !== 'entity' || item.op !== 'changed') return false;
  if (!isRecord(item.before) || !isRecord(item.after)) return false;
  const before = item.before;
  const after = item.after;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    if (!ENTITY_TEXT_KEYS.has(key)) return false;
  }
  return true;
}

/** A workflow unit in this master's answers, or any workflow removal, rebuilds the module engine and clock. */
function flowOf(answers: EffortAnswer[], removes: readonly string[]): boolean {
  if (removes.length > 0) return true;
  for (const answer of answers) {
    for (const unit of [...answer.create, ...answer.regenerateDefs, ...answer.materialize]) {
      if (unit.kind === 'workflow') return true;
    }
  }
  return false;
}

function refusalOf(answer: EffortAnswer): string[] {
  const reasons: string[] = [];
  if (answer.status === 'abend') reasons.push(`status is abend (${answer.abend?.reason || 'no reason'})`);
  for (const unit of answer.remove) {
    if (unit.kind !== 'workflow') reasons.push(`remove of ${unit.kind} ${unit.id} is not applied by this agent`);
  }
  if (answer.runAgents.length > 0) reasons.push('runAgents is not applied by this agent');
  return reasons.map(reason => `${answer.item}: ${reason}`);
}

function requestCitesUsecase(source: string | undefined, usecases: Set<string>): boolean {
  if (!source || usecases.size === 0) return false;
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed) || !isRecord(parsed.definition)) return false;
  const data = isRecord(parsed.definition.data) ? parsed.definition.data : undefined;
  const requests = data && Array.isArray(data.requests) ? data.requests : [];
  return requests.some(request => isRecord(request) && routeUses(request, usecases));
}

function itemOf(file: ChangeEffortFile, changeId: string): L4DiffItem | undefined {
  return file.request.items.find(item => item.changeId === changeId);
}

function isRuleEdit(item: L4DiffItem): boolean {
  return item.kind === 'rule' && (item.op === 'added' || item.op === 'removed');
}

function ruleIdOf(item: L4DiffItem): string {
  const side = item.op === 'added' ? item.after : item.before;
  if (!side || typeof side !== 'object' || Array.isArray(side)) return '';
  const ruleId = (side as { ruleId?: unknown }).ruleId;
  return typeof ruleId === 'string' ? ruleId : '';
}

/**
 * A workflow this effort removes is not also regenerated or materialized: the task item of a removed process
 * says to regenerate the same def, and a removal wins over that (the same rule as the merged effort).
 */
/** Same effort, with this master's removed workflows already dropped from regenerateDefs and materialize. */
export function effortWithoutRemovedUnits(file: ChangeEffortFile, masterProject: string): ChangeEffortFile {
  const filtered = withoutRemovedUnits(file.perItem.flatMap(row => row.answers.filter(answer => answer.master.project === masterProject)));
  let index = 0;
  return {
    ...file,
    perItem: file.perItem.map(row => ({
      ...row,
      answers: row.answers.map(answer => answer.master.project === masterProject ? filtered[index++]! : answer),
    })),
  };
}

function withoutRemovedUnits(answers: EffortAnswer[]): EffortAnswer[] {
  const removed = new Set(workflowRemoves(answers).map(unitKey));
  if (removed.size === 0) return answers;
  return answers.map(answer => ({
    ...answer,
    regenerateDefs: answer.regenerateDefs.filter(unit => !removed.has(unitKey(unit.path))),
    materialize: answer.materialize.filter(unit => !removed.has(unitKey(unit.path))),
  }));
}

/** `l1/...` and `_102047_/l1/...` name the same def. */
function unitKey(path: string): string {
  return path.replace(/^\/+/u, '').replace(/^_\d+_\//u, '');
}

function workflowRemoves(answers: EffortAnswer[]): string[] {
  const seen = new Set<string>();
  const removes: string[] = [];
  for (const answer of answers) {
    for (const unit of answer.remove) {
      if (unit.kind !== 'workflow' || seen.has(unit.path)) continue;
      seen.add(unit.path);
      removes.push(unit.path);
    }
  }
  return removes;
}

function targetsOf(answers: EffortAnswer[]): string[] {
  const seen = new Set<string>();
  const targets: string[] = [];
  for (const answer of answers) {
    for (const unit of [...answer.regenerateDefs, ...answer.materialize]) {
      if (seen.has(unit.path)) continue;
      seen.add(unit.path);
      targets.push(unit.path);
    }
  }
  return targets;
}

function applyRemoval(
  sources: Record<string, string>,
  unit: EffortUnitRef,
  removal: StructuralRemoval,
): { ok: true; edit?: NewReleaseEdit } | { ok: false; reason: string } {
  const current = sources[unit.path];
  if (current === undefined) return { ok: false, reason: `definition not found at ${unit.path}` };
  const parsed = parseDefinitionSource(current);
  if (!('definition' in parsed)) return { ok: false, reason: parsed.issues.join('; ') };
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return { ok: false, reason: read.issues.join('; ') };
  const mechanical = applyStructuralRemoval(read, unit.kind, removal);
  if (citesRemoval(read, removal)) {
    return { ok: false, reason: `${unit.kind} ${unit.id} cites ${citedToken(removal)} and is not applied mechanically` };
  }
  if (!mechanical) return { ok: true };
  const fileReference = fileReferenceOf(current);
  const rendered = renderDefinition(read, fileReference);
  if ('issues' in rendered) return { ok: false, reason: rendered.issues.join('; ') };
  if (rendered.source === current) return { ok: true };
  sources[unit.path] = rendered.source;
  return { ok: true, edit: { path: unit.path, source: rendered.source } };
}

function applyUnit(
  sources: Record<string, string>,
  unit: EffortUnitRef,
  op: 'added' | 'removed',
  ruleId: string,
  usecases: Set<string>,
): { ok: true; edit?: NewReleaseEdit } | { ok: false; reason: string } {
  const current = sources[unit.path];
  if (current === undefined) return { ok: false, reason: `definition not found at ${unit.path}` };
  const parsed = parseDefinitionSource(current);
  if (!('definition' in parsed)) return { ok: false, reason: parsed.issues.join('; ') };
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return { ok: false, reason: read.issues.join('; ') };
  const edited = op === 'added'
    ? addRule(read, unit, ruleId, usecases)
    : removeRule(read, unit, ruleId);
  if (!edited.ok) return edited;
  const fileReference = fileReferenceOf(current);
  const rendered = renderDefinition(read, fileReference);
  if ('issues' in rendered) return { ok: false, reason: rendered.issues.join('; ') };
  if (rendered.source === current) return { ok: true };
  sources[unit.path] = rendered.source;
  return { ok: true, edit: { path: unit.path, source: rendered.source } };
}

function addRule(
  definition: M1Definition,
  unit: EffortUnitRef,
  ruleId: string,
  usecases: Set<string>,
): { ok: true } | { ok: false; reason: string } {
  const data = definition.data;
  if (unit.kind === 'usecase') return appendId(data, 'rulesApplied', ruleId);
  if (unit.kind === 'entity') return appendId(data, 'invariants', ruleId);
  return appendOnRoutes(data, ruleId, usecases);
}

function removeRule(
  definition: M1Definition,
  unit: EffortUnitRef,
  ruleId: string,
): { ok: true } | { ok: false; reason: string } {
  const data = definition.data;
  if (unit.kind === 'usecase') return dropId(data, 'rulesApplied', ruleId);
  if (unit.kind === 'entity') {
    const dropped = dropId(data, 'invariants', ruleId);
    if (!dropped.ok) return dropped;
    return dropTransitionRefs(data, ruleId);
  }
  return dropOnRoutes(data, ruleId);
}

function appendId(
  data: Record<string, unknown>,
  field: string,
  ruleId: string,
): { ok: true } | { ok: false; reason: string } {
  const list = data[field];
  if (!Array.isArray(list)) return { ok: false, reason: `${field} is not a list` };
  if (!listsId(list, ruleId)) list.push(ruleId);
  return { ok: true };
}

function dropId(
  data: Record<string, unknown>,
  field: string,
  ruleId: string,
): { ok: true } | { ok: false; reason: string } {
  const list = data[field];
  if (list === undefined) return { ok: true };
  if (!Array.isArray(list)) return { ok: false, reason: `${field} is not a list` };
  data[field] = list.filter(entry => !sameId(entry, ruleId));
  return { ok: true };
}

function appendOnRoutes(
  data: Record<string, unknown>,
  ruleId: string,
  usecases: Set<string>,
): { ok: true } | { ok: false; reason: string } {
  const requests = data.requests;
  if (!Array.isArray(requests)) return { ok: false, reason: 'requests is not a list' };
  let matched = false;
  for (const request of requests) {
    if (!isRecord(request) || !routeUses(request, usecases)) continue;
    matched = true;
    const rules = request.rules;
    if (!Array.isArray(rules)) return { ok: false, reason: 'rules is not a list' };
    if (!listsId(rules, ruleId)) rules.push(ruleId);
  }
  if (!matched) return { ok: false, reason: 'cannot tell which route takes the rule' };
  return { ok: true };
}

function dropOnRoutes(
  data: Record<string, unknown>,
  ruleId: string,
): { ok: true } | { ok: false; reason: string } {
  const requests = data.requests;
  if (!Array.isArray(requests)) return { ok: false, reason: 'requests is not a list' };
  for (const request of requests) {
    if (!isRecord(request) || request.rules === undefined) continue;
    if (!Array.isArray(request.rules)) return { ok: false, reason: 'rules is not a list' };
    request.rules = request.rules.filter(entry => !sameId(entry, ruleId));
  }
  return { ok: true };
}

function dropTransitionRefs(
  data: Record<string, unknown>,
  ruleId: string,
): { ok: true } | { ok: false; reason: string } {
  const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : undefined;
  if (!lifecycle || lifecycle.transitions === undefined) return { ok: true };
  if (!Array.isArray(lifecycle.transitions)) return { ok: false, reason: 'transitions is not a list' };
  for (const transition of lifecycle.transitions) {
    if (!isRecord(transition) || transition.ruleRefs === undefined) continue;
    if (!Array.isArray(transition.ruleRefs)) return { ok: false, reason: 'ruleRefs is not a list' };
    transition.ruleRefs = transition.ruleRefs.filter(entry => !sameId(entry, ruleId));
  }
  return { ok: true };
}

function routeUses(request: Record<string, unknown>, usecases: Set<string>): boolean {
  return Array.isArray(request.uses) && request.uses.some(use => typeof use === 'string' && usecases.has(use));
}

function listsId(list: unknown[], ruleId: string): boolean {
  return list.some(entry => sameId(entry, ruleId));
}

function sameId(entry: unknown, ruleId: string): boolean {
  return entry === ruleId || (isRecord(entry) && entry.ruleId === ruleId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function fileReferenceOf(source: string): string {
  const match = /fileReference="([^"]+)"/.exec(source);
  return match ? match[1] : '';
}
