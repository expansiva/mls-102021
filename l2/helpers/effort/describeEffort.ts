/// <mls fileReference="_102021_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { isTextOnlyChange } from '/_102035_/l2/solution/poolPlan.js';
import type { EffortAnswer, EffortInput, EffortPromptRequest, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

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
  create: EffortUnitRef[] = [],
): EffortAnswer {
  return {
    master: { ...MASTER },
    item,
    status: 'computed',
    create,
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

type ChooseKind = 'usecase' | 'request' | 'entity';

interface CatalogUnit {
  kind: ChooseKind | 'workflow';
  id: string;
  path: string;
  lines: string[];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function routeId(route: string): string {
  const dot = route.lastIndexOf('.');
  return dot >= 0 ? route.slice(dot + 1) : route;
}

function catalogOf(defs: Record<string, string>): CatalogUnit[] {
  const units: CatalogUnit[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType === 'usecase') {
      const id = unitId(artifactType, data);
      if (!id) return;
      units.push({
        kind: 'usecase',
        id,
        path: defPath,
        lines: [
          `usecase ${id} entity=${typeof data.entityId === 'string' ? data.entityId : ''} operation=${typeof data.operation === 'string' ? data.operation : ''} rules=${JSON.stringify(stringList(data.rulesApplied))}`,
        ],
      });
      return;
    }
    if (artifactType === 'domainEntity') {
      const id = unitId(artifactType, data);
      if (!id) return;
      units.push({
        kind: 'entity',
        id,
        path: defPath,
        lines: [`entity ${id} invariants=${JSON.stringify(data.invariants ?? [])}`],
      });
      return;
    }
    if (artifactType === 'requestService') {
      const id = unitId(artifactType, data);
      if (!id) return;
      const requests = Array.isArray(data.requests) ? data.requests : [];
      const routes = requests.filter(isRecord).map(request => {
        const route = typeof request.route === 'string' ? request.route : '';
        return `route ${route} rules=${JSON.stringify(request.rules ?? [])}`;
      });
      units.push({ kind: 'request', id, path: defPath, lines: [`request ${id}`, ...routes] });
      return;
    }
    if (artifactType === 'workflowProcess' && typeof data.processId === 'string' && data.processId) {
      units.push({ kind: 'workflow', id: data.processId, path: defPath, lines: [`workflow ${data.processId}`] });
    }
  });
  return units.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function rulePhrase(item: EffortInput['item']): { id: string; description: string } {
  const after = isRecord(item.after) ? item.after : {};
  const description = typeof after.description === 'string' ? after.description : '';
  return { id: ruleIdOf(item), description };
}

function effortSchema(units: CatalogUnit[]): object {
  const choosable = units.filter(unit => unit.kind !== 'workflow');
  const pages = choosable.filter(unit => unit.kind === 'request').map(unit => unit.id);
  const usecases = choosable.filter(unit => unit.kind === 'usecase').map(unit => unit.id);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['existing', 'create', 'reason'],
    properties: {
      existing: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['unit', 'kind'],
          properties: {
            unit: { type: 'string', enum: choosable.map(unit => unit.id) },
            kind: { type: 'string', enum: ['usecase', 'request', 'entity'] },
          },
        },
      },
      create: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'name', 'page'],
          properties: {
            kind: { type: 'string', enum: ['usecase', 'route'] },
            name: { type: 'string' },
            page: { type: 'string', enum: pages },
            uses: { type: 'string', enum: usecases },
          },
        },
      },
      reason: { type: 'string' },
    },
  };
}

const LADDER = [
  'Pick the smallest step that delivers the new rule on the backend.',
  'Step 3: put the rule id on an existing usecase, request or entity (existing). The code rematerializes it.',
  'Step 5: create a usecase or a route on an existing request page (create). A new route names the usecase it calls; a new usecase goes in create too.',
  'Do nothing with existing: [] and create: [].',
].join('\n');

/** Pure. A prompt only for `rule added`; every other item is null and `describeEffort` answers it. */
export function effortPromptFrom(input: EffortInput, defs: Record<string, string>): EffortPromptRequest | null {
  if (input.item.kind !== 'rule' || input.item.op !== 'added') return null;
  const units = catalogOf(defs);
  const rule = rulePhrase(input.item);
  const body = units.flatMap(unit => unit.lines);
  const prompt = [
    `Rule ${rule.id}: ${rule.description}`,
    'Units:',
    ...body,
    LADDER,
  ].join('\n');
  return { prompt, schema: effortSchema(units) };
}

interface ExistingChoice {
  unit: string;
  kind: ChooseKind;
}

interface CreateChoice {
  kind: 'usecase' | 'route';
  name: string;
  page: string;
  uses?: string;
}

function schemaFailure(value: unknown, units: CatalogUnit[]): string | null {
  if (!isRecord(value)) return 'resposta fora do schema: não é objeto';
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'create,existing,reason') return 'resposta fora do schema: campos';
  if (typeof value.reason !== 'string') return 'resposta fora do schema: reason';
  if (!Array.isArray(value.existing) || !Array.isArray(value.create)) return 'resposta fora do schema: listas';
  const choosable = new Set(units.filter(unit => unit.kind !== 'workflow').map(unit => `${unit.kind}:${unit.id}`));
  const pages = new Set(units.filter(unit => unit.kind === 'request').map(unit => unit.id));
  for (const entry of value.existing) {
    if (!isRecord(entry) || Object.keys(entry).sort().join(',') !== 'kind,unit') return 'resposta fora do schema: existing';
    if (typeof entry.unit !== 'string' || (entry.kind !== 'usecase' && entry.kind !== 'request' && entry.kind !== 'entity')) {
      return 'resposta fora do schema: existing';
    }
    if (!choosable.has(`${entry.kind}:${entry.unit}`)) return `unidade inexistente: ${entry.unit}`;
  }
  for (const entry of value.create) {
    if (!isRecord(entry)) return 'resposta fora do schema: create';
    const keys = Object.keys(entry).sort().join(',');
    const routeKeys = keys === 'kind,name,page' || keys === 'kind,name,page,uses';
    if (entry.kind === 'route' ? !routeKeys : keys !== 'kind,name,page') return 'resposta fora do schema: create';
    if (entry.kind !== 'usecase' && entry.kind !== 'route') return 'resposta fora do schema: create';
    if (typeof entry.name !== 'string' || entry.name.length === 0) return 'resposta fora do schema: create';
    if (typeof entry.page !== 'string' || !pages.has(entry.page)) return 'resposta fora do schema: create';
    if ('uses' in entry && typeof entry.uses !== 'string') return 'resposta fora do schema: create';
  }
  return null;
}

function takenIds(defs: Record<string, string>): { usecases: Set<string>; routes: Set<string> } {
  const usecases = new Set<string>();
  const routes = new Set<string>();
  eachDefinition(defs, (_defPath, artifactType, data) => {
    if (artifactType === 'usecase') {
      const id = unitId(artifactType, data);
      if (id) usecases.add(id);
    }
    if (artifactType !== 'requestService') return;
    const requests = Array.isArray(data.requests) ? data.requests : [];
    for (const request of requests) {
      if (!isRecord(request) || typeof request.route !== 'string') continue;
      routes.add(request.route);
      routes.add(routeId(request.route));
    }
  });
  return { usecases, routes };
}

const ROUTE_NEEDS_USECASE = 'route needs its usecase';

/** Requests whose some route `uses` cites `usecaseId`. */
function requestsUsing(defs: Record<string, string>, usecaseId: string): EffortUnitRef[] {
  const units: EffortUnitRef[] = [];
  eachDefinition(defs, (defPath, artifactType, data) => {
    if (artifactType !== 'requestService') return;
    const id = unitId(artifactType, data);
    if (!id) return;
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const cites = requests.some(request =>
      isRecord(request) && Array.isArray(request.uses) && request.uses.includes(usecaseId));
    if (cites) units.push({ kind: 'request', id, path: defPath });
  });
  return units;
}

/** Pure. Checks the model output and builds the effort answer. A bad shape abends; it is never "nothing to do". */
export function finishEffortFrom(input: EffortInput, defs: Record<string, string>, modelOutput: unknown): EffortAnswer {
  const item = input.item.changeId;
  if (input.item.kind !== 'rule' || input.item.op !== 'added') {
    return abend(item, `kind/op fora da v1: ${input.item.kind} ${input.item.op}`);
  }
  const units = catalogOf(defs);
  const invalid = schemaFailure(modelOutput, units);
  if (invalid) return abend(item, invalid);
  const output = modelOutput as { existing: ExistingChoice[]; create: CreateChoice[] };
  const taken = takenIds(defs);
  const byKey = new Map(units.map(unit => [`${unit.kind}:${unit.id}`, unit]));
  const createdUsecaseNames = new Set(
    output.create.filter(choice => choice.kind === 'usecase').map(choice => choice.name),
  );
  const regenerate: EffortUnitRef[] = [];
  const seen = new Set<string>();
  const remember = (unit: EffortUnitRef): void => {
    const key = `${unit.kind}:${unit.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    regenerate.push(unit);
  };
  for (const choice of output.existing) {
    const unit = byKey.get(`${choice.kind}:${choice.unit}`);
    if (!unit) return abend(item, `unidade inexistente: ${choice.unit}`);
    remember({ kind: choice.kind, id: choice.unit, path: unit.path });
    if (choice.kind !== 'usecase') continue;
    for (const request of requestsUsing(defs, choice.unit)) remember(request);
  }
  const create: EffortUnitRef[] = [];
  for (const choice of output.create) {
    if (choice.kind === 'usecase') {
      if (taken.usecases.has(choice.name)) return abend(item, `nome já existe: ${choice.name}`);
      create.push({
        kind: 'usecase',
        id: choice.name,
        path: `l1/${input.module}/layer_2_application/usecases/${choice.name}.defs.ts`,
      });
      continue;
    }
    if (taken.routes.has(choice.name)) return abend(item, `nome já existe: ${choice.name}`);
    const uses = typeof choice.uses === 'string' ? choice.uses : '';
    if (!uses || (!taken.usecases.has(uses) && !createdUsecaseNames.has(uses))) {
      return abend(item, ROUTE_NEEDS_USECASE);
    }
    const page = byKey.get(`request:${choice.page}`);
    if (!page) return abend(item, `resposta fora do schema: ${choice.page}`);
    create.push({ kind: 'route', id: choice.name, path: page.path });
    remember({ kind: 'request', id: page.id, path: page.path });
  }
  const existingUnits = sortUnits(regenerate);
  return computed(item, existingUnits, existingUnits, [], sortUnits(create));
}

async function loadModuleDefs(moduleName: string): Promise<Record<string, string>> {
  const files = (mls.stor?.files ?? {}) as Record<string, StorFile | undefined>;
  const defs: Record<string, string> = {};
  for (const file of Object.values(files)) {
    if (!file) continue;
    const defPath = productPath(file, moduleName);
    if (!defPath) continue;
    const source = await readStorText(file, defPath);
    if (source) defs[defPath] = source;
  }
  return defs;
}

/** Reads product `.defs.ts` under `l1/<module>/` from `mls.stor.files` and classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  return describeEffortFrom(input, await loadModuleDefs(input.module));
}

/** Same read as `describeEffort`. Null unless the item is `rule added`. */
export async function effortPrompt(input: EffortInput): Promise<EffortPromptRequest | null> {
  return effortPromptFrom(input, await loadModuleDefs(input.module));
}

/** Same read as `describeEffort`, then `finishEffortFrom`. */
export async function finishEffort(input: EffortInput, modelOutput: unknown): Promise<EffortAnswer> {
  return finishEffortFrom(input, await loadModuleDefs(input.module), modelOutput);
}
