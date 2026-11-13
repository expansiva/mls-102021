/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/risk.ts" enhancement="_blank"/>

// Risk of one assistant-catalog command, read from defs text already loaded.
// No mls, no stor. A query is always `read` (`riskOfQuery`).

import { extractExportedObject } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import { asArray, asRecord, asString } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';

export type AssistantRisk = 'read' | 'write' | 'sensitive';

export type RiskReason = 'delete' | 'finalState' | 'effects' | 'outbound' | 'llm' | 'unclassified';

/** One write usecase of the command. `null` means the route names a usecase that has no def. */
export interface RiskCommandInput {
  usecases: ReadonlyArray<string | null>;
  ontologies: readonly string[];
  integration: string | null;
  /** `l4/<module>/workflows.defs.ts`. */
  workflows: string | null;
  /** `l1/<module>/layer_2_application/workflows/*.defs.ts`. */
  workflowOperations: readonly string[];
}

export interface CommandRisk {
  risk: 'write' | 'sensitive';
  reasons: RiskReason[];
}

const KNOWN_OPERATIONS = new Set(['create', 'update', 'transition', 'delete']);
const REASON_ORDER: readonly RiskReason[] = ['delete', 'finalState', 'effects', 'outbound', 'llm', 'unclassified'];

export function riskOfQuery(): 'read' {
  return 'read';
}

/** Lifecycle states, then transition targets, that never appear in a transition `from`. */
export function finalStates(ontologyText: string): string[] {
  const root = asRecord(extractExportedObject(ontologyText));
  const from = new Set<string>();
  for (const transition of asArray(root.transitions)) {
    for (const state of asArray(asRecord(transition).from)) {
      const name = asString(state);
      if (name) from.add(name);
    }
  }
  const seen = new Set<string>();
  const states: string[] = [];
  const add = (name: string): void => {
    if (!name || from.has(name) || seen.has(name)) return;
    seen.add(name);
    states.push(name);
  };
  for (const state of asArray(root.lifecycleStates)) add(asString(asRecord(state).state));
  for (const transition of asArray(root.transitions)) add(asString(asRecord(transition).to));
  return states;
}

export function riskOfCommand(input: RiskCommandInput): 'write' | 'sensitive' {
  return commandRisk(input).risk;
}

export function commandRisk(input: RiskCommandInput): CommandRisk {
  if (input.usecases.length !== 1 || input.usecases[0] === null) return sensitive('unclassified');
  const usecase = readUsecase(input.usecases[0]);
  if (!usecase) return sensitive('unclassified');
  if (!KNOWN_OPERATIONS.has(usecase.operation)) return sensitive('unclassified');

  const reasons = new Set<RiskReason>();
  const key = actionKey(usecase);
  if (usecase.operation === 'delete') reasons.add('delete');
  if (usecase.operation === 'transition') {
    const target = transitionTarget(input.ontologies, usecase.entityId, usecase.transitionRef);
    if (!target) reasons.add('unclassified');
    else if (target.final) reasons.add('finalState');
  }
  if (usecase.effects.length > 0) reasons.add('effects');
  if (key && outboundOns(input.integration).has(key)) reasons.add('outbound');
  if (key && reachesLlm(key, input.workflows, input.workflowOperations)) reasons.add('llm');

  const ordered = REASON_ORDER.filter(reason => reasons.has(reason));
  if (ordered.length === 0) return { risk: 'write', reasons: [] };
  return { risk: 'sensitive', reasons: ordered };
}

function sensitive(reason: RiskReason): CommandRisk {
  return { risk: 'sensitive', reasons: [reason] };
}

interface UsecaseFacts {
  entityId: string;
  operation: string;
  transitionRef: string;
  effects: unknown[];
}

function readUsecase(text: string): UsecaseFacts | null {
  const data = asRecord(asRecord(extractExportedObject(text)).data);
  const entityId = asString(data.entityId);
  const operation = asString(data.operation);
  if (!entityId || !operation) return null;
  return {
    entityId,
    operation,
    transitionRef: asString(data.transitionRef),
    effects: asArray(data.effects),
  };
}

/** `<Entity>.<transitionRef>` for a transition, otherwise `<Entity>.<operation>`. */
function actionKey(usecase: UsecaseFacts): string {
  if (usecase.operation === 'transition') {
    return usecase.transitionRef ? `${usecase.entityId}.${usecase.transitionRef}` : '';
  }
  return `${usecase.entityId}.${usecase.operation}`;
}

function transitionTarget(
  ontologies: readonly string[],
  entityId: string,
  transitionRef: string,
): { to: string; final: boolean } | null {
  if (!transitionRef) return null;
  for (const text of ontologies) {
    const root = asRecord(extractExportedObject(text));
    if (asString(root.entityId) !== entityId) continue;
    const finals = new Set(finalStates(text));
    for (const transition of asArray(root.transitions)) {
      const node = asRecord(transition);
      if (asString(node.transitionId) !== transitionRef) continue;
      const to = asString(node.to);
      if (!to) return null;
      return { to, final: finals.has(to) };
    }
    return null;
  }
  return null;
}

function outboundOns(integration: string | null): Set<string> {
  const ons = new Set<string>();
  if (!integration) return ons;
  const root = asRecord(extractExportedObject(integration));
  for (const item of asArray(root.outbound)) {
    const on = asString(asRecord(item).on);
    if (on) ons.add(on);
  }
  return ons;
}

interface TaskNode {
  kind: string;
  next: string[];
}

function reachesLlm(key: string, workflows: string | null, operationTexts: readonly string[]): boolean {
  const tasks = new Map<string, TaskNode>();
  const byJourney = new Map<string, string[]>();
  if (workflows) readTasks(workflows, tasks, byJourney);
  const steps = operationSteps(operationTexts).get(key) ?? [];
  const queue: string[] = [];
  for (const step of steps) {
    if (step.startsWith('task:')) {
      queue.push(step.slice('task:'.length));
      continue;
    }
    if (step.startsWith('journey:')) {
      const ref = step.slice('journey:'.length);
      const slash = ref.indexOf('/');
      const journey = slash < 0 ? ref : ref.slice(0, slash);
      for (const taskId of byJourney.get(journey) ?? []) queue.push(taskId);
    }
  }
  const seen = new Set<string>();
  while (queue.length > 0) {
    const taskId = queue.shift();
    if (!taskId || seen.has(taskId)) continue;
    seen.add(taskId);
    const task = tasks.get(taskId);
    if (!task) continue;
    if (task.kind === 'llm') return true;
    for (const next of task.next) queue.push(next);
  }
  return false;
}

function readTasks(text: string, tasks: Map<string, TaskNode>, byJourney: Map<string, string[]>): void {
  const root = asRecord(extractExportedObject(text));
  for (const process of asArray(root.processes)) {
    for (const task of asArray(asRecord(process).tasks)) {
      const node = asRecord(task);
      const taskId = asString(node.taskId);
      if (!taskId || tasks.has(taskId)) continue;
      tasks.set(taskId, {
        kind: asString(node.kind),
        next: asArray(node.next).map(asString).filter(item => item !== ''),
      });
      const journey = asString(node.journeyRef);
      if (!journey) continue;
      const list = byJourney.get(journey) ?? [];
      list.push(taskId);
      byJourney.set(journey, list);
    }
  }
}

function operationSteps(texts: readonly string[]): Map<string, string[]> {
  const steps = new Map<string, string[]>();
  for (const text of texts) {
    const data = asRecord(asRecord(extractExportedObject(text)).data);
    for (const operation of asArray(data.operations)) {
      const node = asRecord(operation);
      const name = asString(node.operation);
      if (!name) continue;
      const list = steps.get(name) ?? [];
      for (const step of asArray(node.steps)) {
        const value = asString(step);
        if (value && !list.includes(value)) list.push(value);
      }
      steps.set(name, list);
    }
  }
  return steps;
}
