/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-table/agentCbPersistenceTable.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the TableDefinition per core/event table (layer_1_external/adapters/persistence), derived
// from the domain entity + the JSONB plan: indexed columns out, the rest + child collections in
// details JSONB. MDM/horizontal entities produce NO table.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { recordLlmCost } from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  readBackendScan, planTableColumns, createPromptReadyIntent, createUpdateStatusIntent, enqueueNext, readCbPrompt,
  extractPlannerOutput, plannerConfig, createPlannerToolSchema, batchSchema, asArray, saveAgentTrace,
  saveDefs, buildArtifact, buildPipelineItem, persistenceTableFileInfo, domainEntityFileInfo, dtsRef,
  layerSkills, readString, lowerFirst, logPrefix, planIdOf,
  newestL4DefsMs, defsCurrent, isRebuildCommand,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { recordFailedCbRun } from '/_102021_/l2/agentChangeBackend/helpers/cbPipelineRun.js';
import { persistenceTableResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { sanitizePlannerTableItem } from '/_102021_/l2/agentChangeBackend/helpers/cbTableIndexes.js';
import { sanitizePlannerTableColumnTypes } from '/_102021_/l2/agentChangeBackend/helpers/cbTableColumnTypes.js';
import { sanitizePlannerTableName } from '/_102021_/l2/agentChangeBackend/helpers/cbTableNames.js';

const AGENT_NAME = 'agentCbPersistenceTable';
const TOOL_NAME = 'submitPersistenceTables';
const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the table definitions.', batchSchema(persistenceTableResultSchema));

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-table', agentDescription: 'Generate TableDefinition (indexed columns + details JSONB)', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const scan = await readBackendScan(['toCreate', 'inProgress'], context);
  if (!isRebuildCommand(context)) {
    const module = scan.moduleNames[0] || 'unknown';
    const targetIds = [...scan.aggregates.map(a => a.rootEntity), ...scan.events.filter(ev => ev.persisted).map(ev => ev.entityId)];
    const watermark = newestL4DefsMs(scan.project);
    if (targetIds.length && targetIds.every(id => defsCurrent(persistenceTableFileInfo(module, id), watermark))) {
      return [
        enqueueNext(context, parentStep, step, 'cb-gen-adapter', 'agentCbRepositoryAdapter', 'Gerar adapters de persistência', {}),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `reused ${targetIds.length} persistence table .defs.ts (L4 unchanged; skipped generation)`, 'input_output'),
      ];
    }
  }
  const module = scan.moduleNames[0] || 'unknown';
  const entityIds = new Set(scan.entities.map(e => e.entityId));
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  const tables = scan.aggregates.map(agg => {
    const plan = planTableColumns(byId.get(agg.rootEntity)?.fields || [], entityIds);
    return { tableId: agg.rootEntity, indexed: plan.indexed, detailsFields: plan.details, childCollections: agg.embeddedMembers };
  });
  // Append-only event tables (telemetry/audit): same JSONB model, plus appendOnly + retentionDays so
  // the TableDefinition gets purpose 'controle' and a TTL (omit retentionDays = permanent, for audit).
  const eventTables = scan.events.filter(ev => ev.persisted).map(ev => {
    const plan = planTableColumns(ev.fields || [], entityIds);
    return { tableId: ev.entityId, indexed: plan.indexed, detailsFields: plan.details, childCollections: [] as string[], appendOnly: true, purpose: 'controle', retentionDays: ev.retentionDays };
  });
  const human = `## Module\n${module}\n\n## Tables to derive (indexed columns vs details JSONB)\n${JSON.stringify(tables, null, 2)}\n\n## Append-only event tables\n${JSON.stringify(eventTables, null, 2)}\n\nReturn one TableDefinition per table: snake_case tableName/columns; tableName starts with the lowercased module id (${module.toLowerCase()}_) so two modules never share a physical table (do not prefix twice). Only indexed columns are real, the rest live in a details JSONB column (detailsColumn.enabled=true, childCollections listed). Column type follows indexed[].type from the l4: string/text/enum → text (never integer, even when the field is named priority/rank/order); uuid → uuid; date/datetime → timestamptz; integer → integer; number → numeric. For event tables echo appendOnly=true, purpose="controle" and retentionDays (omit it for permanent audit); index the owner FK and the ordering timestamp.`;
  const systemPrompt = await readCbPrompt('steps/gen-table');
  return [createPromptReadyIntent(context, parentStep, hookSequential, (step.prompt || ""), systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  await recordLlmCost('gen-table', step.interaction); // T7: per-phase cost telemetry (best-effort)
  let status: mls.msg.AIStepStatus = 'completed';
  let trace: string | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const out = extractPlannerOutput(payload, plannerConfig(TOOL_NAME));
    const scan = await readBackendScan(['toCreate', 'inProgress'], context);
    const module = scan.moduleNames[0] || 'unknown';
    const byId = new Map(scan.entities.map(e => [e.entityId, e]));
    let saved = 0;
    for (const item of asArray((out.result as any).items)) {
      const tableId = readString(item.tableId);
      if (!tableId) continue;
      const sanitized = sanitizePlannerTableName(
        sanitizePlannerTableColumnTypes(
          sanitizePlannerTableItem(item as Record<string, unknown>),
          byId.get(tableId)?.fields,
        ),
        { moduleId: module, projectId: String(scan.project), tableId },
      );
      const fi = persistenceTableFileInfo(module, tableId);
      const dependsFiles = [dtsRef(domainEntityFileInfo(module, tableId))];
      const pipeline = [buildPipelineItem(lowerFirst(tableId), 'persistenceTable', fi, dependsFiles, layerSkills('persistenceTable.md'))];
      await saveDefs(fi, `${lowerFirst(tableId)}TableDefinition`, buildArtifact('table', tableId, module, AGENT_NAME, sanitized), pipeline);
      saved++;
    }
    if (out.status === 'failed') { status = 'failed'; trace = 'model returned failed'; }
  } catch (error) {
    status = 'failed';
    trace = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${trace}`);
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  if (status === 'failed') {
    await recordFailedCbRun({ longMemory: context.task?.iaCompressed?.longMemory, reason: trace || 'failed' });
  }
  const intents: mls.msg.AgentIntent[] = [];
  if (status === 'completed') intents.push(enqueueNext(context, parentStep, step, 'cb-gen-adapter', 'agentCbRepositoryAdapter', 'Gerar adapters de persistência', {}));
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace, status === 'completed' ? 'input_output' : undefined));
  return intents;
}
