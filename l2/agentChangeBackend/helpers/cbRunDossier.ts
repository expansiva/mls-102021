/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbRunDossier.ts" enhancement="_blank"/>

/**
 * Flatten the live task tree into the records the run dossier stores.
 *
 * Child-step traces do not survive in the persisted `iaCompressed` (the msgtask dump of a finished
 * run only keeps the root). Reading them HERE, at finalize, from the in-memory tree, is the only
 * chance to keep title/status/last-trace of every step as a file.
 */
export interface RunStepRecord {
  stepId: number;
  type: string;
  title: string;
  status: string;
  agentName?: string;
  lastTrace?: string;
}

export function collectRunStepRecords(roots: unknown): RunStepRecord[] {
  const out: RunStepRecord[] = [];
  const queue: unknown[] = Array.isArray(roots) ? [...roots] : [];
  while (queue.length) {
    const raw = queue.shift();
    if (!raw || typeof raw !== 'object') continue;
    const step = raw as {
      stepId?: unknown;
      type?: unknown;
      stepTitle?: unknown;
      status?: unknown;
      agentName?: unknown;
      nextSteps?: unknown;
      interaction?: { trace?: unknown; payload?: unknown };
    };
    const traces = Array.isArray(step.interaction?.trace)
      ? (step.interaction.trace as unknown[]).map(item => String(item))
      : [];
    const record: RunStepRecord = {
      stepId: typeof step.stepId === 'number' ? step.stepId : 0,
      type: String(step.type || ''),
      title: String(step.stepTitle || ''),
      status: String(step.status || ''),
    };
    if (typeof step.agentName === 'string' && step.agentName) record.agentName = step.agentName;
    if (traces.length) record.lastTrace = traces[traces.length - 1];
    out.push(record);
    if (Array.isArray(step.nextSteps)) queue.push(...step.nextSteps);
    if (Array.isArray(step.interaction?.payload)) queue.push(...step.interaction.payload);
  }
  return out;
}
