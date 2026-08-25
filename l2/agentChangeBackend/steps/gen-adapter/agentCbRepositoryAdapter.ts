/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/agentCbRepositoryAdapter.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the repository ADAPTER (layer_1_external/adapters/persistence) implementing the port:
// maps domain <-> row (columns + details JSONB with child collections), resolves MDM via the 102034
// facade. The ONLY place with ctx.data.moduleData.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { recordLlmCost } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  readBackendScan, planTableColumns, createPromptReadyIntent, createUpdateStatusIntent, enqueueNext, readCbPrompt,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, batchSchema, asArray, saveAgentTrace,
  saveDefs, buildArtifact, buildPipelineItem, repositoryAdapterFileInfo, repositoryPortFileInfo,
  persistenceTableFileInfo, domainEntityFileInfo, dtsRef, layerSkills, readString, lowerFirst, logPrefix, planIdOf,
  newestL4DefsMs, defsCurrent, isRebuildCommand,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { repositoryAdapterResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';

const AGENT_NAME = 'agentCbRepositoryAdapter';
const TOOL_NAME = 'submitRepositoryAdapters';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the repository adapters.', batchSchema(repositoryAdapterResultSchema));

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-adapter', agentDescription: 'Generate repository adapters (port impl, ctx.data)', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  if (!isRebuildCommand(context)) {
    const module = scan.moduleNames[0] || 'unknown';
    const targetIds = [...scan.aggregates.map(a => a.rootEntity), ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId)];
    const watermark = newestL4DefsMs(scan.project);
    if (targetIds.length && targetIds.every(id => defsCurrent(repositoryAdapterFileInfo(module, id), watermark))) {
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-usecase', 'agentCbUsecase', 'Gerar usecases', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused ${targetIds.length} repository adapter .defs.ts (L4 unchanged; skipped generation)`, 'input_output'),
      ];
    }
  }
  const entityIds = new Set(scan.entities.map(e => e.entityId));
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  const items = scan.aggregates.map(a => {
    const plan = planTableColumns(byId.get(a.rootEntity)?.fields || [], entityIds);
    return {
      entityId: a.rootEntity,
      embeddedMembers: a.embeddedMembers, // -> inside details JSONB
      mdmRefs: a.mdmRefs,
      columns: plan.indexed.map(c => c.fieldId), // real columns (snake_case at the table)
      detailsFields: plan.details,               // -> inside details JSONB
    };
  });
  // Append-only event adapters: implement the event port (append + read finders) over the event table.
  const eventItems = scan.events.filter(ev => ev.persisted).map(ev => {
    const plan = planTableColumns(ev.fields || [], entityIds);
    return { entityId: ev.entityId, embeddedMembers: [] as string[], mdmRefs: [] as string[], columns: plan.indexed.map(c => c.fieldId), detailsFields: plan.details, appendOnlyEvent: true };
  });
  const human = `## Aggregates (column vs details split + embedded + mdm refs)\n${JSON.stringify(items, null, 2)}\n\n## Append-only event adapters\n${JSON.stringify(eventItems, null, 2)}\n\nReturn one adapter per aggregate AND per event implementing I{Entity}Repository: map domain <-> row - only "columns" are real columns (snake_case at the table). "detailsFields" + "embeddedMembers" go inside the details JSONB under the fieldId verbatim (camelCase — never snake_case a JSONB key; seeds write fieldId). list() honours optional filter.search via findMany ilike on the title/name column, and filter.sortBy/sortOrder via orderBy (enum fields: sort in memory by the declared enum order, never SQL text). resolve mdmRefs via ctx.mdm. For permanent MDM, list by canonical module type with ctx.mdm.collection.listByType, bulk load with ctx.mdm.collection.getMany/hydrateMany, and read relationships with ctx.mdm.collection.relatedOfMany. For prospect/pre-qualified lead flows use ctx.mdm.prospect.create/get/listByType/update/promoteToEntity. Module-specific fields live in entity.details.<module>. Never call ctx.mdm.entity.get inside a loop. Never use ctx.data.mdmDocument, ctx.data.mdmEntityIndex, ctx.data.mdmRelationship, tx.mdmDocument, tx.mdmEntityIndex or tx.mdmRelationship. Event adapters implement append (insert one row, no update/delete) + the read finders. ctx.data.moduleData is allowed only for local module tables.`;
  const systemPrompt = await readCbPrompt('steps/gen-adapter');
  return [createPromptReadyIntent(context, parentStep, hookSequential, (step.prompt || ""), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('gen-adapter', step.interaction); // T7: per-phase cost telemetry (best-effort)
  let status: mls.msg.AIStepStatus = 'completed';
  let trace: string | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const module = scan.moduleNames[0] || 'unknown';
    let saved = 0;
    for (const item of asArray((out.result as any).items)) {
      const entityId = readString(item.entityId);
      if (!entityId) continue;
      const fi = repositoryAdapterFileInfo(module, entityId);
      const dependsFiles = [
        dtsRef(repositoryPortFileInfo(module, entityId)),
        dtsRef(persistenceTableFileInfo(module, entityId)),
        dtsRef(domainEntityFileInfo(module, entityId)),
      ];
      const pipeline = [buildPipelineItem(`${lowerFirst(entityId)}RepositoryAdapter`, 'repositoryAdapter', fi, dependsFiles, layerSkills('repositoryAdapter.md'))];
      await saveDefs(fi, `${lowerFirst(entityId)}RepositoryAdapter`, buildArtifact('repositoryAdapter', `${entityId}RepositoryAdapter`, module, AGENT_NAME, item), pipeline);
      saved++;
    }
    if (out.status === 'failed') { status = 'failed'; trace = 'model returned failed'; }
  } catch (error) {
    status = 'failed';
    trace = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${trace}`);
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  const intents: mls.msg.AgentIntent[] = [];
  if (status === 'completed') intents.push(enqueueNext(context, parentStep, step, 'cb-gen-usecase', 'agentCbUsecase', 'Gerar usecases', {}));
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace, status === 'completed' ? 'input_output' : undefined));
  return intents;
}
