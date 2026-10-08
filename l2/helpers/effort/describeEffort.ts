/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
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
    regenerateDefs: [],
    materialize: [],
    runAgents: [],
    abend: { reason },
  };
}

function computed(item: string, materialize: EffortUnitRef[]): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'computed',
    regenerateDefs: [],
    materialize,
    runAgents: [],
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

/** Pure. `defs` maps each product def path to its `.defs.ts` source. */
export function describeEffortFrom(input: EffortInput, defs: Record<string, string>): EffortAnswer {
  const item = input.item.changeId;
  const paths = Object.keys(defs);
  if (paths.length === 0) return abend(item, NO_DEFS);
  if (input.item.kind !== 'rule' || input.item.op !== 'changed') {
    return abend(item, `kind/op fora da v1: ${input.item.kind} ${input.item.op}`);
  }
  const ruleId = ruleIdOf(input.item);
  const units: EffortUnitRef[] = [];
  for (const defPath of paths) {
    const parsed = parseDefinitionSource(defs[defPath] ?? '');
    if (!('definition' in parsed) || !isRecord(parsed.definition)) continue;
    const definition = parsed.definition;
    const artifactType = typeof definition.artifactType === 'string' ? definition.artifactType : '';
    const kind = kindOf(artifactType);
    const data = isRecord(definition.data) ? definition.data : null;
    if (!kind || !data) continue;
    const id = unitId(artifactType, data);
    if (!id || !applies(artifactType, data, ruleId)) continue;
    units.push({ kind, id, path: defPath });
  }
  if (units.length === 0) return abend(item, NONE_APPLY);
  units.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  return computed(item, units);
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
