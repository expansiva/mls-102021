/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Core.ts" enhancement="_blank"/>

export const D1_FLOW_ID = 'agentDefsL1' as const;
export const D1_FLOW_VERSION = '2026-09-21-d1-flow-v1' as const;
export const D1_PIPELINE_SCHEMA = '2026-09-21-d1-pipeline-v1' as const;
export const D1_AGENT_NAME = 'agentDefsL1' as const;

export const D1_FLOW_STEP_IDS = [
  'entry10',
  'input20',
  'domain30',
  'persistence40',
  'usecases50',
  'controllers60',
  'support70',
  'finalize80',
] as const;

export type D1StepId = typeof D1_FLOW_STEP_IDS[number];

/** Steps that have a hook in this delivery. The flow lists the rest as not implemented. */
export const D1_IMPLEMENTED_STEP_IDS = ['entry10', 'input20', 'domain30', 'persistence40', 'usecases50', 'controllers60', 'support70'] as const;

export const D1_STEP_TITLES: Record<D1StepId, string> = {
  entry10: 'Entry',
  input20: 'Input',
  domain30: 'Domain',
  persistence40: 'Persistence',
  usecases50: 'Usecases',
  controllers60: 'Controllers',
  support70: 'Support',
  finalize80: 'Finalize',
};

/** Dependencies are done-anchors. A draft path must never appear here. */
export const D1_STEP_DEPENDS_ON: Record<D1StepId, readonly string[]> = {
  entry10: [],
  input20: ['entry10-done'],
  domain30: ['input20-done'],
  persistence40: ['domain30-done'],
  usecases50: ['persistence40-done'],
  controllers60: ['usecases50-done'],
  support70: ['controllers60-done'],
  finalize80: ['support70-done'],
};

export const D1_REPAIR_PER_UNIT = 1;
export const D1_REPAIR_GLOBAL_MAX = 8;
export const D1_FINALIZE_REPAIR = false;
export const D1_MAX_PARALLEL = 5;
export const D1_INTERACTION_CLEANER = 'input_output' as const;
export const D1_CHILDREN_MAY_ADD_STEPS = false;
export const D1_CHILDREN_MAY_CREATE_TASK = false;

export const D1_NEVER_DISPATCH = [
  'agentCbMaterialize',
  'agentChangeBackend',
  'agentChangeFrontend',
] as const;

/**
 * Same spelling as `CANDIDATE_RE` in the L1 planner. This agent refuses the flag;
 * it does not resolve a candidate root.
 */
const CANDIDATE_RE = /(^|\s)\/candidate(?:\s+(?!\/)(\S+))?(?=\s|$)/i;
/** Same spelling as `REBUILD_ALL_RE` in agentNewSolution5. Refused; nothing is deleted. */
const REBUILD_ALL_RE = /(^|\s)\/rebuild\s+all(?:\s+([A-Za-z][A-Za-z0-9]*))?(?=\s|$)/i;

const AGENT_PREFIXES = [
  /@@\s*_102021_\/l2\/agentDefsL1/gi,
  /@@\s*_102021_agentDefsL1/gi,
  /@@\s*agentDefsL1/gi,
];

const COMMANDS = ['run', 'resume', 'help'] as const;
export type D1Command = typeof COMMANDS[number];

export const MSG_PATH = "Path must not contain '..'.";
export const MSG_CANDIDATE_DOTDOT = "Candidate path must not contain '..'.";
export const MSG_CANDIDATE = 'Candidate runs are refused. Nothing was changed.';
export const MSG_REBUILD = 'Rebuild all is refused. Nothing was deleted.';
export const MSG_ONE_COMMAND = 'Pass one command: /run, /resume or /help.';
export const MSG_USAGE = 'Pass @@agentDefsL1 <lowerCamel> /run, /resume or /help.';
export const MSG_MODULE = 'Module name must be lowerCamel (example: stockControl).';
export const MSG_PROJECT = 'Project identity is missing.';
export const MSG_PROJECT_MISMATCH = 'Project identity does not match this task.';

export interface D1FileInfo {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export type D1PipelineStatus = 'inProgress' | 'awaitingStep' | 'complete' | 'failed';
export type D1StepStatus = 'running' | 'approved' | 'failed';

export interface D1StepState {
  status: D1StepStatus;
  updatedAt: string;
  artifactPaths?: string[];
  error?: string;
}

export interface D1PipelineState {
  schemaVersion: typeof D1_PIPELINE_SCHEMA;
  flowId: typeof D1_FLOW_ID;
  flowVersion: typeof D1_FLOW_VERSION;
  project: number;
  moduleName: string;
  status: D1PipelineStatus;
  awaitingStep?: D1StepId;
  command: 'run' | 'resume';
  steps: Partial<Record<D1StepId, D1StepState>>;
  updatedAt: string;
}

export interface D1ParsedInvocation {
  module: string;
  command: D1Command | '';
  refused: string;
}

export function isD1StepId(value: string): value is D1StepId {
  return (D1_FLOW_STEP_IDS as readonly string[]).includes(value);
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

export function repairAllowed(unitAttempts: number, globalAttempts: number): boolean {
  return unitAttempts < D1_REPAIR_PER_UNIT && globalAttempts < D1_REPAIR_GLOBAL_MAX;
}

/** A successor is unlocked only by its done-anchors, never by a draft path. */
export function successorUnlocked(dependsOn: readonly string[], approvedAnchors: ReadonlySet<string>): boolean {
  return dependsOn.length > 0 && dependsOn.every(id => approvedAnchors.has(id) && !id.includes('draft'));
}

export function doneAnchorId(stepId: D1StepId): string {
  return `${stepId}-done`;
}

export function dynamicPlanId(stepId: D1StepId, kind: 'fanout' | 'worker' | 'repair', token: string): string {
  if (kind === 'fanout') return `${stepId}-fanout`;
  if (kind === 'worker') return `${stepId}-worker-${token}`;
  return `${stepId}-repair-${token}`;
}

/** A parallel child has no planning. Its prompt carries the planId. */
export function planIdFromPrompt(prompt: string): string {
  try {
    const parsed = JSON.parse(String(prompt || '')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '';
    const planId = (parsed as { planId?: unknown }).planId;
    if (typeof planId !== 'string') return '';
    return ownerStepId(planId) ? planId : '';
  } catch {
    return '';
  }
}

/**
 * Maps a child planId back to its step. Done-anchors stay unmatched so they are
 * not dispatched as the step they close.
 */
export function ownerStepId(planId: string): D1StepId | '' {
  if (isD1StepId(planId)) return planId;
  for (const id of D1_FLOW_STEP_IDS) {
    if (planId === `${id}-done`) return '';
    if (planId === `${id}-fanout`) return id;
    if (new RegExp(`^${id}-worker-[A-Za-z0-9]+$`).test(planId)) return id;
    if (new RegExp(`^${id}-repair-\\d+$`).test(planId)) return id;
  }
  return '';
}

export function isDoneAnchor(planId: string): boolean {
  return D1_FLOW_STEP_IDS.some(id => planId === `${id}-done`);
}

export function assertShortName(shortName: string): void {
  if (shortName.includes('.')) {
    throw new Error(`agentDefsL1 filename out of standard: '${shortName}' — shortName must not contain dots`);
  }
}

/** Project is part of the path so two modules with the same name do not share a file. */
export function displayPath(file: D1FileInfo): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `_${file.project}_/l${file.level}/${folder}${file.shortName}${file.extension}`;
}

/** `l1/<module>/pipeline/agentDefsL1/input.json` — the input20 receipt. */
export function inputFile(project: number, moduleName: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1`,
    shortName: 'input',
    extension: '.json',
  };
}

/** `l1/<module>/pipeline/agentDefsL1/drafts/<step>.json`. A draft does not approve the step. */
export function draftFile(project: number, moduleName: string, step: D1StepId): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1/drafts`,
    shortName: step,
    extension: '.json',
  };
}

/** `l1/<module>/pipeline/agentDefsL1/pipeline.json` in one project. */
export function pipelineFile(project: number, moduleName: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline/agentDefsL1`,
    shortName: 'pipeline',
    extension: '.json',
  };
}

/** Planner checkpoint. This agent never writes or removes it. */
export function plannerPipelineFile(project: number, moduleName: string): D1FileInfo {
  return {
    project,
    level: 1,
    folder: `${moduleName}/pipeline`,
    shortName: 'pipeline',
    extension: '.json',
  };
}

export function ownedFolder(moduleName: string): string {
  return `${moduleName}/pipeline/agentDefsL1`;
}

export function requireProject(value: unknown): number | { refusal: string } {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  return { refusal: MSG_PROJECT };
}

export function parseD1Invocation(value: string): D1ParsedInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');

  const candidate = CANDIDATE_RE.exec(raw);
  if (candidate) {
    const path = candidate[2] || '';
    if (raw.includes('..') || path.includes('..')) {
      return { module: '', command: '', refused: MSG_CANDIDATE_DOTDOT };
    }
    return { module: '', command: '', refused: MSG_CANDIDATE };
  }
  if (REBUILD_ALL_RE.test(raw)) {
    return { module: '', command: '', refused: MSG_REBUILD };
  }
  if (raw.includes('..')) {
    return { module: '', command: '', refused: MSG_PATH };
  }

  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const flags = tokens.filter(token => token.startsWith('/'));
  const words = tokens.filter(token => !token.startsWith('/'));
  const unknown = flags.filter(token => !COMMANDS.includes(token.slice(1).toLowerCase() as D1Command));
  if (unknown.length > 0) {
    return { module: '', command: '', refused: `Unknown flag: ${unknown[0]}.` };
  }
  if (flags.length !== 1) {
    return { module: words[0] || '', command: '', refused: MSG_ONE_COMMAND };
  }
  if (words.length === 0) {
    return { module: '', command: '', refused: MSG_USAGE };
  }
  if (words.length !== 1) {
    return { module: words[0], command: '', refused: `Unexpected argument: ${words[1]}.` };
  }
  const moduleName = words[0];
  if (!moduleTokenOk(moduleName)) {
    return { module: moduleName, command: '', refused: MSG_MODULE };
  }
  const command = flags[0].slice(1).toLowerCase() as D1Command;
  return { module: moduleName, command, refused: '' };
}

export function helpText(moduleName: string, project: number): string {
  const pending = D1_FLOW_STEP_IDS.filter(id => !(D1_IMPLEMENTED_STEP_IDS as readonly string[]).includes(id));
  return [
    `agentDefsL1 ${moduleName} in project ${project}.`,
    'Commands: /run, /resume, /help.',
    '/run records the checkpoint and stops at the first step that is not implemented.',
    '/resume continues an intact checkpoint and does not rewrite it.',
    '/candidate and /rebuild all are refused. Nothing is deleted.',
    `State file: ${displayPath(pipelineFile(project, moduleName))}.`,
    'domain30 writes domain defs. persistence40 writes ports, tables and adapters. usecases50 asks a model for operation steps only and does not write TypeScript. controllers60 writes one controller def per page and does not call a model. support70 writes the access scope, the authority map, the repository registry and the seed plan, and does not call a model.',
    `Steps not implemented yet: ${pending.join(', ')}.`,
  ].join('\n');
}

export function notImplementedTrace(stepId: D1StepId): string {
  return `step ${stepId} not implemented yet`;
}

export function stoppedTrace(stepId: D1StepId): string {
  return `stopped: step ${stepId} is not implemented`;
}

export function resumeMissing(moduleName: string, project: number): string {
  return `No checkpoint to resume for ${moduleName} in project ${project}.`;
}

export function checkpointConflict(moduleName: string, project: number): string {
  return `Checkpoint for ${moduleName} in project ${project} conflicts with this run. Nothing was overwritten.`;
}

export function checkpointNotIntact(moduleName: string, project: number): string {
  return `Checkpoint for ${moduleName} in project ${project} is not intact. Nothing was overwritten.`;
}

export function unknownPromptField(field: string): string {
  return `Unknown step prompt field: ${field}.`;
}

export function unknownPlanId(planId: string): string {
  return `Unknown planId: ${planId}.`;
}

export interface D1StepPrompt {
  planId: D1StepId;
  moduleName: string;
  project: number;
  command: 'run' | 'resume';
}

export type D1ParsedStepPrompt =
  | { kind: 'step'; prompt: D1StepPrompt }
  | { kind: 'refusal'; refusal: string };

const STEP_PROMPT_FIELDS = new Set(['planId', 'moduleName', 'project', 'command']);

export function parseD1StepPrompt(prompt: string): D1ParsedStepPrompt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(prompt || '{}'));
  } catch {
    return { kind: 'refusal', refusal: 'Step prompt must be JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'refusal', refusal: 'Step prompt must be a JSON object.' };
  }
  const raw = parsed as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!STEP_PROMPT_FIELDS.has(key)) return { kind: 'refusal', refusal: unknownPromptField(key) };
  }
  const moduleName = typeof raw.moduleName === 'string' ? raw.moduleName.trim() : '';
  const planId = typeof raw.planId === 'string' ? raw.planId.trim() : '';
  const command = raw.command;
  const project = raw.project;
  if (!moduleName) return { kind: 'refusal', refusal: 'Step prompt needs moduleName.' };
  if (!moduleTokenOk(moduleName)) return { kind: 'refusal', refusal: MSG_MODULE };
  if (!isD1StepId(planId)) return { kind: 'refusal', refusal: unknownPlanId(planId || '(missing)') };
  if (command !== 'run' && command !== 'resume') {
    return { kind: 'refusal', refusal: 'Step prompt command must be run or resume.' };
  }
  if (typeof project !== 'number' || !Number.isInteger(project) || project <= 0) {
    return { kind: 'refusal', refusal: MSG_PROJECT };
  }
  return { kind: 'step', prompt: { planId, moduleName, project, command } };
}

export function createEntryPipeline(project: number, moduleName: string, now: Date): D1PipelineState {
  const updatedAt = now.toISOString();
  return {
    schemaVersion: D1_PIPELINE_SCHEMA,
    flowId: D1_FLOW_ID,
    flowVersion: D1_FLOW_VERSION,
    project,
    moduleName,
    status: 'inProgress',
    command: 'run',
    steps: {
      entry10: {
        status: 'approved',
        updatedAt,
        artifactPaths: [displayPath(pipelineFile(project, moduleName))],
      },
    },
    updatedAt,
  };
}

export function isIntactCheckpoint(state: D1PipelineState, project: number, moduleName: string): boolean {
  if (state.schemaVersion !== D1_PIPELINE_SCHEMA) return false;
  if (state.flowId !== D1_FLOW_ID || state.flowVersion !== D1_FLOW_VERSION) return false;
  if (state.project !== project || state.moduleName !== moduleName) return false;
  if (state.status === 'failed') return false;
  const entry = state.steps.entry10;
  if (!entry || entry.status !== 'approved') return false;
  const artifact = displayPath(pipelineFile(project, moduleName));
  return (entry.artifactPaths || []).includes(artifact);
}

/**
 * Records the first missing step. Does not move the marker forward, does not
 * rewrite an approved step, and does not treat a later callback as progress.
 */
export function withAwaiting(
  pipeline: D1PipelineState,
  stepId: D1StepId,
  now: string,
): { pipeline: D1PipelineState; changed: boolean } {
  if (pipeline.status === 'failed') return { pipeline, changed: false };
  if (pipeline.steps.entry10?.status !== 'approved') return { pipeline, changed: false };
  if (pipeline.steps[stepId]?.status === 'approved') return { pipeline, changed: false };
  if (pipeline.awaitingStep) {
    const current = D1_FLOW_STEP_IDS.indexOf(pipeline.awaitingStep);
    const incoming = D1_FLOW_STEP_IDS.indexOf(stepId);
    if (current !== -1 && current <= incoming) return { pipeline, changed: false };
  }
  return {
    pipeline: {
      ...pipeline,
      status: 'awaitingStep',
      awaitingStep: stepId,
      updatedAt: now,
    },
    changed: true,
  };
}

export function createD1AgentStep(
  stepId: D1StepId,
  moduleName: string,
  project: number,
  command: 'run' | 'resume',
): mls.msg.AIAgentStep {
  const dependsOn = [...D1_STEP_DEPENDS_ON[stepId]];
  const prompt: D1StepPrompt = { planId: stepId, moduleName, project, command };
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: D1_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: D1_AGENT_NAME,
    prompt: JSON.stringify(prompt),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildD1PlannedSteps(
  moduleName: string,
  project: number,
  command: 'run' | 'resume',
): mls.msg.AIAgentStep[] {
  return D1_FLOW_STEP_IDS.map(stepId => createD1AgentStep(stepId, moduleName, project, command));
}

export function taskProject(context: mls.msg.ExecutionContext): number | null {
  const raw = context.task?.iaCompressed?.longMemory?.project;
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function taskModule(context: mls.msg.ExecutionContext): string {
  const raw = context.task?.iaCompressed?.longMemory?.moduleName;
  return typeof raw === 'string' ? raw.trim() : '';
}
