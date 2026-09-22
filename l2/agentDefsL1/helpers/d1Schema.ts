/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Schema.ts" enhancement="_blank"/>

import {
  D1_FLOW_ID,
  D1_FLOW_VERSION,
  D1_PIPELINE_SCHEMA,
  isD1StepId,
  moduleTokenOk,
  type D1PipelineState,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

/** Keys locked to schemas/pipeline-v1.schema.json by the flow contract test. */
export const PIPELINE_KEYS = [
  'schemaVersion',
  'flowId',
  'flowVersion',
  'project',
  'moduleName',
  'status',
  'awaitingStep',
  'command',
  'steps',
  'updatedAt',
] as const;

export const PIPELINE_REQUIRED = [
  'schemaVersion',
  'flowId',
  'flowVersion',
  'project',
  'moduleName',
  'status',
  'command',
  'steps',
  'updatedAt',
] as const;

export const STEP_STATE_KEYS = ['status', 'updatedAt', 'artifactPaths', 'error'] as const;
export const PIPELINE_STATUS = ['inProgress', 'awaitingStep', 'complete', 'failed'] as const;
export const STEP_STATUS = ['running', 'approved', 'failed'] as const;

const PIPELINE_KEY_SET = new Set<string>(PIPELINE_KEYS);
const STEP_KEY_SET = new Set<string>(STEP_STATE_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stepIssues(stepId: string, value: unknown): string[] {
  if (!isRecord(value)) return [`steps.${stepId} must be an object.`];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!STEP_KEY_SET.has(key)) issues.push(`steps.${stepId}.${key} is not a checkpoint field.`);
  }
  if (typeof value.status !== 'string' || !(STEP_STATUS as readonly string[]).includes(value.status)) {
    issues.push(`steps.${stepId}.status is invalid.`);
  }
  if (typeof value.updatedAt !== 'string' || value.updatedAt.length === 0) {
    issues.push(`steps.${stepId}.updatedAt is required.`);
  }
  if (value.artifactPaths !== undefined) {
    if (!Array.isArray(value.artifactPaths) || value.artifactPaths.some(item => typeof item !== 'string' || item.length === 0)) {
      issues.push(`steps.${stepId}.artifactPaths must be a list of paths.`);
    }
  }
  if (value.error !== undefined && typeof value.error !== 'string') {
    issues.push(`steps.${stepId}.error must be a string.`);
  }
  return issues;
}

/** Structural gate for the pipeline document. Extra keys are refused, not dropped. */
export function pipelineIssues(value: unknown): string[] {
  if (!isRecord(value)) return ['Checkpoint must be a JSON object.'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!PIPELINE_KEY_SET.has(key)) issues.push(`Unknown checkpoint field: ${key}.`);
  }
  for (const key of PIPELINE_REQUIRED) {
    if (value[key] === undefined) issues.push(`Checkpoint is missing ${key}.`);
  }
  if (value.schemaVersion !== D1_PIPELINE_SCHEMA) issues.push('Checkpoint schemaVersion is unknown.');
  if (value.flowId !== D1_FLOW_ID) issues.push('Checkpoint flowId is unknown.');
  if (value.flowVersion !== D1_FLOW_VERSION) issues.push('Checkpoint flowVersion is unknown.');
  if (typeof value.project !== 'number' || !Number.isInteger(value.project) || value.project < 1) {
    issues.push('Checkpoint project must be a positive integer.');
  }
  if (typeof value.moduleName !== 'string' || !moduleTokenOk(value.moduleName)) {
    issues.push('Checkpoint moduleName must be lowerCamel.');
  }
  if (typeof value.status !== 'string' || !(PIPELINE_STATUS as readonly string[]).includes(value.status)) {
    issues.push('Checkpoint status is invalid.');
  }
  if (value.awaitingStep !== undefined && (typeof value.awaitingStep !== 'string' || !isD1StepId(value.awaitingStep))) {
    issues.push('Checkpoint awaitingStep is unknown.');
  }
  if (value.command !== 'run' && value.command !== 'resume') issues.push('Checkpoint command must be run or resume.');
  if (typeof value.updatedAt !== 'string' || value.updatedAt.length === 0) issues.push('Checkpoint updatedAt is required.');
  if (!isRecord(value.steps)) {
    issues.push('Checkpoint steps must be an object.');
  } else {
    for (const key of Object.keys(value.steps)) {
      if (!isD1StepId(key)) issues.push(`Unknown step in checkpoint: ${key}.`);
      else issues.push(...stepIssues(key, value.steps[key]));
    }
  }
  return issues;
}

export function parsePipelineDocument(raw: string): D1PipelineState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (pipelineIssues(parsed).length > 0) return null;
  return parsed as D1PipelineState;
}
