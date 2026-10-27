/// <mls fileReference="_102021_/l2/helpers/planPostprocess/correctPlan.ts" enhancement="_blank"/>

import type { UsedRemovedUsecase } from '/_102021_/l2/helpers/planPostprocess/usedRemoved.js';

export interface PlanCorrection {
  usecase: string;
  from: 'toRemove';
  to: 'done';
  reason: 'exists in l1';
  routes: string[];
}

export interface CorrectedPlan {
  backend: Record<string, unknown>;
  effort: Record<string, unknown>;
  corrections: PlanCorrection[];
}

/** Put a `toRemove` usecase that a route still calls back into `usecases` as `done`. Other kinds stay. */
export function correctPlan(input: {
  moduleName: string;
  backend: Record<string, unknown>;
  effort: Record<string, unknown>;
  used: readonly UsedRemovedUsecase[];
}): CorrectedPlan {
  const backend = clone(input.backend);
  const effort = clone(input.effort);
  const corrections: PlanCorrection[] = [];
  for (const item of [...input.used].sort((left, right) => left.id.localeCompare(right.id))) {
    if (!isRemovedUsecase(backend, item.id) && !isRemovedUsecase(effort, item.id)) continue;
    const backendChange = restore(backend, input.moduleName, item, true);
    const effortChange = restore(effort, input.moduleName, item, false);
    recount(backend, backendChange);
    recount(effort, effortChange);
    corrections.push({
      usecase: item.id,
      from: 'toRemove',
      to: 'done',
      reason: 'exists in l1',
      routes: [...item.routes],
    });
  }
  return { backend, effort, corrections };
}

function restore(
  doc: Record<string, unknown>,
  moduleName: string,
  item: UsedRemovedUsecase,
  full: boolean,
): { added: number; touched: boolean } {
  const removed = rows(doc.removed);
  const kept = removed.filter(row => !(row.kind === 'usecase' && row.id === item.id && row.status === 'toRemove'));
  const touched = kept.length !== removed.length;
  doc.removed = kept;
  const usecases = rows(doc.usecases);
  doc.usecases = usecases;
  if (usecases.some(row => row.usecaseId === item.id)) return { added: 0, touched };
  usecases.push(doneRow(usecases, moduleName, item, full));
  return { added: 1, touched: true };
}

function doneRow(
  usecases: readonly Record<string, unknown>[],
  moduleName: string,
  item: UsedRemovedUsecase,
  full: boolean,
): Record<string, unknown> {
  const existing = `l1/${moduleName}/layer_2_application/usecases/${item.id}.defs.ts`;
  if (!full) {
    return { usecaseId: item.id, entity: item.entity, operation: item.operation, status: 'done', existing };
  }
  return {
    usecaseId: item.id,
    entity: item.entity,
    operation: item.operation,
    ports: arrayValue(usecases, item, 'ports'),
    status: 'done',
    existing,
    reason: `exists in l1; used by ${item.routes.length} contract routes`,
    tableRefs: arrayValue(usecases, item, 'tableRefs'),
    noTable: stringValue(usecases, item, 'noTable'),
  };
}

/** First other row of the same entity whose field is non-empty. */
function arrayValue(usecases: readonly Record<string, unknown>[], item: UsedRemovedUsecase, key: string): unknown[] {
  for (const row of usecases) {
    if (row.entity !== item.entity || row.usecaseId === item.id) continue;
    if (Array.isArray(row[key]) && row[key].length > 0) return row[key];
  }
  return [];
}

function stringValue(usecases: readonly Record<string, unknown>[], item: UsedRemovedUsecase, key: string): string {
  for (const row of usecases) {
    if (row.entity !== item.entity || row.usecaseId === item.id) continue;
    if (typeof row[key] === 'string' && row[key]) return row[key];
  }
  return '';
}

function recount(doc: Record<string, unknown>, change: { added: number; touched: boolean }): void {
  if (!change.touched || !isRecord(doc.totals)) return;
  const totals = doc.totals;
  const bucket = totals.usecases;
  if (isRecord(bucket)) {
    if (typeof bucket.done === 'number') bucket.done += change.added;
    return;
  }
  if (typeof totals.done === 'number') totals.done += change.added;
}

function isRemovedUsecase(doc: Record<string, unknown>, id: string): boolean {
  return rows(doc.removed).some(row => row.kind === 'usecase' && row.id === id && row.status === 'toRemove');
}

function rows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => isRecord(row));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
