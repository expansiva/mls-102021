/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/gate.ts" enhancement="_blank"/>

import {
  D1_STORAGE_TARGETS,
  isRecord,
  pendingDefinition,
  type D1Definition,
  type D1Field,
  type D1LifecycleState,
  type D1StorageTarget,
  type D1Transition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { stampDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { isSafeToken, lowerFirst } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import {
  D1_DOMAIN_ACTIONS,
  D1_DOMAIN_VERSION,
  type D1DomainBuild,
  type D1DomainEmit,
  type D1DomainEntityPlan,
  type D1DomainProblem,
  type D1DomainSelection,
  type D1DomainValuePlan,
  type D1Enumeration,
  type D1Normalization,
  type D1PlacedRule,
  type D1RulePlacement,
} from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';

const REACHED = ['actor', 'command', 'time'] as const;
const FIELD_CONSUMED = new Set(['type', 'derived', 'to', 'fields', 'values']);

export interface D1DomainRequest {
  project: number;
  moduleName: string;
  selection: D1DomainSelection;
  /** Ontology bodies keyed by entityId. A filename is not an identity. */
  entities: Record<string, unknown>;
  ontologyIndex: unknown;
  /** Module rules artifact. Keys are matched exactly. */
  rules: unknown;
  /** Catalog document keyed by the entity `source` string. Absent means unread. */
  catalogs: Record<string, unknown>;
}

interface IndexRow {
  kind: string;
}

interface NestedNode {
  entityId: string;
  localName: string;
  path: string;
  fields: Record<string, unknown>;
}

interface RecordRef {
  entityId: string;
  path: string;
  to: string[] | null;
  shape: boolean;
}

interface Bag {
  nested: NestedNode[];
  refs: RecordRef[];
  shape: boolean;
}

interface Resolved {
  kind: 'entity' | 'value';
  id: string;
}

interface TransitionDraft {
  transitionId: string;
  from: string[];
  to: string;
  by: string[];
  ruleRefs: string[];
}

/**
 * One deterministic pass from the L4 record tree to domain defs.
 * No model, no eval, and no NS4 field list is rewritten into this tree.
 */
export function buildD1Domain(request: D1DomainRequest): D1DomainBuild {
  const problems: D1DomainProblem[] = [];
  const normalizations: D1Normalization[] = [];
  const moduleRules = ruleMap(request.rules);
  const moduleSource = `l4/${request.moduleName}/rules.defs.ts`;
  const known = indexRows(request.ontologyIndex, problems);
  const seen = new Set<string>();
  for (const entityId of request.selection.entities) {
    if (seen.has(entityId)) {
      error(problems, 'DUPLICATE_ENTITY', entityId, `Entity ${entityId} is selected more than once.`);
    }
    seen.add(entityId);
  }

  const selected = [...seen];
  const bags = new Map<string, Bag>();
  const blocked = new Set<string>();
  for (const entityId of selected) {
    const body = request.entities[entityId];
    const bag: Bag = { nested: [], refs: [], shape: false };
    if (!isRecord(body)) {
      error(problems, 'ENTITY_ABSENT', entityId, `Selected entity ${entityId} has no ontology body.`);
      blocked.add(entityId);
    } else if (text(body.entityId) !== entityId) {
      error(problems, 'IDENTITY_DIVERGENT', entityId, `Ontology body is not entity ${entityId}.`);
      blocked.add(entityId);
    } else {
      const moduleName = text(body.moduleName);
      if (moduleName && moduleName !== request.moduleName) {
        error(problems, 'MODULE_DIVERGENT', entityId, `Entity ${entityId} belongs to module ${moduleName}.`);
        blocked.add(entityId);
      }
      if (!known.has(entityId)) {
        error(problems, 'ENTITY_UNDECLARED', `${entityId}`, `Entity ${entityId} is not in the ontology index.`);
        blocked.add(entityId);
      }
      collect(body.record, entityId, bag, problems);
      if (bag.shape) blocked.add(entityId);
    }
    bags.set(entityId, bag);
  }

  const nested = [...bags.values()].flatMap(bag => bag.nested);
  const refs = [...bags.values()].flatMap(bag => bag.refs);
  const resolutions = new Map<string, Resolved>();
  const extracted = new Map<string, string>();
  resolveRefs(refs, nested, known, resolutions, extracted, problems, blocked);

  const cycles = structuralCycles(refs, resolutions, extracted, nested);
  for (const cycle of cycles) {
    error(problems, 'STRUCTURAL_CYCLE', cycle.join(' -> '), `Structural cycle ${cycle.join(' -> ')}.`);
    for (const node of cycle) {
      if (!node.startsWith('value:')) blocked.add(node);
    }
  }
  if (cycles.length > 0) {
    for (const [path, voId] of [...extracted.entries()]) {
      if (cycles.some(cycle => cycle.includes(`value:${voId}`))) extracted.delete(path);
    }
  }

  const plans: D1DomainEntityPlan[] = [];
  for (const entityId of selected.sort((left, right) => left.localeCompare(right))) {
    plans.push(planEntity(
      request,
      entityId,
      known.get(entityId),
      bags.get(entityId) || { nested: [], refs: [], shape: false },
      resolutions,
      extracted,
      moduleRules,
      moduleSource,
      problems,
      normalizations,
      blocked,
    ));
  }

  const valuePlans = planValues(request, nested, extracted, refs, resolutions, problems, blocked);
  applyOutputCollisions(plans, valuePlans, problems, blocked);
  for (const table of request.selection.tables) {
    const plan = plans.find(item => item.entityId === table.entity);
    if (plan?.storageTarget === 'mdm') {
      error(problems, 'MDM_LOCAL_TABLE', table.tableId, `Table ${table.tableId} is a local table for MDM role ${table.entity}.`);
    }
  }

  for (const plan of plans) {
    if (blocked.has(plan.entityId)) plan.definition = null;
  }
  for (const plan of valuePlans) {
    const ownerBlocked = [...extracted.entries()].some(([key, id]) => id === plan.valueObjectId && blocked.has(key.slice(0, key.indexOf(':'))));
    if (blocked.has(plan.valueObjectId) || ownerBlocked) plan.definition = null;
  }

  const preserved = plans.filter(plan => plan.action === 'preserve').map(plan => plan.defPath).sort();
  const removed = plans.filter(plan => plan.action === 'remove').map(plan => plan.defPath).sort();
  const ok = !problems.some(problem => problem.severity === 'error');
  const emit = ok ? emitParts(request, plans, valuePlans) : [];
  if (ok && extracted.size === 0 && nested.length > 0) {
    normalizations.push({
      code: 'NESTED_KEPT',
      path: request.moduleName,
      detail: 'No nested object is the target of a record reference. Nested fields stay on the entity.',
    });
  }

  sortInPlace(problems, problem => `${problem.path}\u0000${problem.code}\u0000${problem.message}`);
  sortInPlace(normalizations, item => `${item.path}\u0000${item.code}\u0000${item.detail}`);
  return {
    schemaVersion: D1_DOMAIN_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    ok,
    entities: plans,
    valueObjects: valuePlans.filter(plan => plan.definition).sort((left, right) => left.valueObjectId.localeCompare(right.valueObjectId)),
    problems,
    normalizations,
    preserved,
    removed,
    emit,
  };
}

function planEntity(
  request: D1DomainRequest,
  entityId: string,
  row: IndexRow | undefined,
  bag: Bag,
  resolutions: Map<string, Resolved>,
  extracted: Map<string, string>,
  moduleRules: Set<string>,
  moduleSource: string,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
): D1DomainEntityPlan {
  const planned = request.selection.files.filter(file => file.artifactType === 'domainEntity' && file.identity === entityId);
  let defPath = '';
  let action = '';
  if (planned.length !== 1) {
    error(problems, planned.length === 0 ? 'ENTITY_UNPLANNED' : 'NAME_COLLISION', entityId, planned.length === 0
      ? `Selected entity ${entityId} has no domain file in the plan.`
      : `Entity ${entityId} has more than one domain file in the plan.`);
    blocked.add(entityId);
  } else {
    defPath = planned[0].defPath;
    action = planned[0].action;
    if (!(D1_DOMAIN_ACTIONS as readonly string[]).includes(action)) {
      error(problems, 'ACTION_UNKNOWN', defPath, `Action ${action || '(missing)'} is not a domain action.`);
      blocked.add(entityId);
    } else if (action === 'conflict') {
      error(problems, 'PLAN_CONFLICT', defPath, `Entity ${entityId} is a plan conflict. The domain file was not written.`);
      blocked.add(entityId);
    }
  }

  const body = isRecord(request.entities[entityId]) ? request.entities[entityId] : null;
  const storage = body && !blocked.has(entityId) ? storageOf(entityId, row, body, problems, normalizations, blocked) : '';
  const lifecycle = body ? readLifecycle(entityId, body, problems, normalizations, blocked) : { states: [], transitions: [], derivedInitial: null };
  const uniqueKeys = body ? readUniqueKeys(entityId, body, problems, blocked) : [];
  const enumerations: D1Enumeration[] = [];
  const fields = body && !bag.shape ? emitFields(entityId, body, resolutions, extracted, problems, normalizations, enumerations, blocked) : [];
  const source = body ? text(body.source) : '';
  const catalog = source && Object.prototype.hasOwnProperty.call(request.catalogs, source) ? request.catalogs[source] : undefined;
  if (source && catalog === undefined) {
    review(problems, 'CATALOG_UNREAD', source, `Catalog ${source} was not opened. Citations keep that owner and their spelling.`);
  }
  const catalogRules = catalog === undefined ? null : ruleMap(catalog);
  if (catalogRules && catalogRules.size === 0 && isRecord(catalog) && !isRecord(catalog.rules)) {
    error(problems, 'CATALOG_SHAPE', source, `Catalog ${source} has no rules object.`);
    blocked.add(entityId);
  }
  const cited = body ? citedRules(entityId, body, lifecycle.transitions, problems, blocked) : [];
  const rules = placeRules(entityId, cited, lifecycle.transitions, moduleRules, catalogRules, source, moduleSource, problems, normalizations, blocked);
  const show = Boolean(body && storage && !blocked.has(entityId) && (action === 'create' || action === 'update' || action === 'recompose' || action === 'preserve'));
  const definition = show
    ? entityDefinition(request, entityId, storage as D1StorageTarget, fields, lifecycle, rules, extracted)
    : null;
  return {
    entityId,
    action,
    defPath,
    storageTarget: storage,
    emitsLocalPersistence: false,
    derivedInitial: lifecycle.derivedInitial,
    uniqueKeys,
    enumerations,
    rules,
    definition: blocked.has(entityId) ? null : definition,
  };
}

function entityDefinition(
  request: D1DomainRequest,
  entityId: string,
  storage: D1StorageTarget,
  fields: D1Field[],
  lifecycle: { states: D1LifecycleState[]; transitions: D1Transition[]; derivedInitial: string | null },
  rules: D1PlacedRule[],
  extracted: Map<string, string>,
): D1Definition {
  const voIds = [...new Set(fields.filter(field => field.type === 'record' && field.ref && extractedHas(extracted, field.ref)).map(field => field.ref as string))];
  const imports = voIds.map(id => valuePath(request.moduleName, id)).sort();
  return pendingDefinition('domainEntity', entityId, request.moduleName, {
    entityId,
    storageTarget: storage,
    fields,
    lifecycle: { states: lifecycle.states, transitions: lifecycle.transitions },
    invariants: rules.filter(rule => rule.placement === 'invariant').map(rule => rule.ruleId),
    imports,
  });
}

function planValues(
  request: D1DomainRequest,
  nested: NestedNode[],
  extracted: Map<string, string>,
  refs: RecordRef[],
  resolutions: Map<string, Resolved>,
  problems: D1DomainProblem[],
  blocked: Set<string>,
): D1DomainValuePlan[] {
  const byId = new Map<string, NestedNode>();
  for (const [path, voId] of extracted) {
    const node = nested.find(item => item.entityId && `${item.entityId}:${item.path}` === path);
    if (!node) continue;
    if (byId.has(voId)) {
      error(problems, 'NAME_COLLISION', voId, `Value object ${voId} is declared more than once.`);
      blocked.add(node.entityId);
      continue;
    }
    byId.set(voId, node);
  }
  const plans: D1DomainValuePlan[] = [];
  for (const [voId, node] of [...byId.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const referencedBy = refs
      .filter(ref => resolutions.get(refKey(ref))?.kind === 'value' && resolutions.get(refKey(ref))?.id === voId)
      .map(ref => `${ref.entityId}.${ref.path}`)
      .sort();
    if (referencedBy.length === 0) {
      error(problems, 'VALUE_UNREFERENCED', voId, `Value object ${voId} has no consumer.`);
      continue;
    }
    const enumerations: D1Enumeration[] = [];
    const fields = emitRaw(node.entityId, node.fields, '', new Map(), resolutions, new Set(), problems, [], enumerations, blocked);
    const definition = pendingDefinition('valueObject', voId, request.moduleName, {
      valueObjectId: voId,
      fields,
      referencedBy,
    });
    plans.push({
      valueObjectId: voId,
      defPath: valuePath(request.moduleName, voId),
      referencedBy,
      definition,
    });
  }
  return plans;
}

function emitParts(request: D1DomainRequest, plans: D1DomainEntityPlan[], values: D1DomainValuePlan[]): D1DomainEmit[] {
  const emittedValues = values.filter(plan => plan.definition);
  const valueById = new Map(emittedValues.map(plan => [plan.valueObjectId, plan]));
  const entityById = new Map(plans.filter(plan => plan.definition && plan.action !== 'preserve' && plan.action !== 'remove').map(plan => [plan.entityId, plan]));
  const out: D1DomainEmit[] = [];
  for (const plan of emittedValues) {
    if (!plan.definition) continue;
    const pipeline = itemFor(request, 'valueObject', plan.valueObjectId, plan.defPath, [], []);
    const definition = stampDefinition(plan.definition, pipeline.defPath, pipeline.dependsFiles);
    out.push({ definition, pipeline: [pipeline] });
  }
  for (const plan of plans) {
    if (!plan.definition || plan.action === 'preserve' || plan.action === 'remove') continue;
    const data = isRecord(plan.definition.data) ? plan.definition.data : {};
    const fields = Array.isArray(data.fields) ? data.fields : [];
    const depends: string[] = [];
    for (const field of fields) {
      if (!isRecord(field) || field.type !== 'record' || typeof field.ref !== 'string') continue;
      if (entityById.has(field.ref)) depends.push(pipelineId(request.project, request.moduleName, 'domainEntity', field.ref));
      else if (valueById.has(field.ref)) depends.push(pipelineId(request.project, request.moduleName, 'valueObject', field.ref));
    }
    const dependsOn = [...new Set(depends)].sort();
    const dependsFiles = dependsOn.map(id => {
      const owner = id.split('/').pop() || '';
      const entity = entityById.get(owner);
      if (entity) return qualifyDefPath(request.project, entity.defPath);
      const value = valueById.get(owner);
      return value ? qualifyDefPath(request.project, value.defPath) : '';
    }).filter(Boolean);
    const pipeline = itemFor(request, 'domainEntity', plan.entityId, plan.defPath, dependsOn, dependsFiles);
    const definition = stampDefinition(plan.definition, pipeline.defPath, pipeline.dependsFiles);
    out.push({ definition, pipeline: [pipeline] });
  }
  return out;
}

function itemFor(
  request: D1DomainRequest,
  type: 'domainEntity' | 'valueObject',
  owner: string,
  logical: string,
  dependsOn: string[],
  dependsFiles: string[],
): D1PipelineItem {
  const defPath = qualifyDefPath(request.project, logical);
  return {
    id: pipelineId(request.project, request.moduleName, type, owner),
    type,
    defPath,
    outputPath: futureOutputPath(defPath),
    outputAvailability: 'future',
    dependsFiles,
    dependsOn,
    skills: skillPaths(type),
  };
}

function resolveRefs(
  refs: RecordRef[],
  nested: NestedNode[],
  known: Map<string, IndexRow>,
  resolutions: Map<string, Resolved>,
  extracted: Map<string, string>,
  problems: D1DomainProblem[],
  blocked: Set<string>,
): void {
  for (const ref of refs) {
    const origin = `${ref.entityId}.record.fields.${ref.path}.to`;
    if (ref.shape || !ref.to) {
      error(problems, 'REFERENCE_SHAPE', origin, `Record ${ref.entityId}.${ref.path} has no target list.`);
      blocked.add(ref.entityId);
      continue;
    }
    if (ref.to.length === 0) {
      error(problems, 'REFERENCE_ABSENT', origin, `Record ${ref.entityId}.${ref.path} names no target.`);
      blocked.add(ref.entityId);
      continue;
    }
    if (ref.to.length > 1) {
      error(problems, 'AMBIGUOUS_REFERENCE', origin, `Record ${ref.entityId}.${ref.path} names ${ref.to.join(', ')}. No target was chosen.`);
      blocked.add(ref.entityId);
      continue;
    }
    const target = ref.to[0];
    const nodes = nested.filter(node => node.localName === target);
    const isEntity = known.has(target);
    if (isEntity && nodes.length > 0) {
      error(problems, 'AMBIGUOUS_REFERENCE', origin, `Target ${target} is both an entity and a nested object.`);
      blocked.add(ref.entityId);
      continue;
    }
    if (isEntity) {
      resolutions.set(refKey(ref), { kind: 'entity', id: target });
      continue;
    }
    if (nodes.length > 1) {
      error(problems, 'AMBIGUOUS_REFERENCE', origin, `Target ${target} matches more than one nested object.`);
      blocked.add(ref.entityId);
      continue;
    }
    if (nodes.length === 0) {
      error(problems, 'REFERENCE_MISSING', origin, `Record ${ref.entityId}.${ref.path} targets ${target}, which is not an entity.`);
      blocked.add(ref.entityId);
      continue;
    }
    const node = nodes[0];
    if (!isSafeToken(target)) {
      error(problems, 'VALUE_ID', origin, `Nested object ${target} is not a token, so it was not extracted.`);
      blocked.add(ref.entityId);
      continue;
    }
    extracted.set(`${node.entityId}:${node.path}`, target);
    resolutions.set(refKey(ref), { kind: 'value', id: target });
  }
}

function structuralCycles(
  refs: RecordRef[],
  resolutions: Map<string, Resolved>,
  extracted: Map<string, string>,
  nested: NestedNode[],
): string[][] {
  const graph = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    const list = graph.get(from) || [];
    if (!list.includes(to)) list.push(to);
    graph.set(from, list);
    if (!graph.has(to)) graph.set(to, []);
  };
  for (const ref of refs) {
    const resolved = resolutions.get(refKey(ref));
    if (!resolved) continue;
    link(ref.entityId, resolved.kind === 'entity' ? resolved.id : `value:${resolved.id}`);
  }
  for (const [key, voId] of extracted) {
    const node = nested.find(item => `${item.entityId}:${item.path}` === key);
    if (!node) continue;
    const inner: RecordRef[] = [];
    collectRefs(node.fields, node.entityId, '', inner);
    for (const ref of inner) {
      if (!ref.to || ref.to.length !== 1) continue;
      const target = ref.to[0];
      if (extractedHas(extracted, target)) link(`value:${voId}`, `value:${target}`);
    }
  }
  return findCycles(graph);
}

function findCycles(graph: Map<string, string[]>): string[][] {
  const color = new Map<string, number>();
  const stack: string[] = [];
  const found: string[][] = [];
  const visit = (node: string) => {
    color.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) || []) {
      const state = color.get(next) || 0;
      if (state === 0) visit(next);
      else if (state === 1) {
        const at = stack.indexOf(next);
        if (at >= 0) found.push([...stack.slice(at), next]);
      }
    }
    stack.pop();
    color.set(node, 2);
  };
  for (const node of [...graph.keys()].sort()) {
    if (!color.get(node)) visit(node);
  }
  return found;
}

function emitFields(
  entityId: string,
  body: Record<string, unknown>,
  resolutions: Map<string, Resolved>,
  extracted: Map<string, string>,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  enumerations: D1Enumeration[],
  blocked: Set<string>,
): D1Field[] {
  const record = isRecord(body.record) ? body.record : null;
  if (!record || !isRecord(record.fields) || Array.isArray(record.fields)) return [];
  return emitRaw(entityId, record.fields, '', extracted, resolutions, new Set(), problems, normalizations, enumerations, blocked);
}

function emitRaw(
  entityId: string,
  fields: Record<string, unknown>,
  prefix: string,
  extracted: Map<string, string>,
  resolutions: Map<string, Resolved>,
  names: Set<string>,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  enumerations: D1Enumeration[],
  blocked: Set<string>,
): D1Field[] {
  const out: D1Field[] = [];
  for (const [key, raw] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const origin = `${entityId}.record.fields.${path}`;
    if (!isRecord(raw) || Array.isArray(raw)) {
      error(problems, 'FIELD_SHAPE', origin, `Field ${path} is not an object.`);
      blocked.add(entityId);
      continue;
    }
    if (names.has(path)) {
      error(problems, 'NAME_COLLISION', origin, `Field ${path} is declared more than once.`);
      blocked.add(entityId);
      continue;
    }
    names.add(path);
    noteOmitted(origin, raw, normalizations);
    const type = text(raw.type);
    if (!type) {
      error(problems, 'FIELD_TYPE', origin, `Field ${path} has no type.`);
      blocked.add(entityId);
      continue;
    }
    const derived = readDerived(origin, raw, problems, normalizations, blocked, entityId);
    const voId = extracted.get(`${entityId}:${path}`);
    if (voId) {
      out.push(field(path, 'record', derived, voId));
      continue;
    }
    if (type === 'object' && raw.fields === undefined) {
      normalizations.push({ code: 'OBJECT_LEAF', path: origin, detail: 'no nested field map' });
      out.push(field(path, type, derived));
      continue;
    }
    if (type === 'object' && isRecord(raw.fields) && !Array.isArray(raw.fields)) {
      out.push(field(path, type, derived));
      out.push(...emitRaw(entityId, raw.fields, path, extracted, resolutions, names, problems, normalizations, enumerations, blocked));
      continue;
    }
    if (type === 'object') {
      error(problems, 'FIELD_SHAPE', origin, `Object ${path} has a nested field list that is not a v3 map.`);
      blocked.add(entityId);
      continue;
    }
    if (raw.to !== undefined && type !== 'record') {
      normalizations.push({ code: 'TO_NOT_A_REFERENCE', path: origin, detail: type });
    }
    if (type === 'record') {
      const resolved = resolutions.get(`${entityId}:${path}`);
      if (!resolved) {
        const origin = `${entityId}.record.fields.${path}.to`;
        if (!problems.some(problem => problem.path === origin)) {
          error(problems, 'REFERENCE_MISSING', origin, `Record ${entityId}.${path} has no resolved target.`);
        }
        blocked.add(entityId);
        continue;
      }
      out.push(field(path, 'record', derived, resolved.id));
      continue;
    }
    if (type === 'enum') {
      const values = readEnum(origin, raw, problems, blocked, entityId);
      if (values) enumerations.push({ path, values });
      out.push(field(path, 'enum', derived));
      continue;
    }
    if (raw.fields !== undefined) {
      error(problems, 'FIELD_SHAPE', origin, `Field ${path} has nested fields and type ${type}.`);
      blocked.add(entityId);
      continue;
    }
    out.push(field(path, type, derived));
  }
  return out;
}

function readEnum(
  origin: string,
  raw: Record<string, unknown>,
  problems: D1DomainProblem[],
  blocked: Set<string>,
  entityId: string,
): string[] | null {
  if (!Array.isArray(raw.values) || raw.values.length === 0) {
    error(problems, 'ENUM_VALUES', origin, `Enum ${origin} has no values.`);
    blocked.add(entityId);
    return null;
  }
  const values: string[] = [];
  raw.values.forEach((entry, index) => {
    const value = typeof entry === 'string' ? entry : isRecord(entry) ? text(entry.value) : '';
    if (!value) {
      error(problems, 'ENUM_VALUE', `${origin}.values.${index}`, `Enum value ${index} on ${origin} is not a string.`);
      blocked.add(entityId);
      return;
    }
    values.push(value);
  });
  return values;
}

function readDerived(
  origin: string,
  raw: Record<string, unknown>,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
  entityId: string,
): boolean | undefined {
  if (raw.derived === undefined) return undefined;
  if (typeof raw.derived !== 'boolean') {
    error(problems, 'FIELD_DERIVED', origin, `Field ${origin} derived is not a boolean.`);
    blocked.add(entityId);
    return undefined;
  }
  if (raw.derived === false) {
    normalizations.push({ code: 'DERIVED_FALSE_OMITTED', path: origin, detail: 'false' });
    return undefined;
  }
  return true;
}

function noteOmitted(origin: string, raw: Record<string, unknown>, normalizations: D1Normalization[]): void {
  if (raw.of !== undefined) {
    normalizations.push({ code: 'FIELD_OF_NOT_REFERENCE', path: origin, detail: text(raw.of) || '(empty)' });
  }
  const dropped = Object.keys(raw).filter(key => !FIELD_CONSUMED.has(key) && key !== 'of').sort();
  if (dropped.length > 0) {
    normalizations.push({ code: 'FIELD_KEYS_OMITTED', path: origin, detail: dropped.join(',') });
  }
}

function field(name: string, type: string, derived?: boolean, ref?: string): D1Field {
  const out: D1Field = { name, type };
  if (derived) out.derived = true;
  if (ref) out.ref = ref;
  return out;
}

function readLifecycle(
  entityId: string,
  body: Record<string, unknown>,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
): { states: D1LifecycleState[]; transitions: D1Transition[]; derivedInitial: string | null } {
  const empty = { states: [] as D1LifecycleState[], transitions: [] as D1Transition[], derivedInitial: null };
  const hasStates = Object.prototype.hasOwnProperty.call(body, 'lifecycleStates');
  const hasTransitions = Object.prototype.hasOwnProperty.call(body, 'transitions');
  if (!hasStates && !hasTransitions) {
    normalizations.push({ code: 'NO_LIFECYCLE', path: entityId, detail: 'no lifecycleStates and no transitions' });
    return empty;
  }
  if (!hasStates || !hasTransitions || !Array.isArray(body.lifecycleStates) || !Array.isArray(body.transitions)) {
    error(problems, 'LIFECYCLE_SHAPE', entityId, `Entity ${entityId} lifecycle is not a state list and a transition list.`);
    blocked.add(entityId);
    return empty;
  }
  const states: D1LifecycleState[] = [];
  body.lifecycleStates.forEach((entry, index) => {
    const path = `${entityId}.lifecycleStates.${index}`;
    if (!isRecord(entry)) {
      error(problems, 'LIFECYCLE_SHAPE', path, `State ${index} is not an object.`);
      blocked.add(entityId);
      return;
    }
    const state = text(entry.state);
    const reachedBy = text(entry.reachedBy);
    if (!state || !(REACHED as readonly string[]).includes(reachedBy)) {
      error(problems, 'REACHED_BY', path, `State ${state || index} has no actor, command or time marker.`);
      blocked.add(entityId);
      return;
    }
    const extra = Object.keys(entry).filter(key => key !== 'state' && key !== 'reachedBy');
    if (extra.length) normalizations.push({ code: 'STATE_KEYS_OMITTED', path, detail: extra.sort().join(',') });
    states.push({ state, reachedBy: reachedBy as D1LifecycleState['reachedBy'] });
  });
  const transitions: TransitionDraft[] = [];
  body.transitions.forEach((entry, index) => {
    const path = `${entityId}.transitions.${index}`;
    const draft = readTransition(path, entry, problems, normalizations, blocked, entityId);
    if (draft) transitions.push(draft);
  });
  const timeStates = new Set(states.filter(state => state.reachedBy === 'time').map(state => state.state));
  for (const state of timeStates) {
    normalizations.push({ code: 'TIME_STATE_NOT_A_WRITE', path: `${entityId}.${state}`, detail: 'reachedBy time' });
  }
  for (const transition of transitions) {
    if (timeStates.has(transition.to)) {
      error(problems, 'TIME_NOT_PERSISTED', `${entityId}.transitions.${transition.transitionId}`, `Transition ${transition.transitionId} writes ${transition.to}, which is reached by time.`);
      blocked.add(entityId);
    }
  }
  let derivedInitial: string | null = null;
  if (states.length > 0 && !blocked.has(entityId)) {
    const targets = new Set(transitions.map(transition => transition.to));
    const initials = states
      .filter(state => state.reachedBy !== 'time' && !targets.has(state.state))
      .map(state => state.state);
    if (initials.length !== 1) {
      error(problems, 'INITIAL_STATE', entityId, `Entity ${entityId} has ${initials.length} states that no transition reaches.`);
      blocked.add(entityId);
    } else {
      derivedInitial = initials[0];
      normalizations.push({ code: 'INITIAL_STATE_DERIVED', path: entityId, detail: derivedInitial });
    }
  }
  return {
    states,
    transitions: transitions.map(transition => ({
      transitionId: transition.transitionId,
      from: transition.from,
      to: transition.to,
      by: transition.by,
      ruleRefs: transition.ruleRefs,
    })),
    derivedInitial,
  };
}

function readTransition(
  path: string,
  entry: unknown,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
  entityId: string,
): TransitionDraft | null {
  if (!isRecord(entry)) {
    error(problems, 'TRANSITION_SHAPE', path, `Transition ${path} is not an object.`);
    blocked.add(entityId);
    return null;
  }
  const transitionId = text(entry.transitionId);
  const to = text(entry.to);
  if (!transitionId || !to || !Array.isArray(entry.from) || !Array.isArray(entry.by) || !Array.isArray(entry.ruleRefs)) {
    error(problems, 'TRANSITION_SHAPE', path, `Transition ${transitionId || path} does not keep from, to, by and ruleRefs.`);
    blocked.add(entityId);
    return null;
  }
  const from = stringItems(entry.from);
  const by = stringItems(entry.by);
  const ruleRefs = stringItems(entry.ruleRefs);
  if (!from || !by || !ruleRefs || from.length === 0 || by.length === 0) {
    error(problems, 'TRANSITION_SHAPE', path, `Transition ${transitionId} has an empty from, by or a non-string rule ref.`);
    blocked.add(entityId);
    return null;
  }
  const extra = Object.keys(entry).filter(key => !['transitionId', 'from', 'to', 'by', 'ruleRefs'].includes(key));
  if (extra.length) normalizations.push({ code: 'TRANSITION_KEYS_OMITTED', path, detail: extra.sort().join(',') });
  if (transitionId === 'setStatus') {
    error(problems, 'FREE_SET_STATUS', path, 'A named transition was collapsed to setStatus.');
    blocked.add(entityId);
    return null;
  }
  return { transitionId, from, to, by, ruleRefs };
}

function citedRules(
  entityId: string,
  body: Record<string, unknown>,
  transitions: D1Transition[],
  problems: D1DomainProblem[],
  blocked: Set<string>,
): string[] {
  if (body.rules === undefined) return transitions.flatMap(transition => transition.ruleRefs);
  if (!Array.isArray(body.rules)) {
    error(problems, 'RULES_SHAPE', entityId, `Entity ${entityId} rules are not a list of ids.`);
    blocked.add(entityId);
    return [];
  }
  const cited: string[] = [];
  body.rules.forEach((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      error(problems, 'RULES_SHAPE', `${entityId}.rules.${index}`, `Rule citation ${index} is not an id.`);
      blocked.add(entityId);
      return;
    }
    if (cited.includes(entry)) {
      error(problems, 'DUPLICATE_RULE', `${entityId}.rules.${index}`, `Rule ${entry} is cited twice.`);
      blocked.add(entityId);
      return;
    }
    cited.push(entry);
  });
  for (const transition of transitions) {
    for (const ruleId of transition.ruleRefs) {
      if (!cited.includes(ruleId)) cited.push(ruleId);
    }
  }
  return cited;
}

/**
 * Exact id only. A catalog key keeps the catalog owner and is not rewritten
 * onto a module key. A module rule on no transition, or on every transition,
 * is intrinsic. A module rule on only some transitions stays on those
 * transitions and is referenced for application; it does not become a read.
 */
function placeRules(
  entityId: string,
  cited: string[],
  transitions: D1Transition[],
  moduleRules: Set<string>,
  catalogRules: Set<string> | null,
  source: string,
  moduleSource: string,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
): D1PlacedRule[] {
  const placed: D1PlacedRule[] = [];
  for (const ruleId of cited) {
    const inCatalog = catalogRules?.has(ruleId) === true;
    const inModule = moduleRules.has(ruleId);
    if (inCatalog || (catalogRules === null && source && !inModule)) {
      if (inModule) {
        normalizations.push({
          code: 'PLATFORM_RULE_NOT_LOCAL',
          path: `${entityId}.${ruleId}`,
          detail: 'The module artifact repeats this id. It was not copied into invariants.',
        });
      }
      placed.push({ ruleId, owner: 'platform', source: source || moduleSource, placement: 'platform' });
      continue;
    }
    if (inModule) {
      const onEvery = transitions.length > 0 && transitions.every(transition => transition.ruleRefs.includes(ruleId));
      const onNone = transitions.every(transition => !transition.ruleRefs.includes(ruleId));
      const placement: D1RulePlacement = onEvery || onNone ? 'invariant' : 'application';
      placed.push({ ruleId, owner: 'module', source: moduleSource, placement });
      continue;
    }
    error(problems, 'RULE_UNKNOWN', `${entityId}.rules.${ruleId}`, `Rule ${ruleId} matches neither the module rules nor the source catalog.`);
    blocked.add(entityId);
  }
  return placed;
}

function readUniqueKeys(entityId: string, body: Record<string, unknown>, problems: D1DomainProblem[], blocked: Set<string>): string[][] {
  if (body.uniqueKeys === undefined) return [];
  if (!Array.isArray(body.uniqueKeys)) {
    error(problems, 'UNIQUE_KEYS', entityId, `Entity ${entityId} uniqueKeys is not a list.`);
    blocked.add(entityId);
    return [];
  }
  const keys: string[][] = [];
  for (let index = 0; index < body.uniqueKeys.length; index += 1) {
    const row = body.uniqueKeys[index];
    const fields = Array.isArray(row) ? stringItems(row) : null;
    if (!fields || fields.length === 0) {
      error(problems, 'UNIQUE_KEYS', `${entityId}.uniqueKeys.${index}`, `Unique key ${index} is not a list of field names.`);
      blocked.add(entityId);
      return [];
    }
    keys.push(fields);
  }
  return keys;
}

function storageOf(
  entityId: string,
  row: IndexRow | undefined,
  body: Record<string, unknown>,
  problems: D1DomainProblem[],
  normalizations: D1Normalization[],
  blocked: Set<string>,
): string {
  const fromBody = text(body.kind);
  const fromIndex = row?.kind || '';
  if (fromIndex && fromBody && fromIndex !== fromBody) {
    error(problems, 'KIND_DIVERGENT', entityId, `Index kind ${fromIndex} does not match the entity kind ${fromBody}.`);
    blocked.add(entityId);
    return '';
  }
  const kind = fromIndex || fromBody;
  if (!kind) {
    error(problems, 'KIND_UNKNOWN', entityId, `Entity ${entityId} has no kind.`);
    blocked.add(entityId);
    return '';
  }
  if (fromIndex && !fromBody) normalizations.push({ code: 'KIND_FROM_INDEX', path: entityId, detail: fromIndex });
  if (!fromIndex && fromBody) normalizations.push({ code: 'KIND_FROM_ENTITY', path: entityId, detail: fromBody });
  const declared = isRecord(body.storage) ? text(body.storage.target) : '';
  if (kind === 'role') {
    if (declared && declared !== 'mdm') {
      error(problems, 'STORAGE_CONTRADICTION', entityId, `Role ${entityId} declares storage ${declared}.`);
      blocked.add(entityId);
      return '';
    }
    if (!declared) normalizations.push({ code: 'ROLE_STORAGE_MDM', path: entityId, detail: 'kind role has no storage target' });
    return 'mdm';
  }
  if (kind !== 'entity') {
    error(problems, 'KIND_UNKNOWN', entityId, `Kind ${kind} is not role or entity.`);
    blocked.add(entityId);
    return '';
  }
  if ((D1_STORAGE_TARGETS as readonly string[]).includes(declared) && declared !== 'mdm') return declared;
  error(problems, 'STORAGE_UNKNOWN', entityId, `Entity ${entityId} has no moduleDatabase, external or derived storage.`);
  blocked.add(entityId);
  return '';
}

function collect(record: unknown, entityId: string, bag: Bag, problems: D1DomainProblem[]): void {
  if (!isRecord(record)) {
    error(problems, 'RECORD_ABSENT', entityId, `Entity ${entityId} has no record.`);
    bag.shape = true;
    return;
  }
  if (Array.isArray(record.fields) || !isRecord(record.fields)) {
    error(problems, 'RECORD_SHAPE', `${entityId}.record.fields`, `Entity ${entityId} record.fields is not a v3 field map. An NS4 field list is not converted.`);
    bag.shape = true;
    return;
  }
  collectRefs(record.fields, entityId, '', bag.refs);
  collectNested(record.fields, entityId, '', bag.nested);
}

function collectNested(fields: Record<string, unknown>, entityId: string, prefix: string, into: NestedNode[]): void {
  for (const [key, raw] of Object.entries(fields)) {
    if (!isRecord(raw)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (text(raw.type) === 'object' && isRecord(raw.fields) && !Array.isArray(raw.fields)) {
      into.push({ entityId, localName: key, path, fields: raw.fields });
      collectNested(raw.fields, entityId, path, into);
    }
  }
}

function collectRefs(fields: Record<string, unknown>, entityId: string, prefix: string, into: RecordRef[]): void {
  for (const [key, raw] of Object.entries(fields)) {
    if (!isRecord(raw)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (text(raw.type) === 'record') {
      const parsed = readTo(raw.to);
      into.push({ entityId, path, to: parsed.ok ? parsed.ids : null, shape: !parsed.ok });
    }
    if (text(raw.type) === 'object' && isRecord(raw.fields) && !Array.isArray(raw.fields)) {
      collectRefs(raw.fields, entityId, path, into);
    }
  }
}

function readTo(value: unknown): { ok: true; ids: string[] } | { ok: false; ids?: undefined } {
  if (!Array.isArray(value)) return { ok: false };
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) return { ok: false };
    ids.push(item);
  }
  return { ok: true, ids };
}

function applyOutputCollisions(
  plans: D1DomainEntityPlan[],
  values: D1DomainValuePlan[],
  problems: D1DomainProblem[],
  blocked: Set<string>,
): void {
  const paths = new Map<string, string[]>();
  const add = (path: string, owner: string) => {
    const list = paths.get(path) || [];
    list.push(owner);
    paths.set(path, list);
  };
  for (const plan of plans) if (plan.defPath) add(plan.defPath, plan.entityId);
  for (const plan of values) add(plan.defPath, plan.valueObjectId);
  for (const [path, owners] of paths) {
    if (owners.length < 2) continue;
    error(problems, 'NAME_COLLISION', path, `Def path ${path} is used by ${owners.join(', ')}.`);
    for (const owner of owners) blocked.add(owner);
  }
  const ids = new Map<string, number>();
  for (const plan of plans) ids.set(plan.entityId, (ids.get(plan.entityId) || 0) + 1);
  for (const plan of values) ids.set(plan.valueObjectId, (ids.get(plan.valueObjectId) || 0) + 1);
  for (const [id, count] of ids) {
    if (count < 2) continue;
    error(problems, 'NAME_COLLISION', id, `Name ${id} is used by an entity and a value object.`);
    blocked.add(id);
  }
}

function indexRows(value: unknown, problems: D1DomainProblem[]): Map<string, IndexRow> {
  const rows = new Map<string, IndexRow>();
  const list = isRecord(value) && Array.isArray(value.entities) ? value.entities : null;
  if (!list) {
    error(problems, 'INDEX_ABSENT', 'ontologyIndex.entities', 'Ontology index has no entity list.');
    return rows;
  }
  for (const entry of list) {
    if (!isRecord(entry)) continue;
    const entityId = text(entry.entityId);
    if (!entityId) continue;
    if (rows.has(entityId)) {
      error(problems, 'NAME_COLLISION', `ontologyIndex.${entityId}`, `Index lists ${entityId} more than once.`);
      continue;
    }
    rows.set(entityId, { kind: text(entry.kind) });
  }
  return rows;
}

function ruleMap(value: unknown): Set<string> {
  if (!isRecord(value) || !isRecord(value.rules)) return new Set();
  return new Set(Object.keys(value.rules));
}

function stringItems(value: unknown[]): string[] | null {
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) return null;
    out.push(item);
  }
  return out;
}

function extractedHas(extracted: Map<string, string>, voId: string): boolean {
  for (const id of extracted.values()) if (id === voId) return true;
  return false;
}

function valuePath(moduleName: string, voId: string): string {
  return `l1/${moduleName}/layer_3_domain/value-objects/${lowerFirst(voId)}.defs.ts`;
}

function refKey(ref: RecordRef): string {
  return `${ref.entityId}:${ref.path}`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function error(problems: D1DomainProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.severity === 'error' && problem.code === code && problem.path === path)) return;
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1DomainProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.code === code && problem.path === path)) return;
  problems.push({ severity: 'review', code, path, message });
}

function sortInPlace<T>(items: T[], key: (item: T) => string): void {
  items.sort((left, right) => key(left).localeCompare(key(right)));
}
