/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.ts" enhancement="_blank"/>

/**
 * `/fast` chain after a successful backend run. Pure: the final-summary step sends the thread
 * message; this file only decides whether to and what to send.
 */

export const CB_FAST_HANDOFF_PLAN_ID = 'fast-handoff-changeFrontend';

export function isCbFastMode(longMemory?: Record<string, unknown> | null): boolean {
  return longMemory?.fastMode === 'true';
}

export function isCbNochainMode(longMemory?: Record<string, unknown> | null): boolean {
  return longMemory?.nochainMode === 'true';
}

export function cbNochainSuppressedNote(moduleName: string): string {
  const module = String(moduleName || '').trim();
  return module ? `handoff: suppressed by /nochain — next: @@agentChangeFrontend /rebuild all ${module}` : '';
}

export function buildCbChangeFrontendHandoffMessage(moduleName: string): string {
  const module = String(moduleName || '').trim();
  return module ? `@@agentChangeFrontend /fast /rebuild all ${module}` : '';
}

export function hasCbFastHandoff(roots: unknown): boolean {
  const queue: unknown[] = Array.isArray(roots) ? [...roots] : [];
  while (queue.length) {
    const raw = queue.shift();
    if (!raw || typeof raw !== 'object') continue;
    const step = raw as { planning?: { planId?: unknown }; nextSteps?: unknown };
    if (step.planning?.planId === CB_FAST_HANDOFF_PLAN_ID) return true;
    if (Array.isArray(step.nextSteps)) queue.push(...step.nextSteps);
  }
  return false;
}

export function decideCbFastHandoff(input: {
  fast: boolean;
  nochain: boolean;
  success: boolean;
  alreadyDispatched: boolean;
  moduleName: string;
}): { dispatch: boolean; message: string; suppressed: boolean } {
  const message = buildCbChangeFrontendHandoffMessage(input.moduleName);
  if (!input.fast || !input.success || input.alreadyDispatched || !message) {
    return { dispatch: false, message: '', suppressed: false };
  }
  if (input.nochain) {
    const module = String(input.moduleName || '').trim();
    return { dispatch: false, message: `@@agentChangeFrontend /rebuild all ${module}`, suppressed: true };
  }
  return { dispatch: true, message, suppressed: false };
}

export const CB_FAST_HANDOFF_MARK_SHORT = 'fast-handoff';

export type CbFastHandoffDegradation = { at: string; kind: 'fast-handoff-dispatch'; reason: string };

export type CbFastHandoffSendResult = {
  dispatched: boolean;
  note: string;
  degradation: CbFastHandoffDegradation | null;
};

/**
 * Send + persist the `/fast` handoff. Never throws: a dispatch failure is a recorded
 * degradation so finalize can complete (the CB work is already on disk).
 */
export async function sendCbFastHandoff(input: {
  threadId: string | undefined;
  message: string;
  send: (threadId: string, message: string) => Promise<void>;
  persist: () => Promise<void>;
}): Promise<CbFastHandoffSendResult> {
  if (!input.threadId) {
    return { dispatched: false, note: '; changeFrontend: SKIPPED (no threadId)', degradation: null };
  }
  try {
    await input.send(input.threadId, input.message);
    await input.persist();
    return { dispatched: true, note: `; changeFrontend: dispatched (${input.message})`, degradation: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      dispatched: false,
      note: `; changeFrontend: DISPATCH FAILED (${reason}) — re-send manually: ${input.message}`,
      degradation: {
        at: new Date().toISOString(),
        kind: 'fast-handoff-dispatch',
        reason: `${reason} — re-send manually: ${input.message}`,
      },
    };
  }
}
