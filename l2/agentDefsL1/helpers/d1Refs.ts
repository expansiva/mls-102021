/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Refs.ts" enhancement="_blank"/>

import {
  D1_AUXILIARY_TYPES,
  D1_ARTIFACT_TYPES,
  D1_CATALOG_SCHEMA,
  D1_CORE_TYPES,
  D1_FORECAST_CORE,
  type D1ArtifactType,
  type D1StorageTarget,
  isArtifactType,
  isRecord,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';

export const D1_OUTPUT_AVAILABILITY = ['future', 'present'] as const;
export type D1OutputAvailability = typeof D1_OUTPUT_AVAILABILITY[number];

const ITEM_KEYS = [
  'id', 'type', 'defPath', 'outputPath', 'outputAvailability', 'dependsFiles', 'dependsOn', 'skills', 'routes',
] as const;

const CATALOG_KEYS = [
  'schemaVersion', 'project', 'moduleName', 'items', 'presentPaths', 'justifications', 'absences',
] as const;

/** What each type may depend on. A usecase must not depend on the registry or the adapter. */
const DEPENDS_ALLOWED: Record<D1ArtifactType, readonly D1ArtifactType[]> = {
  domainEntity: [],
  valueObject: ['domainEntity'],
  repositoryPort: ['domainEntity'],
  table: ['domainEntity'],
  repositoryAdapter: ['repositoryPort', 'table'],
  usecase: ['domainEntity', 'repositoryPort', 'accessScope', 'valueObject'],
  httpController: ['usecase', 'accessScope'],
  accessScope: [],
  authorityMap: ['accessScope'],
  repositoryRegistration: ['repositoryAdapter'],
  persistenceSeeds: ['table'],
  integrationOutbound: ['usecase'],
};

export interface D1PipelineItem {
  id: string;
  type: D1ArtifactType;
  defPath: string;
  outputPath: string;
  outputAvailability: D1OutputAvailability;
  dependsFiles: string[];
  dependsOn: string[];
  skills: string[];
  routes?: string[];
}

export interface D1Justification {
  id: string;
  artifactType: D1ArtifactType;
  reason: string;
}

export interface D1Absence {
  artifactType: D1ArtifactType;
  reason: string;
}

export interface D1Catalog {
  schemaVersion: typeof D1_CATALOG_SCHEMA;
  project: number;
  moduleName: string;
  items: D1PipelineItem[];
  presentPaths: string[];
  justifications: D1Justification[];
  absences: D1Absence[];
}

export interface D1PlannedFile {
  id: string;
  artifactType: string;
  defPath: string;
  identity: string;
  ownerRefs: string[];
  dependsOn: string[];
}

export interface D1PlanRoute {
  route: string;
  page: string;
  kind: string;
  usecaseRef: string;
}

export interface D1MeasuredPlan {
  project: number;
  moduleName: string;
  selection: {
    pages: Array<{ pageId: string; routes: string[] }>;
    routes: D1PlanRoute[];
    usecases: Array<{ usecaseId: string; entity: string; operation: string; routes: string[] }>;
    ports: Array<{ portId: string; entity: string }>;
    tables: Array<{ tableId: string; entity: string }>;
    entities: string[];
    outbound: string[];
  };
  files: D1PlannedFile[];
}

export interface D1RefFinding {
  path: string;
  kind: 'presentDef' | 'plannedDef' | 'futureOutput' | 'missingInput' | 'uncontractedDeclaration';
  producerId?: string;
}

export interface D1Coverage {
  measured: Record<string, number>;
  measuredCore: number;
  forecastCore: typeof D1_FORECAST_CORE.count;
  forecastNote: typeof D1_FORECAST_CORE.note;
  forecastMatchesMeasured: boolean;
  auxiliaries: D1Justification[];
  absences: D1Absence[];
  futureOutputs: string[];
  missingInputs: string[];
  gaps: string[];
}

export function pipelineId(project: number, moduleName: string, type: string, owner: string): string {
  return `${project}/${moduleName}/${type}/${owner}`;
}

export function qualifyDefPath(project: number, logicalPath: string): string {
  return `_${project}_/${logicalPath}`;
}

export function futureOutputPath(defPath: string): string {
  return defPath.endsWith('.defs.ts') ? defPath.replace(/\.defs\.ts$/, '.ts') : '';
}

export function skillPaths(type: string): string[] {
  return [
    '_102021_/l2/agentDefsL1/skills/architecture.md',
    `_102021_/l2/agentDefsL1/skills/${type}.md`,
  ];
}

export function catalogFromPlan(
  plan: D1MeasuredPlan,
  input: {
    presentPaths?: string[];
    justifications: D1Justification[];
    absences: D1Absence[];
    skillsFor?: (type: string) => string[];
  },
): D1Catalog {
  const skillsFor = input.skillsFor ?? skillPaths;
  const items: D1PipelineItem[] = plan.files.map(file => {
    const defPath = qualifyDefPath(plan.project, file.defPath);
    const routes = file.ownerRefs
      .filter(owner => owner.startsWith('endpoint:'))
      .map(owner => owner.slice('endpoint:'.length));
    return {
      id: pipelineId(plan.project, plan.moduleName, file.artifactType, file.identity),
      type: file.artifactType as D1ArtifactType,
      defPath,
      outputPath: futureOutputPath(defPath),
      outputAvailability: 'future',
      dependsFiles: [],
      dependsOn: [],
      skills: skillsFor(file.artifactType),
      ...(file.artifactType === 'httpController' ? { routes } : {}),
    };
  });
  const byPlanId = new Map(plan.files.map((file, index) => [file.id, items[index]]));
  for (let index = 0; index < plan.files.length; index += 1) {
    const file = plan.files[index];
    const item = items[index];
    item.dependsOn = file.dependsOn.map(id => byPlanId.get(id)?.id || id);
    item.dependsFiles = item.dependsOn.flatMap(id => {
      const target = items.find(candidate => candidate.id === id);
      return target ? [target.defPath] : [id];
    });
  }
  return {
    schemaVersion: D1_CATALOG_SCHEMA,
    project: plan.project,
    moduleName: plan.moduleName,
    items,
    presentPaths: input.presentPaths ? [...input.presentPaths] : [],
    justifications: input.justifications,
    absences: input.absences,
  };
}

export function pipelineItemIssues(value: unknown, project?: number, moduleName?: string): string[] {
  if (!isRecord(value)) return ['Pipeline item must be an object.'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(ITEM_KEYS as readonly string[]).includes(key)) issues.push(`Unknown field pipeline.${key}.`);
  }
  const id = typeof value.id === 'string' ? value.id : '';
  const type = typeof value.type === 'string' ? value.type : '';
  if (!id) issues.push('Missing field pipeline.id.');
  if (!isArtifactType(type)) issues.push('pipeline.type is unknown.');
  const defPath = typeof value.defPath === 'string' ? value.defPath : '';
  const outputPath = typeof value.outputPath === 'string' ? value.outputPath : '';
  if (!defPath.endsWith('.defs.ts') || defPath.includes('.d.ts')) issues.push('pipeline.defPath must be a defs file.');
  if (!outputPath.endsWith('.ts') || outputPath.endsWith('.defs.ts') || outputPath.includes('.d.ts')) {
    issues.push('pipeline.outputPath must be a future ts file.');
  }
  if (defPath && outputPath && outputPath !== futureOutputPath(defPath)) {
    issues.push('pipeline.outputPath does not match defPath.');
  }
  const availability = typeof value.outputAvailability === 'string' ? value.outputAvailability : '';
  if (!(D1_OUTPUT_AVAILABILITY as readonly string[]).includes(availability)) {
    issues.push('pipeline.outputAvailability must be future or present.');
  }
  if (!Array.isArray(value.dependsFiles)) issues.push('Missing field pipeline.dependsFiles.');
  if (!Array.isArray(value.dependsOn)) issues.push('Missing field pipeline.dependsOn.');
  if (!Array.isArray(value.skills) || value.skills.length === 0) issues.push('Missing field pipeline.skills.');
  if (type === 'httpController') {
    if (!Array.isArray(value.routes) || value.routes.length === 0) issues.push('Missing field pipeline.routes.');
  } else if (value.routes !== undefined) {
    issues.push('pipeline.routes is only valid on an httpController.');
  }
  if (project && moduleName && type && id) {
    const owner = id.split('/').pop() || '';
    if (id !== pipelineId(project, moduleName, type, owner)) issues.push(`pipeline.id is not project/module/type/owner: ${id}.`);
  }
  return issues;
}

export function skillRefIssues(items: readonly { skills?: unknown }[], knownSkills: readonly string[]): string[] {
  const known = new Set(knownSkills);
  const issues: string[] = [];
  for (const item of items) {
    const skills = Array.isArray(item.skills) ? item.skills : [];
    for (const skill of skills) {
      if (typeof skill !== 'string' || !skill.endsWith('.md') || skill.includes('.d.ts') || skill.includes('agentCbMaterialize')) {
        issues.push(`Skill ref is not a skill of this agent: ${String(skill)}.`);
        continue;
      }
      if (!known.has(skill)) issues.push(`Skill ref has no file: ${skill}.`);
    }
  }
  return issues;
}

export function duplicateRouteIssues(items: readonly { id: string; routes?: string[] }[]): string[] {
  const owners = new Map<string, string[]>();
  for (const item of items) {
    for (const route of item.routes || []) {
      const list = owners.get(route) || [];
      list.push(item.id);
      owners.set(route, list);
    }
  }
  const issues: string[] = [];
  for (const [route, ids] of owners) {
    if (ids.length > 1) issues.push(`Duplicate route ${route}.`);
  }
  return issues;
}

export function catalogIssues(value: unknown, knownSkills: readonly string[] = []): string[] {
  if (!isRecord(value)) return ['Catalog must be an object.'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(CATALOG_KEYS as readonly string[]).includes(key)) issues.push(`Unknown field catalog.${key}.`);
  }
  if (value.schemaVersion !== D1_CATALOG_SCHEMA) issues.push('catalog.schemaVersion is unknown.');
  const project = typeof value.project === 'number' ? value.project : 0;
  const moduleName = typeof value.moduleName === 'string' ? value.moduleName : '';
  if (!Number.isInteger(project) || project < 1) issues.push('catalog.project must be a positive integer.');
  if (!moduleName) issues.push('Missing field catalog.moduleName.');
  if (!Array.isArray(value.items)) return [...issues, 'Missing field catalog.items.'];
  const items: D1PipelineItem[] = [];
  for (const raw of value.items) {
    issues.push(...pipelineItemIssues(raw, project, moduleName));
    if (isPipelineItem(raw)) items.push(raw);
  }
  issues.push(...graphIssues(items));
  issues.push(...skillRefIssues(items, knownSkills));
  return issues;
}

function isPipelineItem(value: unknown): value is D1PipelineItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.type === 'string';
}

export function graphIssues(items: readonly D1PipelineItem[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const defPaths = new Set<string>();
  const outputPaths = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) issues.push(`Duplicate id ${item.id}.`);
    ids.add(item.id);
    if (defPaths.has(item.defPath)) issues.push(`Duplicate defPath ${item.defPath}.`);
    defPaths.add(item.defPath);
    if (outputPaths.has(item.outputPath)) issues.push(`Duplicate output ${item.outputPath}.`);
    outputPaths.add(item.outputPath);
  }
  const byId = new Map(items.map(item => [item.id, item]));
  for (const item of items) {
    const allowed = isArtifactType(item.type) ? DEPENDS_ALLOWED[item.type] : [];
    for (const dep of item.dependsOn) {
      const target = byId.get(dep);
      if (!target) {
        issues.push(`Orphan dependency ${dep} on ${item.id}.`);
        continue;
      }
      if (!allowed.includes(target.type)) {
        issues.push(`${item.type} ${item.id} must not depend on ${target.type}.`);
      }
    }
  }
  issues.push(...cycleIssues(items));
  issues.push(...duplicateRouteIssues(items));
  return issues;
}

export function cycleIssues(items: readonly { id: string; dependsOn: string[] }[]): string[] {
  const byId = new Map(items.map(item => [item.id, item]));
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const seen = new Set<string>();
  const issues: string[] = [];
  const visit = (id: string) => {
    const state = color.get(id) ?? 0;
    if (state === 1) {
      const at = stack.indexOf(id);
      const cycle = [...stack.slice(at), id];
      const key = cycle.slice().sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        issues.push(`Cycle: ${cycle.join(' -> ')}.`);
      }
      return;
    }
    if (state === 2) return;
    color.set(id, 1);
    stack.push(id);
    const item = byId.get(id);
    if (item) {
      for (const next of item.dependsOn) {
        if (byId.has(next)) visit(next);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const item of items) visit(item.id);
  return issues;
}

export function resolveCatalogRefs(catalog: D1Catalog): D1RefFinding[] {
  const present = new Set(catalog.presentPaths);
  const findings: D1RefFinding[] = [];
  const seen = new Set<string>();
  const push = (finding: D1RefFinding) => {
    const key = `${finding.kind}:${finding.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(finding);
  };
  for (const item of catalog.items) {
    if (item.outputAvailability === 'future') {
      push({ path: item.outputPath, kind: 'futureOutput', producerId: item.id });
    } else if (!present.has(item.outputPath) && !present.has(logicalOf(item.outputPath))) {
      push({ path: item.outputPath, kind: 'missingInput' });
    }
    for (const path of item.dependsFiles) {
      push(classifyRef(path, catalog, present));
    }
  }
  return findings;
}

function classifyRef(path: string, catalog: D1Catalog, present: ReadonlySet<string>): D1RefFinding {
  if (path.endsWith('.d.ts') || path.includes('.d.ts')) {
    const producer = catalog.items.find(item => item.outputPath === path);
    if (!producer) return { path, kind: 'uncontractedDeclaration' };
    return { path, kind: 'futureOutput', producerId: producer.id };
  }
  const outputOwner = catalog.items.find(item => item.outputPath === path);
  if (outputOwner) return { path, kind: 'futureOutput', producerId: outputOwner.id };
  const defOwner = catalog.items.find(item => item.defPath === path);
  if (defOwner) {
    const logical = logicalOf(path);
    if (present.has(path) || present.has(logical)) return { path, kind: 'presentDef', producerId: defOwner.id };
    return { path, kind: 'plannedDef', producerId: defOwner.id };
  }
  return { path, kind: 'missingInput' };
}

function logicalOf(path: string): string {
  const match = /^_\d+_\/(l\d+\/.+)$/.exec(path);
  return match ? match[1] : path;
}

export function coverageReport(
  catalog: D1Catalog,
  plan: D1MeasuredPlan,
  storageByEntity: Readonly<Record<string, D1StorageTarget>>,
): D1Coverage {
  const measured: Record<string, number> = {};
  for (const type of D1_ARTIFACT_TYPES) measured[type] = 0;
  for (const item of catalog.items) measured[item.type] = (measured[item.type] || 0) + 1;
  const measuredCore = D1_CORE_TYPES.reduce((sum, type) => sum + (measured[type] || 0), 0);
  const gaps: string[] = [];
  const usecaseIds = new Set(catalog.items.filter(item => item.type === 'usecase').map(item => item.id.split('/').pop()));
  for (const usecase of plan.selection.usecases) {
    if (!usecaseIds.has(usecase.usecaseId)) gaps.push(`Selected usecase ${usecase.usecaseId} has no catalog item.`);
  }
  const routes = new Set(catalog.items.flatMap(item => item.routes || []));
  for (const route of plan.selection.routes) {
    if (!routes.has(route.route)) gaps.push(`Selected route ${route.route} has no controller.`);
  }
  for (const port of plan.selection.ports) {
    if (!catalog.items.some(item => item.type === 'repositoryPort' && item.id.endsWith(`/${port.portId}`))) {
      gaps.push(`Selected port ${port.portId} has no catalog item.`);
    }
  }
  for (const table of plan.selection.tables) {
    if (!catalog.items.some(item => item.type === 'table' && item.id.endsWith(`/${table.tableId}`))) {
      gaps.push(`Selected table ${table.tableId} has no catalog item.`);
    }
    if (storageByEntity[table.entity] && storageByEntity[table.entity] !== 'moduleDatabase') {
      gaps.push(`Table ${table.tableId} belongs to ${table.entity}, which is ${storageByEntity[table.entity]}.`);
    }
  }
  for (const entity of plan.selection.entities) {
    if (!catalog.items.some(item => item.type === 'domainEntity' && item.id.endsWith(`/${entity}`))) {
      gaps.push(`Selected entity ${entity} has no domain item.`);
    }
    const storage = storageByEntity[entity];
    if (storage && storage !== 'moduleDatabase') {
      if (plan.selection.tables.some(table => table.entity === entity)) gaps.push(`MDM entity ${entity} has a table.`);
      if (plan.selection.ports.some(port => port.entity === entity)) gaps.push(`MDM entity ${entity} has a repository port.`);
    }
  }
  const justifications: D1Justification[] = [];
  for (const item of catalog.items) {
    if (!(D1_AUXILIARY_TYPES as readonly string[]).includes(item.type)) continue;
    const reason = catalog.justifications.find(entry => entry.id === item.id);
    if (!reason || !reason.reason.trim()) gaps.push(`Auxiliary ${item.id} has no justification.`);
    else justifications.push(reason);
  }
  for (const absence of catalog.absences) {
    if (!absence.reason.trim()) gaps.push(`Absence of ${absence.artifactType} has no reason.`);
    if ((D1_CORE_TYPES as readonly string[]).includes(absence.artifactType)) {
      gaps.push(`Core type ${absence.artifactType} cannot be recorded as absent.`);
    }
  }
  const refs = resolveCatalogRefs(catalog);
  return {
    measured,
    measuredCore,
    forecastCore: D1_FORECAST_CORE.count,
    forecastNote: D1_FORECAST_CORE.note,
    forecastMatchesMeasured: measuredCore === D1_FORECAST_CORE.count,
    auxiliaries: justifications,
    absences: catalog.absences,
    futureOutputs: refs.filter(ref => ref.kind === 'futureOutput').map(ref => ref.path),
    missingInputs: refs.filter(ref => ref.kind === 'missingInput').map(ref => ref.path),
    gaps,
  };
}

export function effectCoverageIssues(usecases: readonly { effects?: Array<{ eventId: string }> }[], events: readonly string[]): string[] {
  const known = new Set(events);
  const issues: string[] = [];
  for (const usecase of usecases) {
    for (const effect of usecase.effects || []) {
      if (!known.has(effect.eventId)) issues.push(`Effect ${effect.eventId} is not an outbound event of the catalog.`);
    }
  }
  return issues;
}

export function integrationLinkIssues(
  events: readonly { eventId: string; on: string; consumer?: string }[],
  usecaseIds: readonly string[],
): string[] {
  const issues: string[] = [];
  const known = new Set(usecaseIds);
  for (const event of events) {
    const transition = event.on.split('.')[1] || '';
    if (!transition || !known.has(transition)) issues.push(`Outbound ${event.eventId} does not name a usecase id.`);
    if (event.consumer !== undefined && event.consumer !== transition) {
      issues.push(`Outbound ${event.eventId} consumer does not match ${transition}.`);
    }
  }
  return issues;
}

/**
 * Schema property path → the function that reads it.
 * A new field without an entry here has no reader and must not be added.
 */
export const D1_FIELD_READERS = {
  'definition.schemaVersion': 'definitionIssues',
  'definition.artifactType': 'definitionIssues',
  'definition.artifactId': 'definitionIssues',
  'definition.moduleName': 'definitionIssues',
  'definition.data': 'definitionIssues',
  'domainEntity.entityId': 'domainEntityIssues',
  'domainEntity.storageTarget': 'storageTargetIssues',
  'domainEntity.fields': 'domainEntityIssues',
  'domainEntity.fields.name': 'domainEntityIssues',
  'domainEntity.fields.type': 'domainEntityIssues',
  'domainEntity.fields.derived': 'derivedFieldIssues',
  'domainEntity.fields.ref': 'recordFieldIssues',
  'domainEntity.lifecycle': 'lifecycleIssues',
  'domainEntity.lifecycle.states': 'lifecycleIssues',
  'domainEntity.lifecycle.states.state': 'lifecycleIssues',
  'domainEntity.lifecycle.states.reachedBy': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions.transitionId': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions.from': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions.to': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions.by': 'lifecycleIssues',
  'domainEntity.lifecycle.transitions.ruleRefs': 'lifecycleIssues',
  'domainEntity.invariants': 'domainEntityIssues',
  'domainEntity.imports': 'domainImportIssues',
  'valueObject.valueObjectId': 'valueObjectIssues',
  'valueObject.fields': 'valueObjectIssues',
  'valueObject.fields.name': 'valueObjectIssues',
  'valueObject.fields.type': 'valueObjectIssues',
  'valueObject.fields.derived': 'derivedFieldIssues',
  'valueObject.fields.ref': 'recordFieldIssues',
  'valueObject.referencedBy': 'valueObjectIssues',
  'repositoryPort.entityId': 'repositoryPortIssues',
  'repositoryPort.interfaceName': 'repositoryPortIssues',
  'repositoryPort.methods': 'repositoryPortIssues',
  'repositoryPort.methods.name': 'repositoryPortIssues',
  'repositoryPort.methods.params': 'repositoryPortIssues',
  'repositoryPort.methods.returns': 'repositoryPortIssues',
  'table.tableId': 'tableIssues',
  'table.entityId': 'tableIdentityIssues',
  'table.physicalName': 'tableIssues',
  'table.primaryKey': 'tableIssues',
  'table.uniqueKeys': 'tableIssues',
  'table.indexes': 'tableIssues',
  'table.indexes.name': 'tableIssues',
  'table.indexes.columns': 'tableIssues',
  'table.indexes.unique': 'tableIssues',
  'repositoryAdapter.entityId': 'adapterBindingIssues',
  'repositoryAdapter.portId': 'adapterLinkIssues',
  'repositoryAdapter.tableId': 'adapterLinkIssues',
  'repositoryAdapter.columns': 'adapterBindingIssues',
  'repositoryAdapter.columns.field': 'adapterBindingIssues',
  'repositoryAdapter.columns.column': 'adapterBindingIssues',
  'usecase.usecaseId': 'usecaseIssues',
  'usecase.entityId': 'usecaseIssues',
  'usecase.operation': 'usecaseIssues',
  'usecase.ports': 'usecaseIssues',
  'usecase.rulesApplied': 'usecaseIssues',
  'usecase.rulePlan': 'readUsecaseFidelity',
  'usecase.rulePlan.ruleId': 'readUsecaseFidelity',
  'usecase.rulePlan.origin': 'readUsecaseFidelity',
  'usecase.rulePlan.consumer': 'readUsecaseFidelity',
  'usecase.rulePlan.enforcement': 'readUsecaseFidelity',
  'usecase.rulePlan.gap': 'readUsecaseFidelity',
  'usecase.functions': 'usecaseIssues',
  'usecase.functions.functionName': 'usecaseIssues',
  'usecase.functions.input': 'projectionIssues',
  'usecase.functions.input.name': 'projectionIssues',
  'usecase.functions.input.type': 'projectionIssues',
  'usecase.functions.input.fieldRef': 'projectionIssues',
  'usecase.functions.output': 'projectionIssues',
  'usecase.functions.output.name': 'projectionIssues',
  'usecase.functions.output.type': 'projectionIssues',
  'usecase.functions.output.fieldRef': 'projectionIssues',
  'usecase.functions.contractRefs': 'routeProjectionIssues',
  'usecase.functions.contractRefs.route': 'routeProjectionIssues',
  'usecase.functions.contractRefs.symbol': 'routeProjectionIssues',
  'usecase.routeProjections': 'routeProjectionIssues',
  'usecase.routeProjections.route': 'routeProjectionIssues',
  'usecase.routeProjections.contractPath': 'routeProjectionIssues',
  'usecase.routeProjections.projection': 'routeProjectionIssues',
  'usecase.routeProjections.outputFields': 'routeProjectionIssues',
  'usecase.portCalls': 'usecaseIssues',
  'usecase.transactional': 'usecaseIssues',
  'usecase.effects': 'usecaseIssues',
  'usecase.effects.eventId': 'effectCoverageIssues',
  'usecase.effects.path': 'readUsecaseFidelity',
  'usecase.effects.symbol': 'readUsecaseFidelity',
  'usecase.sequence': 'readUsecaseFidelity',
  'usecase.sequence.kind': 'readUsecaseFidelity',
  'usecase.sequence.call': 'readUsecaseFidelity',
  'usecase.sequence.port': 'readUsecaseFidelity',
  'usecase.sequence.ruleId': 'readUsecaseFidelity',
  'usecase.sequence.namespace': 'readUsecaseFidelity',
  'usecase.sequence.entity': 'readUsecaseFidelity',
  'usecase.sequence.capability': 'readUsecaseFidelity',
  'usecase.sequence.transitionId': 'readUsecaseFidelity',
  'usecase.sequence.payload': 'readUsecaseFidelity',
  'usecase.sequence.eventId': 'readUsecaseFidelity',
  'usecase.sequence.boundary': 'readUsecaseFidelity',
  'usecase.sequence.source': 'readUsecaseFidelity',
  'usecase.uses': 'readUsecaseFidelity',
  'usecase.uses.path': 'readUsecaseFidelity',
  'usecase.uses.role': 'readUsecaseFidelity',
  'usecase.uses.source': 'readUsecaseFidelity',
  'usecase.rules': 'readUsecaseFidelity',
  'usecase.rules.ruleId': 'readUsecaseFidelity',
  'usecase.rules.path': 'readUsecaseFidelity',
  'usecase.rules.symbol': 'readUsecaseFidelity',
  'usecase.transaction': 'readUsecaseFidelity',
  'usecase.transaction.boundary': 'readUsecaseFidelity',
  'usecase.lifecycle': 'readUsecaseFidelity',
  'usecase.lifecycle.transitionId': 'readUsecaseFidelity',
  'usecase.lifecycle.payload': 'readUsecaseFidelity',
  'usecase.lifecycle.sourcePath': 'readUsecaseFidelity',
  'usecase.lifecycle.symbol': 'readUsecaseFidelity',
  'usecase.mdm': 'readUsecaseFidelity',
  'usecase.mdm.namespace': 'readUsecaseFidelity',
  'usecase.mdm.role': 'readUsecaseFidelity',
  'usecase.mdm.atomic': 'readUsecaseFidelity',
  'usecase.mdm.calls': 'readUsecaseFidelity',
  'usecase.mdm.calls.method': 'readUsecaseFidelity',
  'usecase.mdm.calls.target': 'readUsecaseFidelity',
  'usecase.mdm.calls.shape': 'readUsecaseFidelity',
  'usecase.mdm.calls.capabilities': 'readUsecaseFidelity',
  'usecase.mdm.calls.alternative': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments.name': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments.role': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments.capability': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments.path': 'readUsecaseFidelity',
  'usecase.mdm.calls.arguments.value': 'readUsecaseFidelity',
  'usecase.mdm.calls.result': 'readUsecaseFidelity',
  'httpController.pageId': 'httpControllerIssues',
  'httpController.handlers': 'httpControllerIssues',
  'httpController.handlers.route': 'httpControllerIssues',
  'httpController.handlers.kind': 'httpControllerIssues',
  'httpController.handlers.usecaseId': 'httpControllerIssues',
  'httpController.handlers.grantIds': 'httpControllerIssues',
  'accessScope.scopeId': 'accessScopeIssues',
  'accessScope.grants': 'accessScopeIssues',
  'accessScope.grants.grantId': 'accessScopeIssues',
  'accessScope.grants.actorRef': 'accessScopeIssues',
  'accessScope.grants.anchorEntity': 'accessAnchorIssues',
  'accessScope.grants.entityRefs': 'accessAnchorIssues',
  'accessScope.grants.disclosure': 'accessScopeIssues',
  'accessScope.grants.allowedFields': 'accessScopeIssues',
  'accessScope.grants.scopeMode': 'accessScopeIssues',
  'accessScope.grants.session': 'accessScopeIssues',
  'accessScope.grants.path': 'reconstructAccessPolicy',
  'accessScope.grants.path.relationshipId': 'reconstructAccessPolicy',
  'accessScope.grants.path.from': 'reconstructAccessPolicy',
  'accessScope.grants.path.to': 'reconstructAccessPolicy',
  'accessScope.grants.path.field': 'accessScopeIssues',
  'accessScope.grants.pending': 'accessScopeIssues',
  'authorityMap.mapId': 'authorityMapIssues',
  'authorityMap.entries': 'authorityMapIssues',
  'authorityMap.entries.grantId': 'authorityGrantIssues',
  'authorityMap.entries.actorRef': 'authorityMapIssues',
  'repositoryRegistration.registrationId': 'registrationIssues',
  'repositoryRegistration.adapters': 'registrationIssues',
  'repositoryRegistration.adapters.portId': 'registrationIssues',
  'repositoryRegistration.adapters.adapterArtifactId': 'registrationIssues',
  'persistenceSeeds.seedId': 'seedScenarioIssues',
  'persistenceSeeds.phase': 'seedScenarioIssues',
  'persistenceSeeds.scenarios': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.scenarioId': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.tableId': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.source': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.constraints': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.refs': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.refs.field': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.refs.relationshipId': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.refs.entityId': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.states': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.requires': 'seedScenarioIssues',
  'persistenceSeeds.scenarios.entityId': 'seedUses',
  'persistenceSeeds.scenarios.stateField': 'seedUses',
  'persistenceSeeds.dependencies': 'seedScenarioIssues',
  'persistenceSeeds.dependencies.entityId': 'seedScenarioIssues',
  'persistenceSeeds.dependencies.kind': 'seedScenarioIssues',
  'persistenceSeeds.dependencies.seeded': 'seedScenarioIssues',
  'persistenceSeeds.datasets': 'seedScenarioIssues',
  'persistenceSeeds.datasets.datasetId': 'seedScenarioIssues',
  'persistenceSeeds.datasets.tableId': 'seedScenarioIssues',
  'persistenceSeeds.datasets.owners': 'seedScenarioIssues',
  'integrationOutbound.integrationId': 'integrationMechanismIssues',
  'integrationOutbound.events': 'integrationMechanismIssues',
  'integrationOutbound.events.eventId': 'integrationMechanismIssues',
  'integrationOutbound.events.on': 'integrationLinkIssues',
  'integrationOutbound.events.entityId': 'integrationMechanismIssues',
  'integrationOutbound.events.mechanism': 'integrationMechanismIssues',
  'integrationOutbound.events.consumer': 'integrationLinkIssues',
  'integrationOutbound.events.mechanismRef': 'integrationMechanismIssues',
  'integrationOutbound.processes': 'integrationCoverageIssues',
  'integrationOutbound.processes.processId': 'integrationCoverageIssues',
  'integrationOutbound.processes.operations': 'integrationCoverageIssues',
  'integrationOutbound.processes.mechanism': 'integrationCoverageIssues',
  'integrationOutbound.processes.consumer': 'integrationCoverageIssues',
  'integrationOutbound.inbound': 'integrationCoverageIssues',
  'integrationOutbound.inbound.inboundId': 'integrationCoverageIssues',
  'integrationOutbound.inbound.operations': 'integrationCoverageIssues',
  'integrationOutbound.inbound.mechanism': 'integrationCoverageIssues',
  'integrationOutbound.inbound.consumer': 'integrationCoverageIssues',
  'integrationOutbound.plugins': 'integrationCoverageIssues',
  'integrationOutbound.plugins.pluginId': 'integrationCoverageIssues',
  'integrationOutbound.plugins.operations': 'integrationCoverageIssues',
  'integrationOutbound.plugins.mechanism': 'integrationCoverageIssues',
  'integrationOutbound.plugins.consumer': 'integrationCoverageIssues',
  'integrationOutbound.gaps': 'integrationCoverageIssues',
  'integrationOutbound.gaps.itemId': 'integrationCoverageIssues',
  'integrationOutbound.gaps.kind': 'integrationCoverageIssues',
  'integrationOutbound.gaps.code': 'integrationCoverageIssues',
  'pipelineItem.id': 'pipelineItemIssues',
  'pipelineItem.type': 'pipelineItemIssues',
  'pipelineItem.defPath': 'resolveCatalogRefs',
  'pipelineItem.outputPath': 'resolveCatalogRefs',
  'pipelineItem.outputAvailability': 'resolveCatalogRefs',
  'pipelineItem.dependsFiles': 'resolveCatalogRefs',
  'pipelineItem.dependsOn': 'catalogIssues',
  'pipelineItem.skills': 'skillRefIssues',
  'pipelineItem.routes': 'duplicateRouteIssues',
  'catalog.schemaVersion': 'coverageReport',
  'catalog.project': 'coverageReport',
  'catalog.moduleName': 'coverageReport',
  'catalog.items': 'coverageReport',
  'catalog.presentPaths': 'resolveCatalogRefs',
  'catalog.justifications': 'coverageReport',
  'catalog.justifications.id': 'coverageReport',
  'catalog.justifications.artifactType': 'coverageReport',
  'catalog.justifications.reason': 'coverageReport',
  'catalog.absences': 'coverageReport',
  'catalog.absences.artifactType': 'coverageReport',
  'catalog.absences.reason': 'coverageReport',
} as const;
