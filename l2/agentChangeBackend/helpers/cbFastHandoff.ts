/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.ts" enhancement="_blank"/>

/**
 * `/fast` chain after a successful backend run. Pure: the final-summary step sends the thread
 * message; this file only decides whether to and what to send.
 */

export const CB_FAST_HANDOFF_PLAN_ID = 'fast-handoff-changeFrontend';

export function isCbFastMode(longMemory?: Record<string, unknown> | null): boolean {
  return longMemory?.fastMode === 'true';
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
  success: boolean;
  alreadyDispatched: boolean;
  moduleName: string;
}): { dispatch: boolean; message: string } {
  const message = buildCbChangeFrontendHandoffMessage(input.moduleName);
  if (!input.fast || !input.success || input.alreadyDispatched || !message) {
    return { dispatch: false, message: '' };
  }
  return { dispatch: true, message };
}
