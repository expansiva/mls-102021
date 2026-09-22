/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/worker.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  D1_MDM_CALLS,
  D1_WORKER_KINDS,
  type D1UsecaseSelection,
  type D1WorkerStep,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

export const USECASE_TOOL_NAME = 'planUsecaseSteps';

const STEP_KEYS: Record<string, readonly string[]> = {
  port: ['kind', 'call', 'port'],
  rule: ['kind', 'ruleId'],
  mdm: ['kind', 'namespace', 'call', 'entity'],
  transition: ['kind', 'transitionId', 'payload'],
  effect: ['kind', 'eventId'],
  transaction: ['kind', 'boundary'],
  context: ['kind', 'source'],
};

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

export function usecaseTool(): mls.msg.LLMTool {
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
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['kind'],
              properties: {
                kind: { type: 'string', enum: [...D1_WORKER_KINDS] },
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
              },
            },
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
  feedback?: string;
}): string {
  const lines = [
    `Usecase ${input.usecase.usecaseId} is already chosen. Do not rename it.`,
    `Entity ${input.entityId}. Operation ${input.usecase.operation}. Storage ${input.storageTarget}.`,
    `Routes: ${input.routes.join(', ') || '(none)'}.`,
    `Port: ${input.portId || '(none)'}. Methods: ${input.methods.join(', ') || '(none)'}.`,
    `Rules: ${input.rules.join(', ') || '(none)'}.`,
    `Effects: ${input.effects.join(', ') || '(none)'}.`,
    `MDM namespace: ${input.namespace || '(none)'}.`,
    'Plan steps only. Do not write TypeScript. Do not invent a field, a rule, an operation, a route or a type.',
    'A transition payload may list only contract input names you were not given to invent.',
    'More than one write needs one local transaction boundary. An external effect is not atomic.',
    'Authority is ctx.',
  ];
  if (input.feedback) {
    lines.push('', 'The previous reply was refused:', input.feedback);
  }
  return lines.join('\n');
}

function parseStep(value: unknown, index: number): { step: D1WorkerStep } | { problem: { code: string; message: string } } {
  if (!isRecord(value)) {
    return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} is not an object.` } };
  }
  const kind = typeof value.kind === 'string' ? value.kind : '';
  if (!(D1_WORKER_KINDS as readonly string[]).includes(kind)) {
    return { problem: { code: 'INVENTED_OPERATION', message: `Step ${index} kind ${kind || '(missing)'} is not an operation.` } };
  }
  const allowed = STEP_KEYS[kind];
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
    if (!(D1_MDM_CALLS as readonly string[]).includes(parsed.raw.call)) {
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
