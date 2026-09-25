/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/model.ts" enhancement="_blank"/>

/**
 * Model port. Simulate, structure and verify do not call it.
 * The adapter applies the call timeout and does not retry; the run decides repairs.
 */

import { MaterializeCallError, type CallErrorCode } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { MaterializeHandler } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { M1EntryStage } from '/_102021_/l2/agentMaterializeL1/run/command.js';

export interface ModelRequest {
  prompt: string;
  signal: AbortSignal;
  eventId: string;
}

export type ModelPort = (request: ModelRequest) => Promise<string>;

export function shouldCallModel(stage: M1EntryStage, handler: MaterializeHandler | null): boolean {
  return stage === 'implement' && !!handler && handler.needsLlm && handler.stage === 'implement';
}

export async function invokeModel(port: ModelPort, request: ModelRequest, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const onParent = () => controller.abort();
  if (request.signal.aborted) controller.abort();
  else request.signal.addEventListener('abort', onParent, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new MaterializeCallError('TIMEOUT', `Call exceeded ${timeoutMs}ms.`));
    }, timeoutMs);
  });
  try {
    const text = await Promise.race([
      port({ ...request, signal: controller.signal }),
      timeout,
    ]);
    if (typeof text !== 'string' || !text.trim()) {
      throw new MaterializeCallError('INVALID_RESPONSE', 'The model returned an empty response.');
    }
    return text;
  } catch (error) {
    if (error instanceof MaterializeCallError) throw error;
    const code = readCode(error);
    if (code) throw new MaterializeCallError(code, error instanceof Error ? error.message : String(error));
    throw new MaterializeCallError('TRANSIENT', error instanceof Error ? error.message : String(error));
  } finally {
    if (timer) clearTimeout(timer);
    request.signal.removeEventListener('abort', onParent);
  }
}

function readCode(error: unknown): CallErrorCode | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  if (code === 'TIMEOUT' || code === 'NETWORK_UNAVAILABLE' || code === 'TRANSIENT' || code === 'INVALID_RESPONSE') return code;
  return null;
}
