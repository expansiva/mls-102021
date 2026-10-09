/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/busy.ts" enhancement="_blank"/>

// Copied from agentMaterializeL1/state/maintain.ts (lockHolder, busyDetail): the only part reconcileL5 uses.

export function lockHolder(text: string | null): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text) as { holder?: unknown };
    return typeof parsed.holder === 'string' ? parsed.holder : '';
  } catch {
    return '';
  }
}

/** Refusal text of a held writer or lock: which file, which holder, what to remove when no run is active. */
export function busyDetail(ref: string, text: string | null): string {
  const holder = lockHolder(text);
  return `${ref} is held by ${holder || '(unreadable holder)'}. If no run is active, remove ${ref} and run again.`;
}
