/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/p1Core.ts" enhancement="_blank"/>

import {
  diskFileInfo,
  displayPath,
  hostListFolder,
  moduleFile,
  normalizeModuleName,
  readJson,
  readPipeline,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { listPoolBox, readPoolMessage, type PoolMessage, type PoolTraceLine } from '/_102035_/l2/solution/pool.js';
import type { Ns5PipelineStatus, Ns5PipelineStepState } from '/_102035_/l2/solution/types.js';
import { readL1Inventory, type L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';

export const P1_FLOW_ID = 'agentPlannerL1' as const;
export const P1_FLOW_VERSION = '2026-09-20-p1-flow-v1' as const;
export const P1_AGENT_NAME = 'agentPlannerL1' as const;
export const P1_PIPELINE_SCHEMA_VERSION = '2026-09-20-p1-pipeline-v1' as const;
export const P1_NEEDS_SCHEMA = '2026-09-21-p2-needs-v1' as const;

/** Steps the current flow.json actually runs. plan20 is declared and waiting (p1_02). */
export const P1_FLOW_STEP_IDS = ['entry10', 'plan20'] as const;

export const P1_STEP_IDS = P1_FLOW_STEP_IDS;

export type P1FlowStepId = typeof P1_FLOW_STEP_IDS[number];
export type P1StepId = typeof P1_STEP_IDS[number];

/** Last step of `docs/flow.json` — that step's afterPrompt closes the pipeline (p1_02). */
export const P1_FLOW_LAST_STEP_ID: P1FlowStepId = P1_FLOW_STEP_IDS[P1_FLOW_STEP_IDS.length - 1];

export const P1_STEP_TITLES: Record<P1StepId, string> = {
  entry10: 'Entry',
  plan20: 'Plan',
};

export const P1_STEP_DEPENDS_ON: Record<P1StepId, readonly string[]> = {
  entry10: [],
  plan20: ['entry10-done'],
};

/** Pool message file: `<stamp>_<thread>_<round>`. `needs.json` does not match. */
const POOL_MESSAGE_SHORT = /^\d{14}_[A-Za-z0-9]+-\d{14}_[123]$/;

export interface P1ParsedInvocation {
  module: string;
}

export type P1EntrySource =
  | { kind: 'hand'; moduleName: string }
  | { kind: 'step'; moduleName: string; thread: string; file: string };

export interface P1Needs {
  schemaVersion: string;
  moduleName: string;
  device?: string;
  pages?: unknown[];
}

export interface P1PipelineState {
  schemaVersion: typeof P1_PIPELINE_SCHEMA_VERSION;
  flowId: typeof P1_FLOW_ID;
  moduleName: string;
  status: Ns5PipelineStatus;
  awaitingStep?: P1StepId;
  steps: Partial<Record<P1StepId, Ns5PipelineStepState>>;
  thread: string;
  round: number;
  messageFile: string;
  sourceMessages: string[];
  needsFile: string;
  inventory: L1Inventory;
  pool?: PoolTraceLine[];
  updatedAt: string;
}

export interface P1LoadedEntry {
  moduleName: string;
  file: Ns5FileInfo;
  message: PoolMessage;
  sourceMessages: string[];
  needsFile: Ns5FileInfo;
  needs: P1Needs;
}

export type P1LoadResult = P1LoadedEntry | { refusal: string };
export type P1ExecuteResult = { pipeline: P1PipelineState; file: Ns5FileInfo; message: PoolMessage } | { refusal: string };

const AGENT_PREFIXES = [
  /@@\s*_102021_\/l2\/agentPlannerL1/gi,
  /@@\s*_102021_agentPlannerL1/gi,
  /@@\s*agentPlannerL1/gi,
];

export function isP1StepId(value: string): value is P1StepId {
  return (P1_STEP_IDS as readonly string[]).includes(value);
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

/**
 * Maps child planIds back to the owning step. Done-anchors stay unmatched so they
 * are not dispatched. A step prompt `{ moduleName, thread, file }` (pool dispatch)
 * is entry10.
 */
export function ownerStepId(planId: string, prompt?: string): P1StepId | '' {
  if (isP1StepId(planId)) return planId;
  for (const id of P1_STEP_IDS) {
    if (planId === `${id}-done` || planId.startsWith(`${id}-clarification`)) return '';
    if (planId.startsWith(`${id}-`)) return id;
  }
  if (isPoolEntryPrompt(prompt)) return 'entry10';
  return '';
}

export function isPoolEntryPrompt(prompt?: string): boolean {
  const parsed = parseP1StepPrompt(prompt || '');
  return parsed.kind === 'step';
}

export function parseP1Invocation(value: string): P1ParsedInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');
  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return { module: tokens[0] || '' };
}

export function p1InvocationRefusal(invocation: P1ParsedInvocation): string {
  if (!invocation.module) return 'Pass @@agentPlannerL1 <lowerCamel>.';
  if (!moduleTokenOk(invocation.module)) return 'Module name must be lowerCamel (example: stockControl).';
  return '';
}

export type P1StepPrompt =
  | { kind: 'step'; moduleName: string; thread: string; file: string }
  | { kind: 'entry'; moduleName: string }
  | { kind: 'refusal'; refusal: string };

export function parseP1StepPrompt(prompt: string): P1StepPrompt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(prompt || '{}'));
  } catch {
    return { kind: 'refusal', refusal: 'step prompt must be JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'refusal', refusal: 'step prompt must be a JSON object.' };
  }
  const raw = parsed as Record<string, unknown>;
  const moduleName = typeof raw.moduleName === 'string' ? raw.moduleName.trim() : '';
  const thread = typeof raw.thread === 'string' ? raw.thread.trim() : '';
  const file = typeof raw.file === 'string' ? raw.file.trim() : '';
  if (moduleName && thread && file) return { kind: 'step', moduleName, thread, file };
  if (moduleName) return { kind: 'entry', moduleName };
  return { kind: 'refusal', refusal: 'step prompt needs moduleName.' };
}

/** `l1/<module>/pipeline/pipeline.json` in the project of the run. */
export function p1PipelineFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${base.folder}/pipeline`,
    shortName: 'pipeline',
    extension: '.json',
  };
}

/** `l4/<module>/pool/l1/web/needs.json` — written by L2, read here. */
export function p1NeedsFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l1/web`,
    shortName: 'needs',
    extension: '.json',
  };
}

export function createP1Pipeline(
  moduleName: string,
  message: PoolMessage,
  messageFile: string,
  now: Date,
  sourceMessages: string[],
  needsFile: string,
  inventory: L1Inventory,
): P1PipelineState {
  const updatedAt = now.toISOString();
  return {
    schemaVersion: P1_PIPELINE_SCHEMA_VERSION,
    flowId: P1_FLOW_ID,
    moduleName,
    status: 'inProgress',
    steps: {
      entry10: {
        status: 'approved',
        updatedAt,
        artifactPaths: [`l1/${moduleName}/pipeline/pipeline.json`],
      },
    },
    thread: message.thread,
    round: message.round,
    messageFile,
    sourceMessages,
    needsFile,
    inventory,
    updatedAt,
  };
}

export function createP1AgentStep(
  stepId: P1StepId,
  moduleName: string,
  entry: { thread: string; file: string },
): mls.msg.AIAgentStep {
  const dependsOn = [...P1_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: P1_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: P1_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName, thread: entry.thread, file: entry.file }),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildP1PlannedSteps(
  moduleName: string,
  entry: { thread: string; file: string },
): mls.msg.AIAgentStep[] {
  return P1_FLOW_STEP_IDS.map(stepId => createP1AgentStep(stepId, moduleName, entry));
}

export function isP1PoolMessageFile(shortName: string): boolean {
  return POOL_MESSAGE_SHORT.test(shortName);
}

function poolMessageFileName(file: Ns5FileInfo): string {
  return `${file.shortName}${file.extension}`;
}

function requestKey(moduleName: string, message: PoolMessage): string {
  const threadModule = message.thread.replace(/-\d{14}$/, '') || moduleName;
  const artifacts = [...message.artifacts].map(item => item.trim()).filter(Boolean).sort().join('\0');
  return `${threadModule}\0${message.mode}\0${artifacts}`;
}

export function p1DifferentRequestsRefusal(count: number): string {
  return `pool/l1 has ${count} different requests; resolve with the l2 planner`;
}

function matchPoolFile(file: Ns5FileInfo, wanted: string): boolean {
  const path = displayPath(file);
  return path === wanted || file.shortName === wanted || `${file.shortName}${file.extension}` === wanted;
}

function isNeedsArtifact(path: string): boolean {
  const trimmed = path.trim();
  return trimmed === 'pool/l1/web/needs.json' || /(^|\/)needs\.json$/.test(trimmed);
}

function isL2NeedsMessage(message: PoolMessage): boolean {
  return message.from === 'l2' && message.to === 'l1' && message.artifacts.some(isNeedsArtifact);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function loadNeeds(moduleName: string, message: PoolMessage): Promise<{ needsFile: Ns5FileInfo; needs: P1Needs } | { refusal: string }> {
  if (!message.artifacts.some(isNeedsArtifact)) return { refusal: 'needs.json is missing' };
  const needsFile = p1NeedsFile(moduleName);
  const raw = await readJson<unknown>(needsFile);
  if (raw === null) return { refusal: 'needs.json is missing' };
  if (!isRecord(raw)) return { refusal: 'needs.json schema is unknown' };
  if (raw.schemaVersion !== P1_NEEDS_SCHEMA) return { refusal: 'needs.json schema is unknown' };
  return {
    needsFile,
    needs: {
      schemaVersion: String(raw.schemaVersion),
      moduleName: typeof raw.moduleName === 'string' ? raw.moduleName : '',
      device: typeof raw.device === 'string' ? raw.device : undefined,
      pages: Array.isArray(raw.pages) ? raw.pages : [],
    },
  };
}

export async function loadP1Entry(source: P1EntrySource): Promise<P1LoadResult> {
  const moduleName = normalizeModuleName(source.moduleName, '');
  if (!moduleName || !moduleTokenOk(moduleName)) {
    return { refusal: 'Module name must be lowerCamel (example: stockControl).' };
  }

  const l4 = await readPipeline(moduleName);
  if (!l4 || l4.status !== 'complete') {
    return { refusal: `Module "${moduleName}" has no complete l4.` };
  }

  const box = listPoolBox(moduleName, 'l1').filter(file => isP1PoolMessageFile(file.shortName));
  if (!box.length) return { refusal: `nothing pending for ${moduleName} in pool/l1` };

  const loaded: Array<{ file: Ns5FileInfo; message: PoolMessage }> = [];
  for (const file of box) {
    loaded.push({ file, message: await readPoolMessage(file) });
  }

  const needsRequests = loaded.filter(entry => isL2NeedsMessage(entry.message));
  if (!needsRequests.length) return { refusal: 'needs.json is missing' };

  const groups = new Map<string, typeof needsRequests>();
  for (const entry of needsRequests) {
    const key = requestKey(moduleName, entry.message);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  if (groups.size > 1) return { refusal: p1DifferentRequestsRefusal(groups.size) };

  const group = needsRequests;
  const oldest = group[0];
  const sourceMessages = group.map(entry => poolMessageFileName(entry.file));

  if (source.kind === 'step') {
    const specified = group.find(entry => matchPoolFile(entry.file, source.file));
    if (!specified) return { refusal: `pool/l1 message not found: ${source.file}` };
    if (specified.message.thread !== source.thread) {
      return { refusal: `message thread does not match '${source.thread}'.` };
    }
  }

  const needs = await loadNeeds(moduleName, oldest.message);
  if ('refusal' in needs) return needs;

  return {
    moduleName,
    file: oldest.file,
    message: oldest.message,
    sourceMessages,
    needsFile: needs.needsFile,
    needs: needs.needs,
  };
}

export async function writeP1Entry(loaded: P1LoadedEntry, now: Date): Promise<P1PipelineState> {
  await clearP1Scratch(loaded.moduleName);
  const messageFile = displayPath(loaded.file);
  const inventory = await readL1Inventory(moduleFile(loaded.moduleName).project, loaded.moduleName);
  const pipeline = createP1Pipeline(
    loaded.moduleName,
    loaded.message,
    messageFile,
    now,
    loaded.sourceMessages,
    displayPath(loaded.needsFile),
    inventory,
  );
  await writeJson(p1PipelineFile(loaded.moduleName), pipeline);
  return pipeline;
}

function isP1ScratchFolder(folder: string, moduleName: string): boolean {
  return folder === `${moduleName}/pipeline` || folder.startsWith(`${moduleName}/pipeline/`);
}

function listP1ScratchFiles(moduleName: string): Ns5FileInfo[] {
  const base = moduleFile(moduleName);
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, Ns5FileInfo>();
  const remember = (info: Ns5FileInfo) => {
    found.set(`${info.folder}/${info.shortName}${info.extension}`, info);
  };
  for (const file of Object.values(files)) {
    if (!file || file.project !== base.project || Number(file.level) !== 1 || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!isP1ScratchFolder(folder, moduleName) || !file.shortName) continue;
    remember({
      project: base.project,
      level: 1,
      folder,
      shortName: String(file.shortName),
      extension: String(file.extension || ''),
    });
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    const folders = new Set<string>([`${moduleName}/pipeline`]);
    for (const info of found.values()) folders.add(info.folder);
    for (const folder of folders) {
      for (const info of listFolder(base.project, 1, folder)) {
        if (!info.shortName) continue;
        const key = mls.stor.getKeyToFile(info);
        const indexed = files[key];
        if (indexed?.status === 'deleted') continue;
        if (!indexed) files[key] = diskFileInfo(info);
        remember({
          project: base.project,
          level: 1,
          folder,
          shortName: String(info.shortName),
          extension: String(info.extension || ''),
        });
      }
    }
  }
  return [...found.values()];
}

async function clearP1Scratch(moduleName: string): Promise<void> {
  const files = listP1ScratchFiles(moduleName);
  if (!files.length) return;
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const file of files) {
    await deleteFile(diskFileInfo(file));
  }
}

export async function executeP1Entry(source: P1EntrySource, now: Date): Promise<P1ExecuteResult> {
  const loaded = await loadP1Entry(source);
  if ('refusal' in loaded) return loaded;
  const pipeline = await writeP1Entry(loaded, now);
  return { pipeline, file: loaded.file, message: loaded.message };
}

export async function readP1Pipeline(moduleName: string): Promise<P1PipelineState | null> {
  return readJson<P1PipelineState>(p1PipelineFile(moduleName));
}

/** `l1/<module>/pipeline/<stepId>-draft.json` in the project of the run. */
export function p1DraftFile(moduleName: string, stepId: P1StepId): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 1,
    folder: `${base.folder}/pipeline`,
    shortName: `${stepId}-draft`,
    extension: '.json',
  };
}

/** Files of this agent (prompt.md, skills) live in 102021, not in the run module. */
export function p1AgentFile(folder: string, shortName: string, extension: string): Ns5FileInfo {
  return {
    project: 102021,
    level: 2,
    folder: folder ? `agentPlannerL1/${folder}` : 'agentPlannerL1',
    shortName,
    extension,
  };
}

export async function readP1AgentText(folder: string, shortName: string, extension: string): Promise<string> {
  const fileInfo = p1AgentFile(folder, shortName, extension);
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)] as {
    status?: string;
    getValueInfo?: () => Promise<{ content?: unknown }>;
    getContent: () => Promise<unknown>;
  } | undefined;
  if (!file || file.status === 'deleted') {
    throw new Error(`agentPlannerL1 file not found: ${displayPath(fileInfo)}`);
  }
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* fall through */ }
  }
  const content = await file.getContent();
  if (typeof content === 'string') return content;
  throw new Error(`agentPlannerL1 invalid text file: ${displayPath(fileInfo)}`);
}

/** `complete` = every step of `flow.json` is approved. A failed pipeline stays failed. */
export function markP1Complete(pipeline: P1PipelineState, now = new Date().toISOString()): P1PipelineState {
  if (pipeline.status === 'failed') return pipeline;
  for (const stepId of P1_FLOW_STEP_IDS) {
    if (pipeline.steps[stepId]?.status !== 'approved') return pipeline;
  }
  return {
    ...pipeline,
    status: 'complete',
    awaitingStep: undefined,
    updatedAt: now,
  };
}

export function markP1Step(
  pipeline: P1PipelineState,
  stepId: P1StepId,
  next: Ns5PipelineStepState,
): P1PipelineState {
  const current = pipeline.steps[stepId];
  if (current?.status === 'approved') {
    return { ...pipeline, updatedAt: next.updatedAt };
  }
  const failed = next.status === 'failed';
  const approved = next.status === 'approved';
  return {
    ...pipeline,
    steps: { ...pipeline.steps, [stepId]: next },
    updatedAt: next.updatedAt,
    ...(failed ? { status: 'failed' as const, awaitingStep: undefined } : {}),
    ...(approved && pipeline.awaitingStep === stepId
      ? { status: 'inProgress' as const, awaitingStep: undefined }
      : {}),
  };
}

export function createP1RetryStep(
  stepId: P1StepId,
  moduleName: string,
  kind: 'repair' | 'transport',
  attempt: number,
  extra: Record<string, unknown> = {},
): mls.msg.AIAgentStep {
  const planId = `${stepId}-${kind}-${attempt}`;
  const suffix = kind === 'repair' ? `R${attempt}` : `T${attempt}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `${P1_STEP_TITLES[stepId]} · ${suffix}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: P1_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName, [`${kind}Attempt`]: attempt, ...extra }),
    rags: [],
    planning: {
      planId,
      dependsOn: [],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}
