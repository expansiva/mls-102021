/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/plan.ts" enhancement="_blank"/>

import {
  parseDefinitionSource,
  readDefinition,
  renderDefinition,
  type M1Definition,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import type { ChangeEffortFile, EffortAnswer, EffortUnitRef, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

export interface NewReleaseEdit {
  path: string;
  source: string;
}

export type NewReleasePlan =
  | { ok: true; edits: NewReleaseEdit[]; targets: string[] }
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
  const answers = file.perItem.flatMap(row => row.answers.filter(answer => answer.master.project === masterProject));
  const refusals: string[] = [];
  for (const answer of answers) refusals.push(...refusalOf(file, answer, defs));
  if (refusals.length > 0) return { ok: false, reason: refusals.join('\n') };

  const sources = { ...defs };
  const edits: NewReleaseEdit[] = [];
  for (const answer of answers) {
    const item = itemOf(file, answer.item);
    if (!item || !isRuleEdit(item)) continue;
    const ruleId = ruleIdOf(item);
    const op = item.op === 'added' ? 'added' : 'removed';
    const usecases = new Set(answer.regenerateDefs.filter(unit => unit.kind === 'usecase').map(unit => unit.id));
    for (const unit of answer.regenerateDefs) {
      if (!APPLIED.has(unit.kind)) continue;
      const applied = applyUnit(sources, unit, op, ruleId, usecases);
      if (!applied.ok) return { ok: false, reason: `${answer.item}: ${applied.reason}` };
      if (applied.edit) edits.push(applied.edit);
    }
  }
  return { ok: true, edits, targets: targetsOf(answers) };
}

function refusalOf(file: ChangeEffortFile, answer: EffortAnswer, defs: Record<string, string>): string[] {
  const reasons: string[] = [];
  if (answer.status === 'abend') reasons.push(`status is abend (${answer.abend?.reason || 'no reason'})`);
  if (answer.create.length > 0) reasons.push('create is not applied by this agent');
  if (answer.remove.length > 0) reasons.push('remove is not applied by this agent');
  if (answer.runAgents.length > 0) reasons.push('runAgents is not applied by this agent');
  if (answer.contract === 'change') reasons.push('contract change is not applied by this agent');
  const item = itemOf(file, answer.item);
  const ruleEdit = !!item && isRuleEdit(item);
  if (answer.regenerateDefs.length > 0 && !ruleEdit) reasons.push('regenerateDefs is not from a rule added or removed');
  if (ruleEdit && !ruleIdOf(item)) reasons.push('rule id is missing');
  if (ruleEdit && item.op === 'added') {
    for (const unit of answer.regenerateDefs) {
      if (!APPLIED.has(unit.kind)) reasons.push(`cannot apply ${unit.kind} ${unit.id}`);
    }
    const usecases = new Set(answer.regenerateDefs.filter(unit => unit.kind === 'usecase').map(unit => unit.id));
    for (const unit of answer.regenerateDefs) {
      if (unit.kind !== 'request') continue;
      if (!requestCitesUsecase(defs[unit.path], usecases)) reasons.push('cannot tell which route takes the rule');
    }
  }
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
