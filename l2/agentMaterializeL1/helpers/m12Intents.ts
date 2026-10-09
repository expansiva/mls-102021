/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Intents.ts" enhancement="_blank"/>

// Intent builders. Order inside a batch matters (skills/collab_messages.md): add the next open step BEFORE
// completing the current one, or the parent chain may auto-complete first.

export function addM12Step(context: mls.msg.ExecutionContext, parentStepId: number, step: mls.msg.AIPayload, bootstrap = false): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: bootstrap ? '' : context.message.orderAt,
    threadId: context.message.threadId,
    taskId: bootstrap ? '' : context.task?.PK || '',
    parentStepId,
    step,
  };
}

/**
 * `clean`: LLM workers only. `true` = 'input_output' (drops input, payload and trace; on success the artifact
 * is on disk). 'input' drops only the prompt, keeping the trace that says why a unit failed.
 */
export function updateM12Status(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
  clean: boolean | 'input' = false,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    ...(clean === 'input' ? { cleaner: 'input' as const } : clean ? { cleaner: 'input_output' as const } : {}),
    traceMsg,
  };
}

export function m12Result(title: string, result: string, planId: string): mls.msg.AIResultStep {
  return {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: title,
    result,
    planning: { planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
}

/**
 * One LLM worker, run in parallel with its siblings under the phase step that hosts it.
 * `wait_after_prompt`: a provider failure in one worker reaches afterPromptStep with no payload and is
 * handled as a failed attempt, instead of failing the whole task.
 */
export function m12WorkerStep(agentName: string, title: string, planId: string, args: unknown): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: title,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName,
    prompt: JSON.stringify(args),
    rags: [],
    onFailure: 'wait_after_prompt',
    planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as unknown as mls.msg.AIAgentStep;
}

export function m12PromptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  prompt: { system: string; human: string; toolName: string; toolDescription: string; parameters: Record<string, unknown> },
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    // Verbatim: the server matches the waiting slot by the exact args string.
    args: step.prompt || '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: prompt.system,
    humanPrompt: prompt.human,
    tools: [{ type: 'function', function: { name: prompt.toolName, description: prompt.toolDescription, parameters: prompt.parameters } }],
    toolChoice: { type: 'function', function: { name: prompt.toolName } },
  } as mls.msg.AgentIntentPromptReady;
}

/** The tool arguments of the LLM answer, whatever envelope the provider used. */
export function m12ToolPayload(step: mls.msg.AIAgentStep, toolName: string): unknown {
  const value = (step.interaction as { payload?: unknown[] } | null)?.payload?.[0];
  if (value === undefined || value === null) throw new Error('M12_LLM_NO_PAYLOAD');
  const root = typeof value === 'object' ? value as Record<string, unknown> : {};
  const result = root.result as Record<string, unknown> | undefined;
  if (root.type === 'flexible' && result?.toolName && result.toolName !== toolName) throw new Error(`M12_LLM_TOOL_MISMATCH: ${String(result.toolName)}`);
  const candidate = root.type === 'flexible' ? result?.arguments : root.arguments ?? root.payload ?? root;
  if (typeof candidate !== 'string') return candidate;
  try { return JSON.parse(candidate); } catch { throw new Error('M12_LLM_TOOL_JSON'); }
}
