/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/stepCalls.ts" enhancement="_blank"/>

// d1_201: which step of a process runs which call. The L4 says it in `integration.defs.ts` (`usedBy: ['<processId>.<taskId>']`
// on a `direction: 'call'` line); the outbound def keeps only the process as consumer, so the step is read from the L4 here.
// The prompt tells the model where to call each one and the gate checks the code does.

export interface StepCall {
  stepId: string;
  connectionId: string;
  operationId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The calls whose `usedBy` cites a task of `processId`, in the order of the L4. Empty when the file is not readable. */
export function stepCallsOf(integrationSource: string | null, processId: string): StepCall[] {
  const match = integrationSource ? /=\s*(\{[\s\S]*\})\s*(?:as const)?\s*(?:satisfies[^;]*)?;/u.exec(integrationSource) : null;
  if (!match) return [];
  let root: unknown;
  try { root = JSON.parse(match[1]); } catch { return []; }
  const rows = isRecord(root) && Array.isArray(root.connections) ? root.connections.filter(isRecord) : [];
  const out: StepCall[] = [];
  for (const row of rows) {
    if (row.direction !== 'call' || typeof row.connectionId !== 'string' || typeof row.operationId !== 'string' || !Array.isArray(row.usedBy)) continue;
    for (const cited of row.usedBy) {
      const [process, step] = typeof cited === 'string' ? cited.split('.') : [];
      if (process === processId && step) out.push({ stepId: step, connectionId: row.connectionId, operationId: row.operationId });
    }
  }
  return out;
}

/** `WORKFLOW_STEP_WITHOUT_CALL` for each call of a step that the code never calls as a method (`.operation(`). A comment or an import does not count. */
export function stepCallProblems(code: string, calls: readonly StepCall[]): string[] {
  const clean = code.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:\\])\/\/[^\n]*/gu, '$1 ');
  return calls
    .filter(call => !new RegExp(`\\.${call.operationId}\\s*\\(`, 'u').test(clean))
    .map(call => `WORKFLOW_STEP_WITHOUT_CALL: step ${call.stepId} runs the call ${call.connectionId}.${call.operationId} (the L4 \`usedBy\`): the file must call \`gateway.${call.operationId}(input, ctx)\` for it. Importing the gateway type does not count.`);
}
