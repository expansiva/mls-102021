/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/agentCbSeedAssets.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Optional asset materialization after the deterministic seed plan. The image service is deliberately
// non-blocking: every failed request is recorded in L3 and its seed value remains null.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import {
  createAgentStepPayload, createUpdateStatusIntent, enqueueNext, enqueueNextInPhase, isRecord, logPrefix, readBackendScan,
  readCbPrompt, readNoAssets,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { extractSeedPlanFromSource, updateSeedAssetUrlsInSource, type SeedEntityDefinition } from '/_102021_/l2/agentChangeBackend/helpers/cbSeedsCore.js';
import {
  collectSeedAssetRequests, emptySeedAssetManifest, parseSeedAssetManifest, putSeedAssetManifestEntry,
  readySeedAssetUrls, seedAssetWarnings, capSeedAssetRequests, seedAssetCapWarning,
  type SeedAssetManifest, type SeedAssetRequest,
} from '/_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.js';

const AGENT_NAME = 'agentCbSeedAssets';
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_SOURCE_BYTES = 12_000_000;

interface AssetStepArgs { skippedAssetIds: string[]; }

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentChangeBackend/steps/gen-seed-assets',
    agentDescription: 'Generate optional seed images, persist them in L3, and update the seed asset manifest',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // T11 `--no-assets`: skip the image step entirely. Reuses the existing degradation path, so the
    // seeds source is still rewritten (with whatever assets are already ready) and the flow proceeds
    // to cb-register — zero image calls, seeds intact.
    if (readNoAssets(context)) {
      const state = await loadState(context);
      return completeAssets(context, parentStep, step, hookSequential, state, 'Seed assets skipped (--no-assets).');
    }
    const state = await loadState(context);
    const args = stepArgs(step);
    const request = await nextRequest(state, args.skippedAssetIds);
    if (!request) return completeAssets(context, parentStep, step, hookSequential, state, 'Seed assets reused or not requested.');
    const systemPrompt = await readCbPrompt('steps/gen-seed-assets');
    if (!context.task) throw new Error('task invalid');
    return [{
      type: 'prompt_ready',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task.PK,
      hookSequential,
      parentStepId: parentStep.stepId,
      args: step.prompt || '',
      systemPrompt,
      humanPrompt: `${request.prompt}\n\nAlt text: ${request.alt}\nTarget: ${request.targetPath}`,
    }];
  } catch (error) {
    const message = `Seed asset setup warning: ${errorMessage(error)}`;
    console.warn(`${logPrefix(agent)} ${message}`);
    return registerWithoutAssets(context, parentStep, step, hookSequential, message);
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const state = await loadState(context);
    const args = stepArgs(step);
    const request = await nextRequest(state, args.skippedAssetIds);
    if (!request) return completeAssets(context, parentStep, step, hookSequential, state, 'Seed assets already completed.');
    let manifest = state.manifest;
    try {
      const dataUrl = imageUrlFromPayload(step.interaction?.payload?.[0]);
      const image = await fetchWebp(dataUrl, request.maxWidth);
      await saveImage(state.project, state.moduleName, request, image);
      manifest = putSeedAssetManifestEntry(manifest, readyEntry(request));
    } catch (error) {
      manifest = putSeedAssetManifestEntry(manifest, failedEntry(request, errorMessage(error)));
    }
    await saveManifest(state.project, state.moduleName, manifest);
    const nextState = { ...state, manifest };
    const next = await nextRequest(nextState, [...args.skippedAssetIds, request.assetId]);
    if (next) return scheduleNext(context, parentStep, step, hookSequential, [...args.skippedAssetIds, request.assetId], `${request.assetId}: ${manifest.assets.find(asset => asset.id === request.assetId)?.status || 'processed'}`);
    return completeAssets(context, parentStep, step, hookSequential, nextState, `Processed ${request.assetId}.`);
  } catch (error) {
    const message = `Seed asset processing warning: ${errorMessage(error)}`;
    console.warn(`${logPrefix(agent)} ${message}`);
    return registerWithoutAssets(context, parentStep, step, hookSequential, message);
  }
}

function stepArgs(step: mls.msg.AIAgentStep): AssetStepArgs {
  try {
    const value = JSON.parse(String(step.prompt || '{}')) as Record<string, unknown>;
    return { skippedAssetIds: Array.isArray(value.skippedAssetIds) ? value.skippedAssetIds.filter((id): id is string => typeof id === 'string').slice(0, 100) : [] };
  } catch {
    return { skippedAssetIds: [] };
  }
}

async function loadState(context: mls.msg.ExecutionContext): Promise<{ project: number; moduleName: string; entities: SeedEntityDefinition[]; source: string; manifest: SeedAssetManifest }> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  const moduleName = scan.moduleNames[0] || 'unknown';
  const source = await readSeedSource(scan.project, moduleName);
  const plan = extractSeedPlanFromSource(source);
  if (!plan) throw new Error('final seed plan was not found');
  return {
    project: scan.project,
    moduleName,
    entities: scan.entities.map(entity => ({ entityId: entity.entityId, title: entity.title, kind: entity.kind, fields: [] })),
    source,
    manifest: await readManifest(scan.project, moduleName),
  };
}

/** The capped candidate list for this run + the ids dropped by the cap (T11). */
function cappedRequests(state: Awaited<ReturnType<typeof loadState>>): { kept: SeedAssetRequest[]; dropped: string[] } {
  const plan = extractSeedPlanFromSource(state.source);
  if (!plan) return { kept: [], dropped: [] };
  return capSeedAssetRequests(collectSeedAssetRequests(state.moduleName, plan, state.entities));
}

async function nextRequest(state: Awaited<ReturnType<typeof loadState>>, skipped: string[]): Promise<SeedAssetRequest | null> {
  for (const request of cappedRequests(state).kept) {
    if (skipped.includes(request.assetId)) continue;
    // CACHE (T11): an asset already `ready` with the SAME promptHash and its .webp still on disk is
    // never re-requested — the image LLM is not called at all on an unchanged re-run.
    const entry = state.manifest.assets.find(asset => asset.id === request.assetId);
    if (entry?.status === 'ready' && entry.promptHash === request.promptHash && await hasReadyImage(state.project, state.moduleName, request)) continue;
    return request;
  }
  return null;
}

function scheduleNext(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, skippedAssetIds: string[], trace: string): mls.msg.AgentIntent[] {
  const planId = `cb-seed-assets-${Date.now()}`;
  const nextStep = createAgentStepPayload(planId, AGENT_NAME, 'Gerar próximo asset de seed', { planId, skippedAssetIds }, [], 'sequential', 'waiting_human_input');
  // Seed images are OPTIONAL. If the image LLM call fails at the proxy (e.g. INVALID_JSON_CONTENT from
  // an image model, or a 502), the runtime would mark the step — and the whole task — failed BEFORE
  // afterPromptStep runs. 'continue' lets afterPromptStep run anyway; it records the failure as a
  // warning (seed value stays null) and proceeds to cb-register, so an optional asset never kills the run.
  nextStep.onFailure = 'continue';
  return [
    { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step: nextStep },
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
  ];
}

async function completeAssets(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, state: Awaited<ReturnType<typeof loadState>>, trace: string): Promise<mls.msg.AgentIntent[]> {
  const updated = updateSeedAssetUrlsInSource(state.source, readySeedAssetUrls(state.manifest), seedAssetWarnings(state.manifest));
  const saved = await saveGeneratedTs(state.project, 1, `${state.moduleName}/layer_1_external/adapters/persistence`, 'seeds', updated);
  if (!saved.ok || saved.compileErrors.length) throw new Error(`failed to update seeds.ts with asset URLs: ${saved.compileErrors.join('; ')}`);
  const warnings = seedAssetWarnings(state.manifest);
  // T11 "no silent caps": candidates dropped by the per-run cap are always reported in the step trace.
  // Not on the --no-assets path: EVERY asset was skipped there, so a cap note would only muddle the trace.
  const capNote = readNoAssets(context) ? '' : seedAssetCapWarning(cappedRequests(state).dropped);
  if (capNote) console.warn(`[agentCbSeedAssets] ${capNote}`);
  return [
    enqueueNextInPhase(context, step, 'finalization', 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${trace}${warnings.length ? ` ${warnings.length} optional asset warning(s): ${warnings.join('; ')}` : ''}${capNote ? ` ${capNote}` : ''}`, 'input_output'),
  ];
}

function registerWithoutAssets(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, trace: string): mls.msg.AgentIntent[] {
  return [
    enqueueNextInPhase(context, step, 'finalization', 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
  ];
}

async function readSeedSource(project: number, moduleName: string): Promise<string> {
  const info = { project, level: 1, folder: `${moduleName}/layer_1_external/adapters/persistence`, shortName: 'seeds', extension: '.ts' };
  const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info)];
  if (!file || file.status === 'deleted') throw new Error('seeds.ts not found');
  const content = await file.getContent();
  if (typeof content !== 'string') throw new Error('seeds.ts is not text');
  return content;
}

async function readManifest(project: number, moduleName: string): Promise<SeedAssetManifest> {
  const info = manifestInfo(project, moduleName);
  const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info)];
  if (!file || file.status === 'deleted') return emptySeedAssetManifest(moduleName);
  try { return parseSeedAssetManifest(JSON.parse(String(await file.getContent())), moduleName); } catch { return emptySeedAssetManifest(moduleName); }
}

async function saveManifest(project: number, moduleName: string, manifest: SeedAssetManifest): Promise<void> {
  const info = manifestInfo(project, moduleName);
  const source = `${JSON.stringify(manifest, null, 2)}\n`;
  const key = mls.stor.getKeyToFile(info);
  let file = (mls.stor.files as Record<string, any>)[key];
  if (!file) file = await createStorFile({ ...info, source }, false, false, false);
  else {
    file.status = file.status === 'new' ? 'new' : 'changed';
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  }
  file.updatedAt = new Date().toISOString();
}

function manifestInfo(project: number, moduleName: string) {
  return { project, level: 3, folder: `${moduleName}/assets`, shortName: 'seed-assets', extension: '.json' };
}

async function hasReadyImage(project: number, moduleName: string, request: SeedAssetRequest): Promise<boolean> {
  const [entityId, seedKey] = request.assetId.split('/');
  const info = { project, level: 3, folder: `${moduleName}/assets/seed/${entityId}`, shortName: seedKey, extension: '.webp' };
  const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info)];
  if (!file || file.status === 'deleted') return false;
  const content = await file.getContent();
  return content instanceof Blob && content.type === 'image/webp' && content.size > 0 && content.size <= MAX_IMAGE_BYTES;
}

async function saveImage(project: number, moduleName: string, request: SeedAssetRequest, image: Blob): Promise<void> {
  const [entityId, seedKey] = request.assetId.split('/');
  const info = { project, level: 3, folder: `${moduleName}/assets/seed/${entityId}`, shortName: seedKey, extension: '.webp', versionRef: '0', updatedAt: new Date().toISOString() };
  const file = await mls.stor.addOrUpdateFile(info);
  if (!file) throw new Error(`cannot create ${request.targetPath}`);
  file.status = file.status === 'new' ? 'new' : 'changed';
  file.updatedAt = info.updatedAt;
  if (!(await mls.stor.localStor.setContent(file, { contentType: 'blob', content: image }))) throw new Error(`cannot save ${request.targetPath}`);
}

function readyEntry(request: SeedAssetRequest) {
  return { id: request.assetId, path: request.path, publicUrl: request.publicUrl, source: 'imagem' as const, promptHash: request.promptHash, status: 'ready' as const };
}

function failedEntry(request: SeedAssetRequest, warning: string) {
  return { id: request.assetId, path: request.path, publicUrl: request.publicUrl, source: 'imagem' as const, promptHash: request.promptHash, status: 'failed' as const, warning: warning.slice(0, 300) };
}

function imageUrlFromPayload(payload: unknown): string {
  const value = parsePayload(payload);
  const candidate = isRecord(value) && isRecord(value.result) ? value.result.dataUrl : undefined;
  if (typeof candidate !== 'string' || !candidate) throw new Error('image response has no dataUrl');
  const url = new URL(candidate);
  if (url.protocol !== 'https:') throw new Error('image dataUrl must be HTTPS');
  return url.toString();
}

function parsePayload(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

async function fetchWebp(dataUrl: string, maxWidth: number): Promise<Blob> {
  const response = await fetch(dataUrl, { credentials: 'omit', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`image download failed: HTTP ${response.status}`);
  const source = await response.blob();
  if (!source.type.startsWith('image/') || source.size === 0 || source.size > MAX_SOURCE_BYTES) throw new Error('image response is not a bounded image');
  const bitmap = await createImageBitmap(source);
  try {
    const width = Math.min(maxWidth, bitmap.width);
    const height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
    if (typeof OffscreenCanvas === 'undefined') throw new Error('WebP conversion is unavailable');
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('cannot create image canvas');
    ctx.drawImage(bitmap, 0, 0, width, height);
    for (const quality of [0.9, 0.8, 0.7]) {
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality });
      if (webp.type === 'image/webp' && webp.size > 0 && webp.size <= MAX_IMAGE_BYTES) return webp;
    }
    throw new Error(`WebP exceeds ${MAX_IMAGE_BYTES} bytes`);
  } finally {
    bitmap.close();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
