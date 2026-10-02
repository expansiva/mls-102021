/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/derive.ts" enhancement="_blank"/>

import { isL1Operation, type L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';
import type { D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import type { UsecaseClosedValues } from '/_102021_/l2/agentDefsL1/steps/usecases50/worker.js';

/**
 * Data step each operation may take without the model (d1_55). Every recorded
 * reply of these groups had one sequence: `context`, then the one data step.
 * `port` is one repository call. `mdm` is one facade pair. A group the
 * recordings did not show with one sequence stays with the model.
 */
const DERIVABLE: Record<L1Operation, { port: boolean; mdm: boolean }> = {
  list: { port: true, mdm: false },
  get: { port: true, mdm: true },
  create: { port: true, mdm: false },
  update: { port: true, mdm: true },
  transition: { port: false, mdm: false },
  delete: { port: false, mdm: false },
  custom: { port: false, mdm: false },
};

/**
 * Steps of a usecase the catalog leaves no choice on, or null when the model
 * must plan it: a rule, an effect, a transition, more than one data call, or
 * an operation the recordings did not prove. The result still goes through the
 * same gate and fidelity as a model reply.
 */
export function deriveUsecaseSteps(operation: string, closed: UsecaseClosedValues): D1WorkerStep[] | null {
  if (!isL1Operation(operation)) return null;
  const allowed = DERIVABLE[operation];
  if (closed.ruleIds?.length || closed.eventIds?.length || closed.transitionIds?.length) return null;
  const sources = closed.sources || [];
  if (sources.length !== 1) return null;
  const context: D1WorkerStep = { kind: 'context', source: sources[0] };
  const portCalls = closed.portCalls || [];
  const portIds = closed.portIds || [];
  const pairs = closed.mdmPairs || [];
  if (allowed.port && portCalls.length === 1 && portIds.length === 1 && pairs.length === 0) {
    return [context, { kind: 'port', call: portCalls[0], port: portIds[0] }];
  }
  const namespaces = closed.namespaces || [];
  const entities = closed.entityIds || [];
  if (allowed.mdm && pairs.length === 1 && portCalls.length === 0 && namespaces.length === 1 && entities.length === 1) {
    return [context, { kind: 'mdm', namespace: namespaces[0], call: pairs[0].call, entity: entities[0], capability: pairs[0].capability }];
  }
  return null;
}
