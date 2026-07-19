/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/scan/agentCbValidateL4Readiness.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic preflight on the selected owners: entity/operation ids resolve to canonical l4 ids,
// L4 v2 operation contracts are present, and ontology kind/relationships exist.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, createUpdateStatusIntent, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbValidateL4Readiness', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/scan', agentDescription: 'Deterministic l4 create-readiness preflight', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const entityIds = new Set(scan.entities.map(e => e.entityId));
    const warnings: string[] = [];
    const errors: string[] = [];
    warnings.push(...scan.warnings);
    for (const owner of scan.owners) {
      const refs = [owner.entity, ...owner.reads, ...owner.writes].filter(Boolean);
      for (const ref of refs) {
        const id = ref.split('.')[0].split(':').pop() || ref;
        if (!entityIds.has(id)) warnings.push(`${owner.id}: unresolved entity ref "${ref}"`);
      }
      if (owner.kind === 'operation') {
        if (!owner.bffName) errors.push(`${owner.id}: missing bffName`);
        if (!owner.accessPattern?.kind) errors.push(`${owner.id}: missing accessPattern.kind`);
        for (const input of owner.inputs) {
          // N1b (l4 v2): a required input declares an explicit `type` OR a `fieldRef` — free inputs
          // (paymentMethod, paymentAmount, page…) are type-only and legitimately have no fieldRef.
          if (input.required && (!input.inputId || (!input.fieldRef && !input.type) || !input.source)) {
            errors.push(`${owner.id}: invalid required input ${input.inputId || input.fieldRef || '(unknown)'}`);
          }
          if (input.fieldRef && !input.fieldRef.includes('.') && input.fieldRef !== owner.entity) {
            warnings.push(`${owner.id}: input ${input.inputId || input.fieldRef} fieldRef "${input.fieldRef}" is not Entity.field`);
          }
        }
        const keyField = owner.accessPattern?.keyField;
        if (keyField && !keyField.includes('.')) errors.push(`${owner.id}: accessPattern.keyField must be Entity.field, got "${keyField}"`);
      }
    }
    if (errors.length) {
      const trace = `Preflight failed: ${errors.slice(0, 20).join('; ')}`;
      console.error(`${logPrefix(agent)} ${trace}`);
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', trace)];
    }
    if (warnings.length) console.warn(`${logPrefix(agent)} ${warnings.length} warning(s): ${warnings.slice(0, 8).join('; ')}`);
    // Record the warning details on the step log too (not just the count), so they are visible in the trace.
    const preflightTrace = warnings.length
      ? `Preflight: ${warnings.length} warning(s): ${warnings.slice(0, 12).join('; ')}`
      : 'Preflight ok (0 warnings).';
    return [
      enqueueNext(context, parentStep, step, 'cb-lock', 'agentCbLockOwners', 'Lock owners (inProgress)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', preflightTrace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
