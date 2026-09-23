/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/worker.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  D1_MDM_CALLS,
  D1_WORKER_KINDS,
  type D1MdmCall,
  type D1UsecaseContext,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { formatUsecaseContext } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';

export const USECASE_TOOL_NAME = 'planUsecaseSteps';

export const STEP_KEYS = {
  port: ['kind', 'call', 'port'],
  rule: ['kind', 'ruleId'],
  mdm: ['kind', 'namespace', 'call', 'entity'],
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
 * `mdm.call` is always `D1_MDM_CALLS`. A per-unit catalog is an enum only when
 * this call already has the list; an empty list stays a string.
 */
const FIELD_SCHEMA: { [K in FieldKey]: Record<string, unknown> } = {
  call: { type: 'string' },
  port: { type: 'string' },
  ruleId: { type: 'string' },
  namespace: { type: 'string' },
  entity: { type: 'string' },
  transitionId: { type: 'string' },
  payload: { type: 'array', items: { type: 'string' } },
  eventId: { type: 'string' },
  boundary: { type: 'string', enum: ['local', 'external'] },
  source: { type: 'string', enum: ['ctx', 'input'] },
};

/** Catalogs known for the one usecase being called. Omitted or empty stays a free string. */
export interface UsecaseClosedValues {
  portCalls?: readonly string[];
  portIds?: readonly string[];
  ruleIds?: readonly string[];
  namespaces?: readonly string[];
  entityIds?: readonly string[];
  transitionIds?: readonly string[];
  eventIds?: readonly string[];
}

/** Closed branch. `anyOf`, not `oneOf`: provider strict mode rejects `oneOf`. */
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
  if (kind === 'mdm' && key === 'call') return { type: 'string', enum: [...D1_MDM_CALLS] };
  if (kind === 'port' && key === 'call') return closedString(closed.portCalls);
  if (kind === 'port' && key === 'port') return closedString(closed.portIds);
  if (kind === 'rule' && key === 'ruleId') return closedString(closed.ruleIds);
  if (kind === 'mdm' && key === 'namespace') return closedString(closed.namespaces);
  if (kind === 'mdm' && key === 'entity') return closedString(closed.entityIds);
  if (kind === 'transition' && key === 'transitionId') return closedString(closed.transitionIds);
  if (kind === 'effect' && key === 'eventId') return closedString(closed.eventIds);
  return FIELD_SCHEMA[key];
}

function closedString(values: readonly string[] | undefined): Record<string, unknown> {
  if (!values) return { type: 'string' };
  const unique: string[] = [];
  for (const value of values) {
    if (!value || unique.includes(value)) continue;
    unique.push(value);
  }
  if (!unique.length) return { type: 'string' };
  return { type: 'string', enum: unique };
}

/** The gate's key set, rendered. The markdown prompt does not copy this list. */
export function workerStepShape(): string {
  const lines = D1_WORKER_KINDS.map(kind => `- ${kind}: ${STEP_KEYS[kind].join(', ')}`);
  return [
    'Each step is one kind. A step may name only the keys of that kind:',
    ...lines,
    'A key from another kind is refused.',
    `MDM call is one of: ${D1_MDM_CALLS.join(', ')}.`,
  ].join('\n');
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
            items: { anyOf: D1_WORKER_KINDS.map(kind => stepBranch(kind, closed)) },
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
    'More than one write needs one local transaction boundary. An external effect is not atomic.',
    'Authority is ctx.',
    '',
    workerStepShape(),
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
    const parsed = textFields(value, index, ['namespace', 'call', 'entity']);
    if ('problem' in parsed) return parsed;
    if (!isMdmCall(parsed.raw.call)) {
      return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} MDM call ${parsed.raw.call} is not a catalog call.` } };
    }
    return { step: { kind: 'mdm', namespace: parsed.raw.namespace, call: parsed.raw.call, entity: parsed.raw.entity } };
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
