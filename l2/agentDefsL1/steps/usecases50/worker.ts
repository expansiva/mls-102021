/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/worker.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  D1_MDM_CALLS,
  D1_WORKER_KINDS,
  type D1MdmCall,
  type D1UsecaseContext,
  type D1UsecaseEntity,
  type D1UsecaseRequest,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { authorizedPayloadNames, capabilityApplies, formatUsecaseContext } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { bindMdm } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

export const USECASE_TOOL_NAME = 'planUsecaseSteps';

export const STEP_KEYS = {
  port: ['kind', 'call', 'port'],
  rule: ['kind', 'ruleId'],
  mdm: ['kind', 'namespace', 'call', 'entity', 'capability'],
  transition: ['kind', 'transitionId', 'payload'],
  effect: ['kind', 'eventId'],
  transaction: ['kind', 'boundary'],
  context: ['kind', 'source'],
} as const satisfies { [K in (typeof D1_WORKER_KINDS)[number]]: readonly string[] };

type WorkerKind = (typeof D1_WORKER_KINDS)[number];
type StepField = (typeof STEP_KEYS)[WorkerKind][number];
type FieldKey = Exclude<StepField, 'kind'>;

/**
 * Value schema of a step key. The key list itself stays on `STEP_KEYS`.
 * A catalog that this call did not receive stays a string. A catalog it did
 * receive, including an empty one, is not a free string: an empty catalog
 * omits the branch.
 */
const FIELD_SCHEMA: { [K in FieldKey]: Record<string, unknown> } = {
  call: { type: 'string' },
  port: { type: 'string' },
  ruleId: { type: 'string' },
  namespace: { type: 'string' },
  entity: { type: 'string' },
  capability: { type: 'string' },
  transitionId: { type: 'string' },
  payload: { type: 'array', items: { type: 'string' } },
  eventId: { type: 'string' },
  /** Unscoped fallback. A scoped call uses `boundaries` from the operation catalog. */
  boundary: { type: 'string', enum: ['local'] },
  /** Unscoped fallback. A scoped call uses `sources` from the operation catalog. */
  source: { type: 'string', enum: ['ctx'] },
};

/** One facade method with the capability that binding says it executes. */
export interface MdmStepPair {
  call: string;
  capability: string;
}

/**
 * Catalogs known for the one usecase being called.
 * An omitted catalog was not provided and stays a free string.
 * An empty catalog was provided and means that branch is unavailable.
 */
export interface UsecaseClosedValues {
  portCalls?: readonly string[];
  portIds?: readonly string[];
  ruleIds?: readonly string[];
  namespaces?: readonly string[];
  entityIds?: readonly string[];
  /** Facade methods this operation may name. Empty omits MDM. Omitted keeps the facade catalog. */
  mdmCalls?: readonly string[];
  capabilities?: readonly string[];
  /** One branch per pair, so a call cannot be paired with another capability. Empty omits MDM. */
  mdmPairs?: readonly MdmStepPair[];
  transitionIds?: readonly string[];
  /** Paths a transition payload may name. Empty means the payload array is empty. Omitted keeps a free string. */
  payloadPaths?: readonly string[];
  eventIds?: readonly string[];
  /** Authority values this operation may name. The gate admits `ctx` only. */
  sources?: readonly string[];
  /**
   * Transaction boundaries this operation may name.
   * Empty omits the branch. The gate admits `local` on a repository operation and refuses every other value.
   */
  boundaries?: readonly string[];
}

export interface OperationCatalogInput {
  operation: string;
  entityId: string;
  storageTarget: string;
  namespace: string;
  portId: string;
  /** Methods the port declares. Only `operation` is offered, and only when this port has it. */
  portMethods: readonly string[];
  ruleIds: readonly string[];
  eventIds: readonly string[];
  transitionId: string;
  payloadPaths: readonly string[];
  mdmPairs: readonly MdmStepPair[];
}

/** The catalogs for one operation. Port, MDM and transition come from the same facts the schema uses. */
export function catalogForOperation(input: OperationCatalogInput): UsecaseClosedValues {
  const portUsable = input.storageTarget !== 'mdm'
    && Boolean(input.portId)
    && input.portMethods.includes(input.operation);
  const pairs = input.storageTarget === 'mdm' && input.namespace && input.entityId
    ? dedupePairs(input.mdmPairs)
    : [];
  return {
    portCalls: portUsable ? [input.operation] : [],
    portIds: portUsable ? [input.portId] : [],
    ruleIds: dedupe(input.ruleIds),
    namespaces: pairs.length ? [input.namespace] : [],
    entityIds: pairs.length ? [input.entityId] : [],
    mdmCalls: pairs.map(pair => pair.call),
    capabilities: pairs.map(pair => pair.capability),
    mdmPairs: pairs,
    transitionIds: input.transitionId ? [input.transitionId] : [],
    payloadPaths: input.transitionId ? dedupe(input.payloadPaths) : [],
    eventIds: dedupe(input.eventIds),
    sources: authoritySources(),
    boundaries: transactionBoundaries(input.storageTarget),
  };
}

/** The gate accepts `ctx` on every operation. `input` is not an authority source. */
function authoritySources(): string[] {
  return ['ctx'];
}

/**
 * Boundaries the gate accepts for this storage.
 * `external` is refused on every operation. An MDM plan refuses every transaction step.
 */
function transactionBoundaries(storageTarget: string): string[] {
  if (storageTarget === 'mdm') return [];
  return ['local'];
}

/** Selection for the usecase the worker is about to call. Schema and prompt both take this object. */
export function closedFromRequest(
  request: D1UsecaseRequest,
  usecase: D1UsecaseSelection,
  packet?: D1UsecaseContext,
): UsecaseClosedValues {
  const entity = request.entities.find(item => item.entityId === usecase.entity);
  const port = request.ports.find(item => item.entityId === usecase.entity);
  const storage = entity?.storageTarget || '';
  const effects = packet
    ? packet.effects.map(event => event.eventId)
    : request.outbound.filter(event => event.on === `${usecase.entity}.${usecase.usecaseId}`).map(event => event.eventId);
  const ruleIds = packet
    ? packet.rules.map(rule => rule.ruleId)
    : [...request.moduleRules, ...(entity?.rules.map(rule => rule.ruleId) || [])];
  const transitionId = entity?.transitions.some(item => item.transitionId === usecase.usecaseId)
    ? usecase.usecaseId
    : '';
  const inputNames: string[] = [];
  if (transitionId && packet) {
    for (const route of packet.routes) {
      for (const field of route.inputFields) inputNames.push(field.path);
    }
  }
  const payloadNames = transitionId
    ? writablePayload([...authorizedPayloadNames(request, usecase.usecaseId, inputNames)], entity)
    : [];
  const portMethods = packet
    ? packet.portMethods.map(method => method.name)
    : (storage === 'mdm' ? [] : port?.methods || []);
  const portId = packet ? packet.portId : (storage === 'mdm' ? '' : port?.portId || '');
  return catalogForOperation({
    operation: usecase.operation,
    entityId: usecase.entity,
    storageTarget: storage,
    namespace: entity?.namespace || '',
    portId,
    portMethods,
    ruleIds,
    eventIds: effects,
    transitionId,
    payloadPaths: payloadNames,
    mdmPairs: pairsFor(entity, usecase.operation),
  });
}

/**
 * A derived field in a transition payload is a write. The schema does not offer it.
 * The gate still refuses a reply that names one.
 */
function writablePayload(names: readonly string[], entity: D1UsecaseEntity | undefined): string[] {
  const out: string[] = [];
  for (const name of names) {
    if (!name || out.includes(name)) continue;
    const field = entity?.fields.find(item => item.name === name);
    if (field?.derived) continue;
    out.push(name);
  }
  return out;
}

interface SelectedBranch {
  kind: WorkerKind;
  schema: Record<string, unknown>;
  notes: string[];
}

/** Branches this operation can actually emit. Schema and step text are both this list. */
function selectBranches(closed: UsecaseClosedValues): SelectedBranch[] {
  const selected: SelectedBranch[] = [];
  for (const kind of D1_WORKER_KINDS) {
    if (kind === 'mdm') {
      selected.push(...mdmBranches(closed));
      continue;
    }
    if (!kindOffered(kind, closed)) continue;
    selected.push({ kind, schema: stepBranch(kind, closed), notes: notesFor(kind, closed) });
  }
  return selected;
}

function kindOffered(kind: WorkerKind, closed: UsecaseClosedValues): boolean {
  if (kind === 'port') return !knownEmpty(closed.portCalls) && !knownEmpty(closed.portIds);
  if (kind === 'rule') return !knownEmpty(closed.ruleIds);
  if (kind === 'transition') return !knownEmpty(closed.transitionIds);
  if (kind === 'effect') return !knownEmpty(closed.eventIds);
  if (kind === 'transaction') return !knownEmpty(closed.boundaries);
  return true;
}

function mdmBranches(closed: UsecaseClosedValues): SelectedBranch[] {
  if (knownEmpty(closed.namespaces) || knownEmpty(closed.entityIds)) return [];
  if (closed.mdmPairs) {
    if (!closed.mdmPairs.length) return [];
    const namespaces = dedupe(closed.namespaces || []);
    const entities = dedupe(closed.entityIds || []);
    if (!namespaces.length || !entities.length) return [];
    const seen = new Set<string>();
    const branches: SelectedBranch[] = [];
    for (const pair of closed.mdmPairs) {
      if (!pair.call || !pair.capability) continue;
      const key = `${pair.call}\u0000${pair.capability}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const narrowed: UsecaseClosedValues = {
        ...closed,
        namespaces,
        entityIds: entities,
        mdmCalls: [pair.call],
        capabilities: [pair.capability],
      };
      branches.push({
        kind: 'mdm',
        schema: stepBranch('mdm', narrowed),
        notes: [`call ${pair.call}, capability ${pair.capability}, namespace ${namespaces.join(', ')}, entity ${entities.join(', ')}`],
      });
    }
    return branches;
  }
  if (knownEmpty(closed.mdmCalls)) return [];
  return [{ kind: 'mdm', schema: stepBranch('mdm', closed), notes: [] }];
}

function notesFor(kind: WorkerKind, closed: UsecaseClosedValues): string[] {
  if (kind === 'port' && closed.portCalls && closed.portIds) {
    return [`call: ${dedupe(closed.portCalls).join(', ')}`, `port: ${dedupe(closed.portIds).join(', ')}`];
  }
  if (kind === 'rule' && closed.ruleIds) return [`ruleId: ${dedupe(closed.ruleIds).join(', ')}`];
  if (kind === 'effect' && closed.eventIds) return [`eventId: ${dedupe(closed.eventIds).join(', ')}`];
  if (kind === 'transition' && closed.transitionIds) {
    const notes = [`transitionId: ${dedupe(closed.transitionIds).join(', ')}`];
    if (closed.payloadPaths) notes.push(`payload: ${dedupe(closed.payloadPaths).join(', ') || '(none)'}`);
    return notes;
  }
  if (kind === 'context') {
    const sources = dedupe(closed.sources || ['ctx']);
    return sources.length ? [`source: ${sources.join(', ')}`] : [];
  }
  if (kind === 'transaction') {
    const boundaries = dedupe(closed.boundaries || ['local']);
    return boundaries.length ? [`boundary: ${boundaries.join(', ')}`] : [];
  }
  return [];
}

function knownEmpty(values: readonly string[] | undefined): boolean {
  return Boolean(values) && dedupe(values || []).length === 0;
}

function pairsFor(entity: D1UsecaseEntity | undefined, operation: string): MdmStepPair[] {
  if (!entity || entity.storageTarget !== 'mdm' || !entity.namespace || !entity.entityId) return [];
  const selected = (entity.capabilities || []).filter(name => capabilityApplies(name, operation));
  const bound = bindMdm({
    entityId: entity.entityId,
    namespace: entity.namespace,
    capabilities: entity.capabilities || [],
    selected,
    platformFields: entity.platformFields || [],
  });
  const pairs: MdmStepPair[] = [];
  for (const call of bound.calls) {
    for (const capability of call.capabilities) {
      if (!call.method || !capability) continue;
      pairs.push({ call: call.method, capability });
    }
  }
  return pairs;
}

/** Closed branch. `anyOf`, not `oneOf`: provider strict mode rejects `oneOf`. Every key stays required. */
function stepBranch(kind: WorkerKind, closed: UsecaseClosedValues): Record<string, unknown> {
  const keys = STEP_KEYS[kind];
  const properties: Record<string, unknown> = {};
  for (const key of keys) {
    properties[key] = key === 'kind' ? { type: 'string', const: kind } : fieldSchema(kind, key, closed);
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: [...keys],
    properties,
  };
}

function fieldSchema(kind: WorkerKind, key: FieldKey, closed: UsecaseClosedValues): Record<string, unknown> {
  if (kind === 'mdm' && key === 'call') {
    return closed.mdmCalls ? closedString(closed.mdmCalls) : { type: 'string', enum: [...D1_MDM_CALLS] };
  }
  if (kind === 'mdm' && key === 'capability') return closed.capabilities ? closedString(closed.capabilities) : FIELD_SCHEMA.capability;
  if (kind === 'port' && key === 'call') return closedString(closed.portCalls);
  if (kind === 'port' && key === 'port') return closedString(closed.portIds);
  if (kind === 'rule' && key === 'ruleId') return closedString(closed.ruleIds);
  if (kind === 'mdm' && key === 'namespace') return closedString(closed.namespaces);
  if (kind === 'mdm' && key === 'entity') return closedString(closed.entityIds);
  if (kind === 'transition' && key === 'transitionId') return closedString(closed.transitionIds);
  if (kind === 'transition' && key === 'payload') return payloadSchema(closed.payloadPaths);
  if (kind === 'effect' && key === 'eventId') return closedString(closed.eventIds);
  if (kind === 'context' && key === 'source') return closed.sources ? closedString(closed.sources) : FIELD_SCHEMA.source;
  if (kind === 'transaction' && key === 'boundary') return closed.boundaries ? closedString(closed.boundaries) : FIELD_SCHEMA.boundary;
  return FIELD_SCHEMA[key];
}

function payloadSchema(paths: readonly string[] | undefined): Record<string, unknown> {
  if (!paths) return FIELD_SCHEMA.payload;
  const unique = dedupe(paths);
  if (!unique.length) return { type: 'array', const: [] };
  return { type: 'array', items: { type: 'string', enum: unique } };
}

function closedString(values: readonly string[] | undefined): Record<string, unknown> {
  if (!values) return { type: 'string' };
  const unique = dedupe(values);
  if (!unique.length) return { type: 'string' };
  return { type: 'string', enum: unique };
}

function dedupe(values: readonly string[]): string[] {
  const unique: string[] = [];
  for (const value of values) {
    if (!value || unique.includes(value)) continue;
    unique.push(value);
  }
  return unique;
}

function dedupePairs(pairs: readonly MdmStepPair[]): MdmStepPair[] {
  const unique: MdmStepPair[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) {
    if (!pair.call || !pair.capability) continue;
    const key = `${pair.call}\u0000${pair.capability}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ call: pair.call, capability: pair.capability });
  }
  return unique;
}

/**
 * Kinds and calls this operation can use, from `selectBranches`.
 * An unscoped call still lists every kind and the facade catalog.
 * The markdown prompt does not copy this list.
 */
export function workerStepShape(closed: UsecaseClosedValues = {}): string {
  const selected = selectBranches(closed);
  const lines = ['Each step is one kind. A step may name only the keys of that kind:'];
  const kinds: WorkerKind[] = [];
  for (const branch of selected) {
    if (!kinds.includes(branch.kind)) kinds.push(branch.kind);
  }
  for (const kind of kinds) {
    lines.push(`- ${kind}: ${STEP_KEYS[kind].join(', ')}`);
    for (const branch of selected) {
      if (branch.kind !== kind) continue;
      for (const note of branch.notes) lines.push(`  ${note}`);
    }
  }
  lines.push('A key from another kind is refused.');
  const mdm = selected.filter(branch => branch.kind === 'mdm');
  if (mdm.length && mdm.every(branch => branch.notes.length === 0)) {
    const calls = closed.mdmCalls ? dedupe(closed.mdmCalls) : [...D1_MDM_CALLS];
    lines.push(`MDM call is one of: ${calls.join(', ')}.`);
  }
  return lines.join('\n');
}

export interface D1WorkerReply {
  steps: D1WorkerStep[] | null;
  problems: Array<{ code: string; message: string }>;
}

/** The model returns steps only. An extra field rejects the reply. */
export function parseWorkerReply(payload: unknown): D1WorkerReply {
  if (!isRecord(payload)) {
    return { steps: null, problems: [{ code: 'OPERATIONAL', message: 'The model reply is not an object.' }] };
  }
  const extra = Object.keys(payload).filter(key => key !== 'steps');
  if (extra.length) {
    return {
      steps: null,
      problems: [{ code: 'INVENTED_FIELD', message: `The reply names ${extra[0]}. Ids, routes and types are already fixed.` }],
    };
  }
  if (!Array.isArray(payload.steps)) {
    return { steps: null, problems: [{ code: 'INVENTED_OPERATION', message: 'The reply has no steps array.' }] };
  }
  const steps: D1WorkerStep[] = [];
  const problems: D1WorkerReply['problems'] = [];
  payload.steps.forEach((step, index) => {
    const parsed = parseStep(step, index);
    if ('problem' in parsed) problems.push(parsed.problem);
    else steps.push(parsed.step);
  });
  if (problems.length) return { steps: null, problems };
  return { steps, problems: [] };
}

export function usecaseTool(closed: UsecaseClosedValues = {}): mls.msg.LLMTool {
  return {
    type: 'function',
    function: {
      name: USECASE_TOOL_NAME,
      description: 'Ordered operation steps for the one usecase already identified. Do not add ids, routes or types.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['steps'],
        properties: {
          steps: {
            type: 'array',
            items: { anyOf: selectBranches(closed).map(branch => branch.schema) },
          },
        },
      },
    },
  };
}

/** Human prompt. The packet is fixed. The model does not write TypeScript. */
export function usecaseHumanPrompt(input: {
  usecase: D1UsecaseSelection;
  entityId: string;
  storageTarget: string;
  namespace: string;
  portId: string;
  methods: string[];
  rules: string[];
  effects: string[];
  routes: string[];
  context?: D1UsecaseContext;
  /** Same object the tool schema was built from. */
  closed: UsecaseClosedValues;
  feedback?: string;
}): string {
  const lines = [
    `Usecase ${input.usecase.usecaseId} is already chosen. Do not rename it.`,
    `Entity ${input.entityId}. Operation ${input.usecase.operation}. Storage ${input.storageTarget}.`,
  ];
  if (input.context) {
    lines.push(`MDM namespace: ${input.namespace || '(none)'}.`, '', formatUsecaseContext(input.context));
  } else {
    lines.push(
      `Routes: ${input.routes.join(', ') || '(none)'}.`,
      `Port: ${input.portId || '(none)'}. Methods: ${input.methods.join(', ') || '(none)'}.`,
      `Rules: ${input.rules.join(', ') || '(none)'}.`,
      `Effects: ${input.effects.join(', ') || '(none)'}.`,
      `MDM namespace: ${input.namespace || '(none)'}.`,
    );
  }
  lines.push(
    '',
    'Plan steps only. Do not write TypeScript. Do not invent a field, a rule, an operation, a route or a type.',
    'A transition payload may list only a path the contract or the lifecycle payload already lists.',
    'More than one repository write needs one local transaction boundary. Separate MDM facade calls are not one transaction. An external effect is not atomic.',
    'Authority is ctx.',
    '',
    workerStepShape(input.closed),
  );
  if (input.feedback) {
    lines.push('', 'The previous reply was refused:', input.feedback);
  }
  return lines.join('\n');
}

function parseStep(value: unknown, index: number): { step: D1WorkerStep } | { problem: { code: string; message: string } } {
  if (!isRecord(value)) {
    return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} is not an object.` } };
  }
  const kindText = typeof value.kind === 'string' ? value.kind : '';
  if (!isWorkerKind(kindText)) {
    return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} kind ${kindText || '(missing)'} is not an operation.` } };
  }
  const kind = kindText;
  const allowed: readonly string[] = STEP_KEYS[kind];
  const extra = Object.keys(value).filter(key => !allowed.includes(key));
  if (extra.length) {
    return { problem: { code: 'INVENTED_FIELD', message: `Step ${index} names ${extra[0]}.` } };
  }
  if (kind === 'port') return shaped(value, index, ['call', 'port'], raw => ({ kind: 'port', call: raw.call, port: raw.port }));
  if (kind === 'rule') return shaped(value, index, ['ruleId'], raw => ({ kind: 'rule', ruleId: raw.ruleId }));
  if (kind === 'effect') return shaped(value, index, ['eventId'], raw => ({ kind: 'effect', eventId: raw.eventId }));
  if (kind === 'context') return shaped(value, index, ['source'], raw => ({ kind: 'context', source: raw.source }));
  if (kind === 'transaction') return shaped(value, index, ['boundary'], raw => ({ kind: 'transaction', boundary: raw.boundary }));
  if (kind === 'mdm') {
    const parsed = textFields(value, index, ['namespace', 'call', 'entity', 'capability']);
    if ('problem' in parsed) return parsed;
    if (!isMdmCall(parsed.raw.call)) {
      return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} MDM call ${parsed.raw.call} is not a facade method.` } };
    }
    return {
      step: {
        kind: 'mdm',
        namespace: parsed.raw.namespace,
        call: parsed.raw.call,
        entity: parsed.raw.entity,
        capability: parsed.raw.capability,
      },
    };
  }
  const transitionId = typeof value.transitionId === 'string' ? value.transitionId : '';
  if (!transitionId) return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} has no transitionId.` } };
  if (!Array.isArray(value.payload) || value.payload.some(item => typeof item !== 'string' || !item)) {
    return { problem: { code: 'INVENTED_FIELD', message: `Step ${index} payload is not a list of field names.` } };
  }
  return { step: { kind: 'transition', transitionId, payload: value.payload as string[] } };
}

function isWorkerKind(value: string): value is (typeof D1_WORKER_KINDS)[number] {
  return (D1_WORKER_KINDS as readonly string[]).includes(value);
}

function isMdmCall(value: string): value is D1MdmCall {
  return (D1_MDM_CALLS as readonly string[]).includes(value);
}

function shaped<T extends D1WorkerStep>(
  value: Record<string, unknown>,
  index: number,
  keys: string[],
  build: (raw: Record<string, string>) => T,
): { step: T } | { problem: { code: string; message: string } } {
  const parsed = textFields(value, index, keys);
  if ('problem' in parsed) return parsed;
  return { step: build(parsed.raw) };
}

function textFields(
  value: Record<string, unknown>,
  index: number,
  keys: string[],
): { raw: Record<string, string> } | { problem: { code: string; message: string } } {
  const raw: Record<string, string> = {};
  for (const key of keys) {
    const text = value[key];
    if (typeof text !== 'string' || !text.trim()) {
      return { problem: { code: 'INVENTED_FIELD', message: `Step ${index} is missing ${key}.` } };
    }
    raw[key] = text;
  }
  return { raw };
}
