/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbPortMethods.ts" enhancement="_blank"/>

import { parseDefsSource } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';

/**
 * Port-plan vocabulary for gen-port / gen-adapter, and the matching guarantee on the materialized
 * port `.ts`. A delete* operation in the l4 is a fact about the aggregate, not a filename guess:
 * the port item carries `requiredMethods` so the model can declare `delete`; afterPrompt completes
 * the plan when the model omits it; materialize completes the `.ts` the same way. Event ports stay
 * append-only and never receive `delete`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface OperationDeleteRef {
  id: string;
  entity: string;
  opKind?: string;
}

export interface PortPlanItem {
  entityId: string;
  embeddedMembers: string[];
  requiredMethods: string[];
}

export interface PortMethodSig {
  name: string;
  params: string[];
  returns: string;
  description: string;
}

export interface CbSystemDecision {
  decisionId: string;
  stage: string;
  question: string;
  chosen: string;
  alternatives: string[];
  decidedBy: 'system';
  findingRef: string;
  changeHint: string;
}

export const DELETE_PORT_METHOD: PortMethodSig = {
  name: 'delete',
  params: ['id: string'],
  returns: 'Promise<void>',
  description: 'delete the aggregate by id',
};

/** l4 operation that deletes an aggregate: id `deleteX` (same gate as collectDeleteOperationPortGaps) or kind `delete`. */
export function isDeleteOperation(op: { id: string; opKind?: string }): boolean {
  return /^delete[A-Z]/u.test(op.id) || op.opKind === 'delete';
}

export function deleteTargetEntityIdsFromOperations(operations: readonly OperationDeleteRef[]): Set<string> {
  const ids = new Set<string>();
  for (const op of operations) {
    if (!isDeleteOperation(op)) continue;
    if (op.entity) ids.add(op.entity);
  }
  return ids;
}

export function requiredMethodsForEntity(entityId: string, deleteTargetEntityIds: ReadonlySet<string>): string[] {
  return deleteTargetEntityIds.has(entityId) ? ['delete'] : [];
}

export function buildPortPlanItems(
  aggregates: ReadonlyArray<{ rootEntity: string; embeddedMembers: string[] }>,
  deleteTargetEntityIds: ReadonlySet<string>,
): PortPlanItem[] {
  return aggregates.map(a => ({
    entityId: a.rootEntity,
    embeddedMembers: a.embeddedMembers,
    requiredMethods: requiredMethodsForEntity(a.rootEntity, deleteTargetEntityIds),
  }));
}

export function unionMethodNames(...lists: readonly (readonly string[])[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const name of list) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function methodNamesFromPortData(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.methods)) return [];
  return data.methods.map(m => (isRecord(m) ? readString(m.name) : '')).filter(Boolean);
}

export function methodNamesFromPortDefsSource(source: string): string[] {
  const parsed = parseDefsSource(source);
  if (!isRecord(parsed)) return [];
  const data = isRecord(parsed.data) ? parsed.data : parsed;
  return methodNamesFromPortData(data);
}

/** `requiredMethods` as persisted on the port `.defs.ts` data block. Absent or empty → do not invent. */
export function requiredMethodsFromPortData(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.requiredMethods)) return [];
  return data.requiredMethods.map(v => readString(v)).filter(Boolean);
}

export function isAppendOnlyPortData(data: unknown): boolean {
  if (!isRecord(data)) return false;
  return data.appendOnlyEvent === true || data.appendOnly === true;
}

export interface EnsurePortSourceResult {
  source: string;
  completed: string[];
  findings: string[];
  decisions: CbSystemDecision[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function locateRepositoryInterface(source: string): { name: string; open: number; end: number } | null {
  const m = /\binterface\s+(I[A-Za-z0-9_$]*Repository)\b/.exec(source);
  if (!m || m.index === undefined) return null;
  const open = source.indexOf('{', m.index);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return null;
  return { name: m[1], open, end };
}

function interfaceMethodNames(source: string, open: number, end: number): Set<string> {
  const body = source.slice(open + 1, end);
  const names = new Set<string>();
  const re = /(?:^|\n)\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>]*>)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) names.add(m[1]);
  return names;
}

function interfaceIndent(source: string, open: number, end: number): string {
  const body = source.slice(open + 1, end);
  const lines = body.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /^([ \t]+)\S/.exec(lines[i]);
    if (m) return m[1];
  }
  return '  ';
}

/** Prefer `{Entity}Id` declared or imported in the file; else the first `type XId`. Empty if neither. */
function idTypeFromPortSource(source: string, entityId: string): string {
  const want = entityId ? `${entityId}Id` : '';
  if (want) {
    const named = new RegExp(`\\b(?:export\\s+)?type\\s+${escapeRegExp(want)}\\b`).test(source)
      || new RegExp(`\\b${escapeRegExp(want)}\\b`).test(source);
    if (named) return want;
  }
  const m = /\b(?:export\s+)?type\s+([A-Za-z0-9_$]+Id)\b/.exec(source);
  return m?.[1] ?? '';
}

function insertInterfaceMethod(source: string, end: number, signature: string, indent: string): string {
  const head = source.slice(0, end).replace(/[ \t]*$/u, '');
  const prefix = head.endsWith('\n') ? '' : '\n';
  return `${head}${prefix}${indent}${signature}\n${source.slice(end)}`;
}

/**
 * If the port plan declared `requiredMethods` and the materialized `.ts` omitted one, complete it
 * on the interface (delete(id: XId): Promise<void> when XId is in the file) and record a
 * systemDecision. Event ports are left alone. A method that cannot be derived is a finding, never
 * silence. Does not invent methods the plan did not require.
 */
export function ensureRequiredPortMethodsInSource(source: string, data: unknown): EnsurePortSourceResult {
  const empty: EnsurePortSourceResult = { source, completed: [], findings: [], decisions: [] };
  if (isAppendOnlyPortData(data)) return empty;
  const required = requiredMethodsFromPortData(data);
  if (!required.length) return empty;
  const entityId = isRecord(data) ? readString(data.entityId) : '';
  const located = locateRepositoryInterface(source);
  if (!located) {
    return {
      source,
      completed: [],
      findings: required.map(name =>
        `port required method '${name}' but no I*Repository interface is in the generated .ts — cannot complete mechanically`),
      decisions: [],
    };
  }
  const missing = required.filter(name => !interfaceMethodNames(source, located.open, located.end).has(name));
  if (!missing.length) return empty;

  let next = source;
  let open = located.open;
  let end = located.end;
  const completed: string[] = [];
  const findings: string[] = [];
  const decisions: CbSystemDecision[] = [];

  for (const name of missing) {
    if (name !== 'delete') {
      findings.push(`port required method '${name}' is missing from ${located.name} and cannot complete mechanically`);
      continue;
    }
    const idType = idTypeFromPortSource(next, entityId);
    if (!idType) {
      findings.push(`port required method 'delete' is missing from ${located.name} and no Id type is declared in the generated .ts — cannot complete mechanically`);
      continue;
    }
    const indent = interfaceIndent(next, open, end);
    const signature = `delete(id: ${idType}): Promise<void>;`;
    next = insertInterfaceMethod(next, end, signature, indent);
    const relocated = locateRepositoryInterface(next);
    if (relocated) { open = relocated.open; end = relocated.end; }
    completed.push(name);
    decisions.push({
      decisionId: `cbPortTsEnsure_${entityId || 'entity'}_${name}`,
      stage: 'cb-materialize',
      question: `port .ts for ${entityId || 'entity'} required ${name} (defs.requiredMethods) but the materialized interface omitted it`,
      chosen: 'addDeleteToPortTs',
      alternatives: ['failRun', 'leaveToRepair'],
      decidedBy: 'system',
      findingRef: `CB_PORT_TS_METHOD:${entityId || 'entity'}.${name}`,
      changeHint: `Added delete(id: ${idType}): Promise<void> to ${located.name}.`,
    });
  }
  return { source: next, completed, findings, decisions };
}

function pushDecision(item: Record<string, unknown>, decision: CbSystemDecision): void {
  const current = Array.isArray(item.systemDecisions) ? item.systemDecisions : [];
  item.systemDecisions = [...current, decision];
}

function methodNameOf(entry: unknown): string {
  return isRecord(entry) ? readString(entry.name) : '';
}

/**
 * If the l4 required `delete` and the model omitted it, add the signature and record a systemDecision.
 * Does not invent `delete` when it was not required. Mutates `item`.
 */
export function ensureRequiredPortMethods(
  item: Record<string, unknown>,
  requiredMethods: readonly string[],
): string[] {
  const methods = Array.isArray(item.methods) ? [...item.methods] : [];
  const names = new Set(methods.map(methodNameOf).filter(Boolean));
  const completed: string[] = [];
  for (const name of requiredMethods) {
    if (names.has(name)) continue;
    if (name === 'delete') methods.push({ ...DELETE_PORT_METHOD });
    else methods.push({ name, params: [], returns: 'Promise<void>', description: name });
    names.add(name);
    completed.push(name);
  }
  if (!completed.length) return completed;
  item.methods = methods;
  const entityId = readString(item.entityId) || 'entity';
  for (const name of completed) {
    pushDecision(item, {
      decisionId: `cbPortEnsure_${entityId}_${name}`,
      stage: 'cb-gen-port',
      question: `port for ${entityId} required ${name} (l4 has a matching operation) but the model omitted it`,
      chosen: `add${name.charAt(0).toUpperCase()}${name.slice(1)}ToPort`,
      alternatives: ['failRun', 'leaveToRepair'],
      decidedBy: 'system',
      findingRef: `CB_PORT_METHOD:${entityId}.${name}`,
      changeHint: `Added ${name}(...) to I${entityId}Repository.`,
    });
  }
  return completed;
}

/** Event ports are append-only: drop `delete` if the model (or a caller) put it there. */
export function stripEventPortDelete(item: Record<string, unknown>): string[] {
  if (!Array.isArray(item.methods)) return [];
  const next = item.methods.filter(m => methodNameOf(m) !== 'delete');
  if (next.length === item.methods.length) return [];
  item.methods = next;
  const entityId = readString(item.entityId) || 'entity';
  pushDecision(item, {
    decisionId: `cbPortStrip_${entityId}_delete`,
    stage: 'cb-gen-port',
    question: `event port ${entityId} must stay append-only; delete was present`,
    chosen: 'stripDeleteFromEventPort',
    alternatives: ['keepDelete'],
    decidedBy: 'system',
    findingRef: `CB_PORT_EVENT_APPEND_ONLY:${entityId}`,
    changeHint: `Removed delete from I${entityId}Repository (append-only event).`,
  });
  return ['delete'];
}
