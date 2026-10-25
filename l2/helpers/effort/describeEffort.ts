/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { isTextOnlyChange } from '/_102035_/l2/solution/poolPlan.js';
import type { EffortAnswer, EffortInput, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const MASTER = { project: '102021', kind: 'l1', device: 'web' } as const;

const NO_DEFS = 'módulo sem defs gerados';
const NONE_APPLY = 'nenhum def aplica o id';

type StorFile = {
  project?: number | string;
  level?: number | string;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

function abend(item: string, reason: string): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'abend',
    create: [],
    regenerateDefs: [],
    materialize: [],
    remove: [],
    runAgents: [],
    contract: 'keep',
    abend: { reason },
  };
}

function computed(
  item: string,
  materialize: EffortUnitRef[],
  regenerateDefs: EffortUnitRef[] = [],
  remove: EffortUnitRef[] = [],
): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'computed',
    create: [],
    regenerateDefs,
    materialize,
    remove,
    runAgents: [],
    contract: 'keep',
  };
}

function ruleIdOf(item: EffortInput['item']): string {
  const prefix = 'rule:';
  return item.changeId.startsWith(prefix) ? item.changeId.slice(prefix.length) : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function listsRule(value: unknown, ruleId: string): boolean {
  if (value === ruleId) return true;
  if (!Array.isArray(value)) return false;
  return value.some(entry => {
    if (entry === ruleId) return true;
    return isRecord(entry) && entry.ruleId === ruleId;
  });
}

function unitId(artifactType: string, data: Record<string, unknown>): string {
  if (artifactType === 'usecase') return typeof data.usecaseId === 'string' ? data.usecaseId : '';
  if (artifactType === 'requestService') return typeof data.pageId === 'string' ? data.pageId : '';
  if (artifactType === 'domainEntity') {
    const entityId = typeof data.entityId === 'string' ? data.entityId : '';
    return entityId ? entityId.charAt(0).toLowerCase() + entityId.slice(1) : '';
  }
  return '';
}

function applies(artifactType: string, data: Record<string, unknown>, ruleId: string): boolean {
  if (artifactType === 'usecase') return listsRule(data.rulesApplied, ruleId);
  if (artifactType === 'domainEntity') {
    if (listsRule(data.invariants, ruleId)) return true;
    const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : {};
    const transitions = Array.isArray(lifecycle.transitions) ? lifecycle.transitions : [];
    return transitions.some(transition => isRecord(transition) && listsRule(transition.ruleRefs, ruleId));
  }
  if (artifactType === 'requestService') {
    const requests = Array.isArray(data.requests) ? data.requests : [];
    return requests.some(request => isRecord(request) && listsRule(request.rules, ruleId));
  }
  return false;
}

function kindOf(artifactType: string): EffortUnitRef['kind'] | null {
  if (artifactType === 'usecase') return 'usecase';
  if (artifactType === 'domainEntity') return 'entity';
  if (artifactType === 'requestService') return 'request';
  return null;
}

function sortUnits(units: EffortUnitRef[]): EffortUnitRef[] {
  return units.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function idAfter(changeId: string, prefix: string): string {
  return changeId.startsWith(prefix) ? changeId.slice(prefix.length) : '';
}

/** `task:<processId>.<taskId>` — the process id is the segment before the first dot. */
function taskProcessId(changeId: string): string {
  const rest = idAfter(changeId, 'task:');
  const dot = rest.indexOf('.');
  return dot > 0 ? rest.slice(0, dot) : '';
}

function eachDefinition(
  defs: Record<string, string>,
  visit: (defPath: string, artifactType: string, data: Record<string, unknown>) => void,
): void {
  for (const defPath of Object.keys(defs)) {
    const parsed = parseDefinitionSource(defs[defPath] ?? '');
    if (!('definition' in parsed) || !isRecord(parsed.definition)) continue;
    const definition = parsed.definition;
    const artifactType = typeof definition.artifactType === 'string' ? definition.artifactType : '';
    const data = isRecord(definition.data) ? definition.data : null;
    if (!artifactType || !data) continue;
    visit(defPath, artifactType, data);
  }
}

function citingUnits(defs: Record<string, string>, ruleId: string): EffortUnitRef[] {
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    const kind = kindOf(artifactType);
    if (!kind) return;
    const id = unitId(artifactType, data);
    if (!id || !applies(artifactType, data, ruleId)) return;
    units.push({ kind, id, path: defPath });
  });
  return sortUnits(units);
}

function workflowUnits(defs: Record<string, string>, processId: string): EffortUnitRef[] {
  if (!processId) return [];
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType !== 'workflowProcess') return;
    if (data.processId !== processId) return;
    units.push({ kind: 'workflow', id: processId, path: defPath });
  });
  return sortUnits(units);
}

/** Pure. `defs` maps each product def path to its `.defs.ts` source. */
export function describeEffortFrom(input: EffortInput, defs: Record<string, string>): EffortAnswer {
  const item = input.item.changeId;
  if (isTextOnlyChange(input.item)) return computed(item, []);
  if (Object.keys(defs).length === 0) return abend(item, NO_DEFS);
  const { kind, op } = input.item;
  if (kind === 'rule' && op === 'changed') {
    const units = citingUnits(defs, ruleIdOf(input.item));
    if (units.length === 0) return abend(item, NONE_APPLY);
    return computed(item, units);
  }
  if (kind === 'rule' && op === 'removed') {
    const units = citingUnits(defs, ruleIdOf(input.item));
    return computed(item, units, units);
  }
  if (kind === 'process' && op === 'removed') {
    const units = workflowUnits(defs, idAfter(item, 'process:'));
    return computed(item, [], [], units);
  }
  if (kind === 'task' && op === 'removed') {
    const units = workflowUnits(defs, taskProcessId(item));
    return computed(item, units, units);
  }
  return abend(item, `kind/op fora da v1: ${kind} ${op}`);
}

function productPath(file: StorFile, moduleName: string): string | null {
  const appProject = typeof mls.actualProject === 'number' ? mls.actualProject : Number.NaN;
  if (Number(file.project) !== appProject || Number(file.level) !== 1) return null;
  if (file.status === 'deleted' || file.extension !== '.defs.ts' || !file.shortName) return null;
  const folder = String(file.folder || '');
  const prefix = `${moduleName}/`;
  if (folder !== moduleName && !folder.startsWith(prefix)) return null;
  const parts = folder.split('/');
  if (parts.includes('pipeline') || parts.includes('materialization')) return null;
  return `l1/${folder}/${file.shortName}.defs.ts`;
}

async function readStorText(file: StorFile, defPath: string): Promise<string> {
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch (error) {
      console.warn(`describeEffort: ${defPath}`, error);
    }
  }
  if (!file.getContent) return '';
  const content = await file.getContent();
  return typeof content === 'string' ? content : '';
}

/** Reads product `.defs.ts` under `l1/<module>/` from `mls.stor.files` and classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  const files = (mls.stor?.files ?? {}) as Record<string, StorFile | undefined>;
  const defs: Record<string, string> = {};
  for (const file of Object.values(files)) {
    if (!file) continue;
    const defPath = productPath(file, input.module);
    if (!defPath) continue;
    const source = await readStorText(file, defPath);
    if (source) defs[defPath] = source;
  }
  return describeEffortFrom(input, defs);
}
