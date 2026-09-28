/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/approval.ts" enhancement="_blank"/>

/**
 * agentMaterializeL1 runs only in the chain the user accepted. agentDefsL1 deletes the implement
 * when it finishes, so this reads the provenance it recorded (`approval.json`) and checks it is
 * still the plan in force: defs complete, implement consumed, same planner thread, same accepted
 * bytes. No second acceptance, and a def status is never read as an approval.
 */

import { contentHash, type MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import {
  approvalConsumed,
  changedInputs,
  parseApprovalRecord,
} from '/_102021_/l2/agentDefsL1/helpers/d1Approval.js';
import { parsePipelineDocument } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';

export type M1ApprovalCheck = { ok: true; thread: string } | { ok: false; refusal: string };

const TAIL = ' Nothing was written.';

function refuse(message: string): M1ApprovalCheck {
  return { ok: false, refusal: `${message}${TAIL}` };
}

function parse(text: string | null): unknown {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function checkM1Approval(io: MaterializeReadIo, project: number, moduleName: string): Promise<M1ApprovalCheck> {
  const defsRoot = `l1/${moduleName}/pipeline/agentDefsL1`;
  const checkpointText = await io.read(`${defsRoot}/pipeline.json`);
  const checkpoint = checkpointText ? parsePipelineDocument(checkpointText) : null;
  if (!checkpoint || checkpoint.project !== project || checkpoint.moduleName !== moduleName
    || checkpoint.status !== 'complete' || checkpoint.steps.finalize80?.status !== 'approved') {
    return refuse(`agentDefsL1 has not completed ${moduleName} in project ${project}.`);
  }
  const record = parseApprovalRecord(parse(await io.read(`${defsRoot}/approval.json`)), project, moduleName);
  if (!record) return refuse(`No recorded approval for ${moduleName}. Materialization runs only after the effort is accepted.`);
  if (!approvalConsumed(record)) return refuse(`The implement ${record.message.file} was not consumed by agentDefsL1.`);

  const planner = parse(await io.read(`l4/${moduleName}/pool/l1/pipeline.json`));
  const thread = planner && typeof planner === 'object' ? (planner as { thread?: unknown }).thread : undefined;
  if (typeof thread !== 'string' || thread !== record.message.thread) {
    return refuse(`The recorded approval is for thread ${record.message.thread}; the current plan is ${typeof thread === 'string' && thread ? thread : '(none)'}. A new plan needs a new acceptance.`);
  }

  const hashes: Record<string, string | null> = {};
  for (const input of record.inputs) {
    const content = await io.read(input.path);
    hashes[input.path] = content === null ? null : await contentHash(content);
  }
  const changed = changedInputs(record, hashes);
  if (changed.length) return refuse(`Accepted input ${changed[0]} changed since the approval.`);
  return { ok: true, thread: record.message.thread };
}
