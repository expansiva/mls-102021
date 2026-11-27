/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokePort.ts" enhancement="_blank"/>

// d1_336: the engine of a module (`adapters/workflow/engine.ts`) is generated with the production port of the messages platform (HTTP client and Postgres projection),
// fixed in the file. In the COPY of the tree that the smoke runs on, that last statement is replaced by an occurrence port in memory, so a process runs from its first step to
// its end. Neither the module nor the generator changes: only the copy.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PORT_FILE = 'smokeMemoryPort.ts';

/** A `TaskOccurrencePort` in memory: open, find and advance as the platform answers them (`created`/`existing`, `unchanged`/`conflict`/`advanced`), and a log of what the engine asked. */
export const MEMORY_PORT_SOURCE = `import type { OccurrenceKey, TaskOccurrencePort, TaskOccurrenceSnapshot } from '/_102034_/l1/workflow/contracts.js';

const records = new Map<string, TaskOccurrenceSnapshot>();
const key = (k: OccurrenceKey): string => JSON.stringify([k.project, k.module, k.processId, k.entity, k.recordId]);
let counter = 0;
const log: string[] = [];

export const smokeTaskPort: TaskOccurrencePort = {
  kind: 'task',
  async find(_ctx, k) { log.push('find ' + k.processId); const found = records.get(key(k)); return found ? structuredClone(found) : null; },
  async open(ctx, cmd) {
    log.push('open ' + cmd.ref.processId + ' ' + cmd.firstStep);
    const id = key(cmd.ref);
    const existing = records.get(id);
    if (existing) return { outcome: 'existing', occurrence: structuredClone(existing) };
    counter += 1;
    const snapshot = {
      ref: { ...cmd.ref }, step: cmd.firstStep, actorNow: cmd.actorNow, done: false,
      history: [{ at: ctx.clock.nowIso(), by: cmd.actorNow ?? '', from: null, step: cmd.firstStep, actorNow: cmd.actorNow, done: false, commandId: 'open', executor: cmd.executor }],
      plan: cmd.plan, title: cmd.title, taskId: 'task-' + counter, revision: 1, status: 'in progress', owner: cmd.owner, origin: cmd.origin, room: cmd.room, roomId: 'room-' + counter, pass: 1,
    } as unknown as TaskOccurrenceSnapshot;
    records.set(id, snapshot);
    return { outcome: 'created', occurrence: structuredClone(snapshot) };
  },
  async advance(ctx, k, cmd) {
    log.push('advance ' + k.processId + ' ' + cmd.from + ' -> ' + cmd.to + (cmd.done ? ' (done)' : ''));
    const current = records.get(key(k));
    if (!current) throw new Error('smoke port: the occurrence was never opened');
    if (current.step === cmd.to && current.actorNow === cmd.actorNow && current.done === cmd.done) return { outcome: 'unchanged', occurrence: structuredClone(current) };
    if (current.step !== cmd.from) return { outcome: 'conflict', occurrence: structuredClone(current) };
    current.history.push({ at: ctx.clock.nowIso(), by: cmd.actorNow ?? '', from: cmd.from, step: cmd.to, actorNow: cmd.actorNow, done: cmd.done, commandId: cmd.commandId, executor: cmd.executor } as never);
    current.step = cmd.to; current.actorNow = cmd.actorNow; current.done = cmd.done; current.revision += 1;
    (current as { status: string }).status = cmd.done ? 'completed' : 'in progress';
    return { outcome: 'advanced', occurrence: structuredClone(current) };
  },
};

export function smokePortReset(): void { records.clear(); log.length = 0; }
export function smokePortLog(): string[] { return [...log]; }
(globalThis as { __smokePort?: unknown }).__smokePort = { reset: smokePortReset, log: smokePortLog };
`;

/**
 * Replaces the production port of the engine of the copy by the one in memory. True when it did; false when the module has no engine or the engine is not written that way
 * (nothing is changed then). The tree is the copy of the smoke, never the repository.
 */
export function installMemoryPort(tree: string, project: number, module: string): boolean {
  const folder = path.join(tree, 'l1', module, 'layer_1_external', 'adapters', 'workflow');
  const engineFile = path.join(folder, 'engine.ts');
  if (!existsSync(engineFile)) return false;
  const source = readFileSync(engineFile, 'utf8');
  const start = source.indexOf('export const workflowEngine = createModuleWorkflowEngine(');
  if (start < 0) return false;
  const importLine = `import { smokeTaskPort } from '/_${project}_/l1/${module}/layer_1_external/adapters/workflow/${PORT_FILE.replace(/\.ts$/u, '.js')}';\n`;
  writeFileSync(path.join(folder, PORT_FILE), MEMORY_PORT_SOURCE);
  writeFileSync(engineFile, `${source.slice(0, start)}${importLine}export const workflowEngine = createModuleWorkflowEngine(smokeTaskPort);\n`);
  return true;
}
