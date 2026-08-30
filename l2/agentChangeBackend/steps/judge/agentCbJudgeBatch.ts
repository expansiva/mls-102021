/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/agentCbJudgeBatch.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JUDGE WORKER — one slice of the module per call.
//
// The pairs prompt (L4 contract + generated usecase defs) does not fit in one call at ns4 scale: 119
// pairs are ~950KB and the intents POST answered 413. The slices are independent — their findings
// only meet in the collector — so they run as a parallel fan-out instead of a chain of steps
// (skills/agentsBestPractices.md §4: "sequential chains for independent items" is an anti-pattern).
//
// This worker never returns `failed` (a failed child fails the whole task) and never adds steps: it
// writes what it found to disk and completes with a trace. The collector reads the disk.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  readBackendScan, createPromptReadyIntent, createUpdateStatusIntent, readCbPrompt,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema,
  isRecord, readString, logPrefix,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { judgeResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { recordLlmCost, type CbJudgeFinding } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  judgeArgsOf, judgeFindingsFileInfo, missingDefsFindings, ownerContract, readUsecaseDefsByOwner,
  scopedOperations, type CbJudgeBatchFindings,
} from '/_102021_/l2/agentChangeBackend/steps/judge/judgeShared.js';
import { judgeBatchContextLines } from '/_102021_/l2/agentChangeBackend/steps/judge/judgeBatchContext.js';

const AGENT_NAME = 'agentCbJudgeBatch';
const TOOL_NAME = 'submitJudgeFindings';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the judge findings.', judgeResultSchema);

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/judge',
    agentDescription: 'Judges ONE batch of usecase defs against their L4 contracts and persists the findings',
    visibility: 'private', beforePromptStep, afterPromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const batch = await resolveBatch(scan, step, args);
    if (!batch.operations.length) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'empty judge batch')];
    }
    const validPorts = [
      ...scan.aggregates.map(a => a.rootEntity),
      ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId),
    ];
    const mdmIds = scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId);
    const derivedIds = scan.entities.filter(e => e.kind === 'derived').map(e => e.entityId);
    const pairs = batch.operations.map(owner => ({
      l4Contract: ownerContract(owner),
      generatedUsecaseDefs: batch.defsByOwner.get(owner.id) ?? null,
    }));
    const human = [
      ...judgeBatchContextLines(validPorts, mdmIds, derivedIds),
      '',
      '## Pairs to judge (L4 contract = source of truth vs generated usecase defs)',
      JSON.stringify(pairs, null, 2),
      '',
      // Each call sees ONLY its own slice and must not reason about what it cannot see; a finding
      // about an owner outside the batch is discarded by the collector anyway.
      `NOTE: batch ${batch.batchIndex} of judge run ${batch.judgeRun} — ${batch.operations.length} usecase(s) of this module.`,
      `Judge every pair. Call ${TOOL_NAME} with the findings (empty array when everything is coherent).`,
    ].join('\n');
    const systemPrompt = await readCbPrompt('steps/judge');
    return [createPromptReadyIntent(context, parentStep, hookSequential, args || String(step.prompt || ''), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
  } catch (error) {
    // A worker never fails: the collector sees a missing findings file as "this batch said nothing".
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `judge batch skipped (error): ${message}`)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('judge', step.interaction);
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const batch = await resolveBatch(scan, step, args);
    const payload = step.interaction?.payload?.[0];
    const out = payload ? extractPlannerOutput(payload, plannerConfig(TOOL_NAME)) : null;
    const raw = out && Array.isArray((out.result as any).findings) ? (out.result as any).findings.filter(isRecord) : [];
    const owners = new Set(batch.operations.map(owner => owner.id));
    const llmFindings: CbJudgeFinding[] = raw
      .map((f: any): CbJudgeFinding => ({
        ownerId: readString(f.ownerId),
        type: (readString(f.type) as CbJudgeFinding['type']) || 'estrutural',
        severity: (readString(f.severity) as CbJudgeFinding['severity']) || 'warning',
        message: readString(f.message),
        ...(readString(f.suggestion) ? { suggestion: readString(f.suggestion) } : {}),
      }))
      .filter((f: CbJudgeFinding) => !!f.message && f.type !== 'fora_de_escopo' && owners.has(f.ownerId));
    const findings = [...missingDefsFindings(batch.defsByOwner, scan, batch.operations), ...llmFindings];
    await saveBatchFindings({
      runId: batch.runId, judgeRun: batch.judgeRun, batchIndex: batch.batchIndex,
      owners: [...owners], findings, savedAt: new Date().toISOString(),
    });
    const errors = findings.filter(finding => finding.severity === 'error').length;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
      `batch ${batch.batchIndex}: ${batch.operations.length} usecase(s), ${errors} error finding(s), ${findings.length - errors} warning(s)`, 'input_output')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `judge batch skipped (error): ${message}`, 'input')];
  }
}

/** The owners of THIS batch: the dispatcher put their ids in the step args, so nothing is re-planned. */
async function resolveBatch(scan: Awaited<ReturnType<typeof readBackendScan>>, step: mls.msg.AIAgentStep, args?: string) {
  const parsed = judgeArgsOf(args ? ({ prompt: args } as mls.msg.AIAgentStep) : step);
  const { operations } = scopedOperations(scan, args ? ({ prompt: JSON.stringify({ judgeRun: parsed.judgeRun }) } as mls.msg.AIAgentStep) : step);
  const wanted = new Set(parsed.queue || parsed.owners);
  const mine = operations.filter(owner => wanted.has(owner.id));
  return {
    runId: parsed.runId,
    judgeRun: parsed.judgeRun,
    batchIndex: parsed.batchIndex,
    operations: mine,
    defsByOwner: await readUsecaseDefsByOwner(scan, mine),
  };
}

async function saveBatchFindings(value: CbJudgeBatchFindings): Promise<void> {
  const info = judgeFindingsFileInfo(value.runId, value.judgeRun, value.batchIndex);
  const source = `${JSON.stringify(value, null, 2)}\n`;
  const key = mls.stor.getKeyToFile(info);
  let file = mls.stor.files[key];
  if (!file) file = await createStorFile({ ...info, source }, false, false, false);
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
}
