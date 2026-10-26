/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { isTextOnlyChange } from '/_102035_/l2/solution/poolPlan.js';
import type { EffortAnswer, EffortInput, EffortPromptRequest, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const MASTER = { project: '102021', kind: 'l1', device: 'web' } as const;

const NO_DEFS = 'módulo sem defs gerados';
const NONE_APPLY = 'nenhum def aplica o id';

type StorFile = {
  project?: number | string;
  level?: number | string;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

function abend(item: string, reason: string): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'abend',
    create: [],
    regenerateDefs: [],
    materialize: [],
    remove: [],
    runAgents: [],
    contract: 'keep',
    abend: { reason },
  };
}

function computed(
  item: string,
  materialize: EffortUnitRef[],
  regenerateDefs: EffortUnitRef[] = [],
  remove: EffortUnitRef[] = [],
  create: EffortUnitRef[] = [],
): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'computed',
    create,
    regenerateDefs,
    materialize,
    remove,
    runAgents: [],
    contract: 'keep',
  };
}

function ruleIdOf(item: EffortInput['item']): string {
  const prefix = 'rule:';
  return item.changeId.startsWith(prefix) ? item.changeId.slice(prefix.length) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function listsRule(value: unknown, ruleId: string): boolean {
  if (value === ruleId) return true;
  if (!Array.isArray(value)) return false;
  return value.some(entry => {
    if (entry === ruleId) return true;
    return isRecord(entry) && entry.ruleId === ruleId;
  });
}

function unitId(artifactType: string, data: Record<string, unknown>): string {
  if (artifactType === 'usecase') return typeof data.usecaseId === 'string' ? data.usecaseId : '';
  if (artifactType === 'requestService') return typeof data.pageId === 'string' ? data.pageId : '';
  if (artifactType === 'domainEntity') {
    const entityId = typeof data.entityId === 'string' ? data.entityId : '';
    return entityId ? entityId.charAt(0).toLowerCase() + entityId.slice(1) : '';
  }
  return '';
}

function applies(artifactType: string, data: Record<string, unknown>, ruleId: string): boolean {
  if (artifactType === 'usecase') return listsRule(data.rulesApplied, ruleId);
  if (artifactType === 'domainEntity') {
    if (listsRule(data.invariants, ruleId)) return true;
    const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : {};
    const transitions = Array.isArray(lifecycle.transitions) ? lifecycle.transitions : [];
    return transitions.some(transition => isRecord(transition) && listsRule(transition.ruleRefs, ruleId));
  }
  if (artifactType === 'requestService') {
    const requests = Array.isArray(data.requests) ? data.requests : [];
    return requests.some(request => isRecord(request) && listsRule(request.rules, ruleId));
  }
  return false;
}

function kindOf(artifactType: string): EffortUnitRef['kind'] | null {
  if (artifactType === 'usecase') return 'usecase';
  if (artifactType === 'domainEntity') return 'entity';
  if (artifactType === 'requestService') return 'request';
  return null;
}

function sortUnits(units: EffortUnitRef[]): EffortUnitRef[] {
  return units.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function idAfter(changeId: string, prefix: string): string {
  return changeId.startsWith(prefix) ? changeId.slice(prefix.length) : '';
}

/** `task:<processId>.<taskId>` — the process id is the segment before the first dot. */
function taskProcessId(changeId: string): string {
  const rest = idAfter(changeId, 'task:');
  const dot = rest.indexOf('.');
  return dot > 0 ? rest.slice(0, dot) : '';
}

function eachDefinition(
  defs: Record<string, string>,
  visit: (defPath: string, artifactType: string, data: Record<string, unknown>) => void,
): void {
  for (const defPath of Object.keys(defs)) {
    const parsed = parseDefinitionSource(defs[defPath] ?? '');
    if (!('definition' in parsed) || !isRecord(parsed.definition)) continue;
    const definition = parsed.definition;
    const artifactType = typeof definition.artifactType === 'string' ? definition.artifactType : '';
    const data = isRecord(definition.data) ? definition.data : null;
    if (!artifactType || !data) continue;
    visit(defPath, artifactType, data);
  }
}

function citingUnits(defs: Record<string, string>, ruleId: string): EffortUnitRef[] {
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    const kind = kindOf(artifactType);
    if (!kind) return;
    const id = unitId(artifactType, data);
    if (!id || !applies(artifactType, data, ruleId)) return;
    units.push({ kind, id, path: defPath });
  });
  return sortUnits(units);
}

function workflowUnits(defs: Record<string, string>, processId: string): EffortUnitRef[] {
  if (!processId) return [];
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType !== 'workflowProcess') return;
    if (data.processId !== processId) return;
    units.push({ kind: 'workflow', id: processId, path: defPath });
  });
  return sortUnits(units);
}

const FORM_ATTRIBUTES = new Set(['type', 'values', 'required', 'collection', 'to']);
const TEXT_ATTRIBUTES = new Set(['title', 'description']);
const CITE_VALUE_KEYS = new Set(['name', 'field', 'path', 'column']);
const NO_FIELD_UNIT = 'no backend unit cites this field';
const NO_GRANT_UNIT = 'no backend unit cites this grant';

function sameName(left: string, right: string): boolean {
  return left.localeCompare(right, 'en', { sensitivity: 'accent' }) === 0;
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : '';
}

function fieldPathOf(changeId: string): string {
  return idAfter(changeId, 'field:');
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Keys whose value differs. Null when `before` or `after` is not an object. */
function changedAttributeKeys(item: EffortInput['item']): string[] | null {
  if (!isRecord(item.before) || !isRecord(item.after)) return null;
  const keys = new Set([...Object.keys(item.before), ...Object.keys(item.after)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (!sameJson(item.before[key], item.after[key])) changed.push(key);
  }
  return changed;
}

type FieldClass = 'added' | 'removed' | 'form' | 'validation';

function fieldClass(item: EffortInput['item']): FieldClass | null {
  if (item.op === 'added') return 'added';
  if (item.op === 'removed') return 'removed';
  if (item.op !== 'changed') return null;
  const changed = changedAttributeKeys(item);
  if (!changed || changed.length === 0) return null;
  if (changed.some(key => FORM_ATTRIBUTES.has(key))) return 'form';
  if (changed.some(key => !TEXT_ATTRIBUTES.has(key))) return 'validation';
  return null;
}

function textHits(text: string, full: string, last: string): boolean {
  return text === full || text === last;
}

/** Whole-string cite: a key, a `name`/`field`/`path`/`column` value, or a `columns` entry. Not prose. */
function citesPath(value: unknown, full: string, last: string): boolean {
  const walk = (node: unknown, parentKey: string | null): boolean => {
    if (typeof node === 'string') {
      if (parentKey === 'columns' || (parentKey !== null && CITE_VALUE_KEYS.has(parentKey))) {
        return textHits(node, full, last);
      }
      return false;
    }
    if (Array.isArray(node)) return node.some(entry => walk(entry, parentKey));
    if (!isRecord(node)) return false;
    for (const [key, child] of Object.entries(node)) {
      if (textHits(key, full, last)) return true;
      if (walk(child, key)) return true;
    }
    return false;
  };
  return walk(value, null);
}

/** The object that names the field also stores `attribute` as its own key. */
function storesAttribute(value: unknown, full: string, last: string, attribute: string): boolean {
  const walk = (node: unknown): boolean => {
    if (Array.isArray(node)) return node.some(entry => walk(entry));
    if (!isRecord(node)) return false;
    const namesField = Object.entries(node).some(([key, child]) => {
      if (textHits(key, full, last)) return true;
      if (typeof child === 'string' && CITE_VALUE_KEYS.has(key) && textHits(child, full, last)) return true;
      if (key === 'columns' && Array.isArray(child) && child.some(entry => typeof entry === 'string' && textHits(entry, full, last))) {
        return true;
      }
      return false;
    });
    if (namesField && Object.prototype.hasOwnProperty.call(node, attribute)) return true;
    return Object.values(node).some(child => walk(child));
  };
  return walk(value);
}

interface FieldUnits {
  entity: EffortUnitRef | null;
  table: EffortUnitRef | null;
  adapter: EffortUnitRef | null;
  writers: EffortUnitRef[];
  writeRequests: EffortUnitRef[];
  citing: EffortUnitRef[];
  outputSiblings: EffortUnitRef[];
  storing: (attribute: string) => EffortUnitRef[];
}

function entityData(defs: Record<string, string>, entity: string): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  eachDefinition(defs, (_defPath, artifactType, data) => {
    if (found || artifactType !== 'domainEntity') return;
    if (typeof data.entityId === 'string' && sameName(data.entityId, entity)) found = data;
  });
  return found;
}

function fieldPrefix(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(0, dot + 1);
}

function isSiblingField(name: string, path: string): boolean {
  if (name === path) return false;
  const prefix = fieldPrefix(path);
  if (!name.startsWith(prefix)) return false;
  const rest = name.slice(prefix.length);
  return rest.length > 0 && !rest.includes('.');
}

function nonDerivedSiblings(data: Record<string, unknown> | null, path: string): Set<string> {
  const names = new Set<string>();
  if (!data) return names;
  const fields = Array.isArray(data.fields) ? data.fields : [];
  for (const field of fields) {
    if (!isRecord(field) || typeof field.name !== 'string') continue;
    if (field.derived === true) continue;
    if (isSiblingField(field.name, path)) names.add(field.name);
  }
  return names;
}

function outputCitesSibling(data: Record<string, unknown>, entity: string, siblings: Set<string>): boolean {
  if (siblings.size === 0) return false;
  const requests = Array.isArray(data.requests) ? data.requests : [];
  const cites = (node: unknown): boolean => {
    if (Array.isArray(node)) return node.some(entry => cites(entry));
    if (!isRecord(node)) return false;
    for (const [key, child] of Object.entries(node)) {
      if ((key === 'field' || key === 'path') && typeof child === 'string' && siblings.has(child)) return true;
      if (cites(child)) return true;
    }
    return false;
  };
  return requests.some(request => {
    if (!isRecord(request) || !Array.isArray(request.output)) return false;
    return request.output.some(node =>
      isRecord(node) && typeof node.entity === 'string' && sameName(node.entity, entity) && cites(node));
  });
}

function remember(units: EffortUnitRef[], seen: Set<string>, unit: EffortUnitRef): void {
  const key = `${unit.kind}:${unit.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  units.push(unit);
}

function fieldUnits(defs: Record<string, string>, entity: string, path: string): FieldUnits {
  const full = path;
  const last = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path;
  const siblings = nonDerivedSiblings(entityData(defs, entity), path);
  let entityUnit: EffortUnitRef | null = null;
  let tableUnit: EffortUnitRef | null = null;
  let adapterUnit: EffortUnitRef | null = null;
  const writers: EffortUnitRef[] = [];
  const citing: EffortUnitRef[] = [];
  const outputSiblings: EffortUnitRef[] = [];
  const writerIds = new Set<string>();
  eachDefinition(defs, (defPath, artifactType, data) => {
    const entityId = typeof data.entityId === 'string' ? data.entityId : '';
    const ofEntity = entityId !== '' && sameName(entityId, entity);
    if (artifactType === 'domainEntity' && ofEntity) {
      const id = lowerFirst(entityId);
      if (!id) return;
      entityUnit = { kind: 'entity', id, path: defPath };
      if (citesPath(data, full, last)) citing.push(entityUnit);
      return;
    }
    if (artifactType === 'table' && ofEntity) {
      const id = typeof data.tableId === 'string' ? data.tableId : '';
      if (!id) return;
      tableUnit = { kind: 'table', id, path: defPath };
      if (citesPath(data, full, last)) citing.push(tableUnit);
      return;
    }
    if (artifactType === 'repositoryAdapter' && ofEntity) {
      const portId = typeof data.portId === 'string' ? data.portId : '';
      const id = lowerFirst(portId);
      if (!id) return;
      adapterUnit = { kind: 'repository', id, path: defPath };
      if (citesPath(data, full, last)) citing.push(adapterUnit);
      return;
    }
    if (artifactType === 'usecase' && ofEntity) {
      const operation = typeof data.operation === 'string' ? data.operation : '';
      if (operation !== 'create' && operation !== 'update') return;
      const id = unitId(artifactType, data);
      if (!id) return;
      const unit = { kind: 'usecase' as const, id, path: defPath };
      writers.push(unit);
      writerIds.add(id);
      if (citesPath(data, full, last)) citing.push(unit);
      return;
    }
    if (artifactType === 'requestService') {
      const id = unitId(artifactType, data);
      if (!id) return;
      const unit = { kind: 'request' as const, id, path: defPath };
      if (citesPath(data, full, last)) citing.push(unit);
      if (outputCitesSibling(data, entity, siblings)) outputSiblings.push(unit);
    }
  });
  const writeRequests: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType !== 'requestService') return;
    const id = unitId(artifactType, data);
    if (!id) return;
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const writes = requests.some(request =>
      isRecord(request) && Array.isArray(request.uses) && request.uses.some(use => typeof use === 'string' && writerIds.has(use)));
    if (writes) writeRequests.push({ kind: 'request', id, path: defPath });
  });
  const storing = (attribute: string): EffortUnitRef[] => {
    const stored: EffortUnitRef[] = [];
    eachDefinition(defs, (defPath, artifactType, data) => {
      if (!storesAttribute(data, full, last, attribute)) return;
      if (artifactType === 'domainEntity' && entityUnit && entityUnit.path === defPath) stored.push(entityUnit);
      if (artifactType === 'table' && tableUnit && tableUnit.path === defPath) stored.push(tableUnit);
      if (artifactType === 'repositoryAdapter' && adapterUnit && adapterUnit.path === defPath) stored.push(adapterUnit);
    });
    return stored;
  };
  return { entity: entityUnit, table: tableUnit, adapter: adapterUnit, writers, writeRequests, citing, outputSiblings, storing };
}

function columnPath(path: string): boolean {
  return path.length > 0 && !path.includes('.');
}

const GRANT_TEXT = new Set(['title', 'description']);

function grantIdOf(changeId: string): string {
  return idAfter(changeId, 'grant:');
}

/** `changed` whose every difference is `title` or `description`. No difference counts as text. */
function grantTextOnly(item: EffortInput['item']): boolean {
  if (item.kind !== 'grant' || item.op !== 'changed') return false;
  if (!isRecord(item.before) || !isRecord(item.after)) return false;
  const keys = new Set([...Object.keys(item.before), ...Object.keys(item.after)]);
  for (const key of keys) {
    if (sameJson(item.before[key], item.after[key])) continue;
    if (!GRANT_TEXT.has(key)) return false;
  }
  return true;
}

/** A whole string equal to the grant id or to `grant:<id>`. Not a fragment of prose. */
function citesGrant(value: unknown, grantId: string): boolean {
  const prefixed = `grant:${grantId}`;
  const walk = (node: unknown): boolean => {
    if (typeof node === 'string') return node === grantId || node === prefixed;
    if (Array.isArray(node)) return node.some(entry => walk(entry));
    if (!isRecord(node)) return false;
    return Object.values(node).some(child => walk(child));
  };
  return walk(value);
}

interface GrantDef {
  path: string;
  artifactType: string;
  artifactId: string;
  data: Record<string, unknown>;
}

function grantDefs(defs: Record<string, string>): GrantDef[] {
  const found: GrantDef[] = [];
  for (const defPath of Object.keys(defs)) {
    const parsed = parseDefinitionSource(defs[defPath] ?? '');
    if (!('definition' in parsed) || !isRecord(parsed.definition)) continue;
    const definition = parsed.definition;
    const artifactType = typeof definition.artifactType === 'string' ? definition.artifactType : '';
    const data = isRecord(definition.data) ? definition.data : null;
    if (!artifactType || !data) continue;
    const artifactId = typeof definition.artifactId === 'string' ? definition.artifactId : '';
    found.push({ path: defPath, artifactType, artifactId, data });
  }
  return found;
}

const GRANT_LIST_KIND: Record<string, 'authority' | 'scope' | 'seeds'> = {
  authorityMap: 'authority',
  accessScope: 'scope',
  persistenceSeeds: 'seeds',
};

function sharedUnit(def: GrantDef): EffortUnitRef | null {
  const kind = GRANT_LIST_KIND[def.artifactType];
  if (!kind || !def.artifactId) return null;
  return { kind, id: def.artifactId, path: def.path };
}

function controllerUnit(def: GrantDef): EffortUnitRef | null {
  if (def.artifactType !== 'httpController') return null;
  const pageId = typeof def.data.pageId === 'string' ? def.data.pageId : '';
  if (!pageId) return null;
  return { kind: 'controller', id: pageId, path: def.path };
}

function requestForPage(defs: GrantDef[], pageId: string): EffortUnitRef | null {
  for (const def of defs) {
    if (def.artifactType !== 'requestService') continue;
    if (def.data.pageId !== pageId) continue;
    return { kind: 'request', id: pageId, path: def.path };
  }
  return null;
}

function grantEffort(input: EffortInput, defs: Record<string, string>): EffortAnswer | null {
  const item = input.item;
  if (item.kind !== 'grant') return null;
  if (item.op !== 'added' && item.op !== 'removed' && item.op !== 'changed') return null;
  const grantId = grantIdOf(item.changeId);
  const parsed = grantDefs(defs);
  const regenerate: EffortUnitRef[] = [];
  const materialize: EffortUnitRef[] = [];
  const seenRegen = new Set<string>();
  const seenMat = new Set<string>();
  const takeRegen = (unit: EffortUnitRef | null): void => {
    if (unit) remember(regenerate, seenRegen, unit);
  };
  const takeMat = (unit: EffortUnitRef | null): void => {
    if (unit) remember(materialize, seenMat, unit);
  };
  if (item.op === 'added') {
    for (const def of parsed) {
      const unit = sharedUnit(def);
      takeRegen(unit);
      takeMat(unit);
    }
    if (materialize.length === 0) console.info(item.changeId, NO_GRANT_UNIT);
    return computed(item.changeId, sortUnits(materialize), sortUnits(regenerate));
  }
  for (const def of parsed) {
    if (!citesGrant(def.data, grantId)) continue;
    const shared = sharedUnit(def);
    const controller = controllerUnit(def);
    const unit = shared ?? controller;
    if (!unit) continue;
    takeRegen(unit);
    takeMat(unit);
    if (item.op === 'changed' && controller) takeMat(requestForPage(parsed, controller.id));
  }
  if (materialize.length === 0) console.info(item.changeId, NO_GRANT_UNIT);
  return computed(item.changeId, sortUnits(materialize), sortUnits(regenerate));
}

function fieldEffort(input: EffortInput, defs: Record<string, string>): EffortAnswer | null {
  const item = input.item;
  if (item.kind !== 'field') return null;
  const changeClass = fieldClass(item);
  if (!changeClass) return null;
  const path = fieldPathOf(item.changeId);
  const entity = item.entity;
  if (!path || !entity) return null;
  const found = fieldUnits(defs, entity, path);
  const picked: EffortUnitRef[] = [];
  const seen = new Set<string>();
  const take = (unit: EffortUnitRef | null): void => {
    if (unit) remember(picked, seen, unit);
  };
  const takeAll = (units: EffortUnitRef[]): void => {
    for (const unit of units) remember(picked, seen, unit);
  };
  const regen: EffortUnitRef[] = [];
  const regenSeen = new Set<string>();
  const takeRegen = (unit: EffortUnitRef | null): void => {
    if (unit) remember(regen, regenSeen, unit);
  };
  if (changeClass === 'validation') {
    takeAll(found.writers);
    takeAll(found.writeRequests);
  } else if (changeClass === 'form') {
    take(found.entity);
    if (found.table && found.citing.some(unit => unit.path === found.table?.path)) take(found.table);
    take(found.adapter);
    takeAll(found.writers);
    takeAll(found.citing.filter(unit => unit.kind === 'request'));
    takeAll(found.writeRequests);
    const changed = changedAttributeKeys(item) ?? [];
    if (changed.includes('values')) {
      if (found.entity && found.citing.some(unit => unit.path === found.entity?.path)) takeRegen(found.entity);
      if (found.table && found.citing.some(unit => unit.path === found.table?.path)) takeRegen(found.table);
    }
    for (const attribute of changed) {
      if (!FORM_ATTRIBUTES.has(attribute) || attribute === 'values') continue;
      for (const unit of found.storing(attribute)) takeRegen(unit);
    }
  } else {
    take(found.entity);
    take(found.adapter);
    const tableCites = found.table !== null && found.citing.some(unit => unit.path === found.table?.path);
    if (changeClass === 'added' ? columnPath(path) || tableCites : tableCites) take(found.table);
    takeAll(found.writers);
    takeAll(changeClass === 'added' ? found.outputSiblings : found.citing.filter(unit => unit.kind === 'request'));
    for (const unit of picked) takeRegen(unit);
  }
  if (picked.length === 0) {
    console.info(item.changeId, NO_FIELD_UNIT);
    return computed(item.changeId, []);
  }
  return computed(item.changeId, sortUnits(picked), sortUnits(regen));
}

/** Pure. `defs` maps each product def path to its `.defs.ts` source. */
export function describeEffortFrom(input: EffortInput, defs: Record<string, string>): EffortAnswer {
  const item = input.item.changeId;
  if (grantTextOnly(input.item)) {
    console.info(item);
    return computed(item, []);
  }
  if (isTextOnlyChange(input.item)) return computed(item, []);
  if (Object.keys(defs).length === 0) return abend(item, NO_DEFS);
  const { kind, op } = input.item;
  if (kind === 'rule' && op === 'changed') {
    const units = citingUnits(defs, ruleIdOf(input.item));
    if (units.length === 0) return abend(item, NONE_APPLY);
    return computed(item, units);
  }
  if (kind === 'rule' && op === 'removed') {
    const units = citingUnits(defs, ruleIdOf(input.item));
    return computed(item, units, units);
  }
  if (kind === 'process' && op === 'removed') {
    const units = workflowUnits(defs, idAfter(item, 'process:'));
    return computed(item, [], [], units);
  }
  if (kind === 'task' && op === 'removed') {
    const units = workflowUnits(defs, taskProcessId(item));
    return computed(item, units, units);
  }
  const field = fieldEffort(input, defs);
  if (field) return field;
  const grant = grantEffort(input, defs);
  if (grant) return grant;
  return abend(item, `kind/op fora da v1: ${kind} ${op}`);
}

function productPath(file: StorFile, moduleName: string): string | null {
  const appProject = typeof mls.actualProject === 'number' ? mls.actualProject : Number.NaN;
  if (Number(file.project) !== appProject || Number(file.level) !== 1) return null;
  if (file.status === 'deleted' || file.extension !== '.defs.ts' || !file.shortName) return null;
  const folder = String(file.folder || '');
  const prefix = `${moduleName}/`;
  if (folder !== moduleName && !folder.startsWith(prefix)) return null;
  const parts = folder.split('/');
  if (parts.includes('pipeline') || parts.includes('materialization')) return null;
  return `l1/${folder}/${file.shortName}.defs.ts`;
}

async function readStorText(file: StorFile, defPath: string): Promise<string> {
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch (error) {
      console.warn(`describeEffort: ${defPath}`, error);
    }
  }
  if (!file.getContent) return '';
  const content = await file.getContent();
  return typeof content === 'string' ? content : '';
}

type ChooseKind = 'usecase' | 'request' | 'entity';

interface CatalogUnit {
  kind: ChooseKind | 'workflow';
  id: string;
  path: string;
  lines: string[];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function catalogOf(defs: Record<string, string>): CatalogUnit[] {
  const units: CatalogUnit[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType === 'usecase') {
      const id = unitId(artifactType, data);
      if (!id) return;
      units.push({
        kind: 'usecase',
        id,
        path: defPath,
        lines: [
          `usecase ${id} entity=${typeof data.entityId === 'string' ? data.entityId : ''} operation=${typeof data.operation === 'string' ? data.operation : ''} rules=${JSON.stringify(stringList(data.rulesApplied))}`,
        ],
      });
      return;
    }
    if (artifactType === 'domainEntity') {
      const id = unitId(artifactType, data);
      if (!id) return;
      units.push({
        kind: 'entity',
        id,
        path: defPath,
        lines: [`entity ${id} invariants=${JSON.stringify(data.invariants ?? [])}`],
      });
      return;
    }
    if (artifactType === 'requestService') {
      const id = unitId(artifactType, data);
      if (!id) return;
      const requests = Array.isArray(data.requests) ? data.requests : [];
      const routes = requests.filter(isRecord).map(request => {
        const route = typeof request.route === 'string' ? request.route : '';
        return `route ${route} rules=${JSON.stringify(request.rules ?? [])}`;
      });
      units.push({ kind: 'request', id, path: defPath, lines: [`request ${id}`, ...routes] });
      return;
    }
    if (artifactType === 'workflowProcess' && typeof data.processId === 'string' && data.processId) {
      units.push({ kind: 'workflow', id: data.processId, path: defPath, lines: [`workflow ${data.processId}`] });
    }
  });
  return units.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function rulePhrase(item: EffortInput['item']): { id: string; description: string } {
  const after = isRecord(item.after) ? item.after : {};
  const description = typeof after.description === 'string' ? after.description : '';
  return { id: ruleIdOf(item), description };
}

function effortSchema(units: CatalogUnit[]): object {
  const usecases = units.filter(unit => unit.kind === 'usecase').map(unit => unit.id);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['existing', 'reason'],
    properties: {
      existing: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['usecase'],
          properties: {
            usecase: { type: 'string', enum: usecases },
          },
        },
      },
      reason: { type: 'string' },
    },
  };
}

const LADDER = [
  "A rule about data that an operation writes is guaranteed in that operation's usecase: pick it (existing). The requests that call it follow.",
  'New routes or usecases are not chosen here: they come from the page contract.',
  'Nothing on the backend only for a rule about display alone; then say why in reason.',
].join('\n');

/** Pure. A prompt only for `rule added`; every other item is null and `describeEffort` answers it. */
export function effortPromptFrom(input: EffortInput, defs: Record<string, string>): EffortPromptRequest | null {
  if (input.item.kind !== 'rule' || input.item.op !== 'added') return null;
  const units = catalogOf(defs);
  const rule = rulePhrase(input.item);
  const body = units.flatMap(unit => unit.lines);
  const prompt = [
    `Rule ${rule.id}: ${rule.description}`,
    'Units:',
    ...body,
    LADDER,
  ].join('\n');
  return { prompt, schema: effortSchema(units) };
}

interface ExistingChoice {
  usecase: string;
}

const OUTSIDE_SCHEMA = 'answer outside the schema';
const EMPTY_NEEDS_REASON = 'empty answer for a new rule needs a reason';

function schemaFailure(value: unknown, units: CatalogUnit[]): string | null {
  if (!isRecord(value)) return OUTSIDE_SCHEMA;
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'existing,reason') return OUTSIDE_SCHEMA;
  if (typeof value.reason !== 'string') return OUTSIDE_SCHEMA;
  if (!Array.isArray(value.existing)) return OUTSIDE_SCHEMA;
  const usecases = new Set(units.filter(unit => unit.kind === 'usecase').map(unit => unit.id));
  for (const entry of value.existing) {
    if (!isRecord(entry) || Object.keys(entry).sort().join(',') !== 'usecase') return OUTSIDE_SCHEMA;
    if (typeof entry.usecase !== 'string' || !usecases.has(entry.usecase)) {
      return `unknown usecase: ${typeof entry.usecase === 'string' ? entry.usecase : ''}`;
    }
  }
  if (value.existing.length === 0 && value.reason.trim() === '') return EMPTY_NEEDS_REASON;
  return null;
}

/** Requests whose some route `uses` cites `usecaseId`. */
function requestsUsing(defs: Record<string, string>, usecaseId: string): EffortUnitRef[] {
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType !== 'requestService') return;
    const id = unitId(artifactType, data);
    if (!id) return;
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const cites = requests.some(request =>
      isRecord(request) && Array.isArray(request.uses) && request.uses.includes(usecaseId));
    if (cites) units.push({ kind: 'request', id, path: defPath });
  });
  return units;
}

/** Pure. Checks the model output and builds the effort answer. A bad shape abends; it is never "nothing to do". */
export function finishEffortFrom(input: EffortInput, defs: Record<string, string>, modelOutput: unknown): EffortAnswer {
  const item = input.item.changeId;
  if (input.item.kind !== 'rule' || input.item.op !== 'added') {
    return abend(item, `kind/op fora da v1: ${input.item.kind} ${input.item.op}`);
  }
  const units = catalogOf(defs);
  const invalid = schemaFailure(modelOutput, units);
  if (invalid) return abend(item, invalid);
  const output = modelOutput as { existing: ExistingChoice[]; reason: string };
  const byKey = new Map(units.map(unit => [`${unit.kind}:${unit.id}`, unit]));
  const regenerate: EffortUnitRef[] = [];
  const seen = new Set<string>();
  const remember = (unit: EffortUnitRef): void => {
    const key = `${unit.kind}:${unit.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    regenerate.push(unit);
  };
  for (const choice of output.existing) {
    const unit = byKey.get(`usecase:${choice.usecase}`);
    if (!unit) return abend(item, `unknown usecase: ${choice.usecase}`);
    remember({ kind: 'usecase', id: choice.usecase, path: unit.path });
    for (const request of requestsUsing(defs, choice.usecase)) remember(request);
  }
  if (output.existing.length === 0) console.info(item, output.reason);
  const existingUnits = sortUnits(regenerate);
  return computed(item, existingUnits, existingUnits, [], []);
}

async function loadModuleDefs(moduleName: string): Promise<Record<string, string>> {
  const files = (mls.stor?.files ?? {}) as Record<string, StorFile | undefined>;
  const defs: Record<string, string> = {};
  for (const file of Object.values(files)) {
    if (!file) continue;
    const defPath = productPath(file, moduleName);
    if (!defPath) continue;
    const source = await readStorText(file, defPath);
    if (source) defs[defPath] = source;
  }
  return defs;
}

/** Reads product `.defs.ts` under `l1/<module>/` from `mls.stor.files` and classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  return describeEffortFrom(input, await loadModuleDefs(input.module));
}

/** Same read as `describeEffort`. Null unless the item is `rule added`. */
export async function effortPrompt(input: EffortInput): Promise<EffortPromptRequest | null> {
  return effortPromptFrom(input, await loadModuleDefs(input.module));
}

/** Same read as `describeEffort`, then `finishEffortFrom`. */
export async function finishEffort(input: EffortInput, modelOutput: unknown): Promise<EffortAnswer> {
  return finishEffortFrom(input, await loadModuleDefs(input.module), modelOutput);
}
