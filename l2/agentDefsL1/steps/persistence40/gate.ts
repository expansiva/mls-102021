/// <mls fileReference="_102021_/l2/agentDefsL1/steps/persistence40/gate.ts" enhancement="_blank"/>

import {
  definitionIssues,
  isRecord,
  pendingDefinition,
  type D1Definition,
  type D1PortMethod,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  futureOutputPath,
  pipelineId,
  qualifyDefPath,
  skillPaths,
  type D1PipelineItem,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { renderDefinition, stampDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { D1_DOMAIN_VERSION, type D1DomainBuild, type D1DomainEntityPlan } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import {
  D1_DETAILS_COLUMN,
  D1_PERSISTENCE_ACTIONS,
  D1_PERSISTENCE_VERSION,
  ENUMERATION_REASON,
  bindingRoundTripIssues,
  columnForField,
  type D1ColumnBinding,
  type D1PersistenceAdapterPlan,
  type D1PersistenceBuild,
  type D1PersistenceEmit,
  type D1PersistenceFile,
  type D1PersistenceNormalization,
  type D1PersistencePortPlan,
  type D1PersistenceProblem,
  type D1PersistenceRequest,
  type D1PersistenceTablePlan,
  type D1UnconsumedEnumeration,
  type D1UniqueKeyUse,
} from '/_102021_/l2/agentDefsL1/steps/persistence40/contracts.js';

const OPERATIONS = ['create', 'list', 'update', 'transition', 'delete'] as const;
type Operation = typeof OPERATIONS[number];
const USECASE_STATUSES = ['toCreate', 'toUpdate', 'done', 'toRemove'] as const;
const WRITE_ACTIONS = new Set(['create', 'update', 'recompose']);
const LOCAL_BAN: Record<string, { table: string; port: string; label: string }> = {
  mdm: { table: 'MDM_LOCAL_TABLE', port: 'MDM_LOCAL_PORT', label: 'MDM role' },
  derived: { table: 'DERIVED_LOCAL_TABLE', port: 'DERIVED_LOCAL_PORT', label: 'derived entity' },
  external: { table: 'EXTERNAL_LOCAL_TABLE', port: 'EXTERNAL_LOCAL_PORT', label: 'external entity' },
};

interface Leaf {
  path: string;
  indexed: boolean;
  required: boolean;
}

/**
 * One deterministic pass from the domain draft and the L4 record to ports, tables and adapters.
 * No model. Physical names are `storage.table` verbatim. Nothing is snake-cased or pluralized.
 */
export function buildD1Persistence(request: D1PersistenceRequest): D1PersistenceBuild {
  const problems: D1PersistenceProblem[] = [];
  const normalizations: D1PersistenceNormalization[] = [];
  const enumerations = unconsumedEnumerations(request.domain);
  const uniqueKeys: D1UniqueKeyUse[] = [];
  noteStepBoundaries(request, normalizations);

  if (!domainDraftOk(request, problems)) {
    return finish(request, false, enumerations, uniqueKeys, [], [], [], problems, normalizations, [], []);
  }

  for (const plan of request.domain.entities) {
    if (plan.storageTarget !== 'external') continue;
    const source = sourceOf(request.entities[plan.entityId]);
    if (!source) {
      review(problems, 'CATALOG_SOURCE_MISSING', plan.entityId, `External entity ${plan.entityId} names no catalog source. No local table was planned.`);
      continue;
    }
    if (!request.catalogsRead.includes(source)) {
      error(problems, 'CATALOG_UNREAD', source, `Catalog ${source} was not opened. No local table was copied from it.`);
      continue;
    }
    normalizations.push({ code: 'CATALOG_READ_ONLY', path: source, detail: 'Opened and not written.' });
  }

  const ports: D1PersistencePortPlan[] = [];
  const tables: D1PersistenceTablePlan[] = [];
  const adapters: D1PersistenceAdapterPlan[] = [];
  const preserved: string[] = [];
  const removed: string[] = [];
  const blocked = new Set<string>();
  const entities = plannedEntities(request);

  for (const entityId of entities) {
    planEntity(request, entityId, problems, normalizations, uniqueKeys, ports, tables, adapters, preserved, removed, blocked);
  }
  for (const plan of request.domain.entities) {
    const pending = plan.uniqueKeys || [];
    if (!pending.length || uniqueKeys.some(row => row.entityId === plan.entityId)) continue;
    uniqueKeys.push({
      entityId: plan.entityId,
      tableId: null,
      uniqueKeys: pending.map(key => [...key]),
      consumed: false,
      placedOn: 'No local table. uniqueKeys were not copied.',
    });
  }

  const ok = !problems.some(problem => problem.severity === 'error');
  const emit = ok ? emitParts(request, ports, tables, adapters, problems) : [];
  const stillOk = ok && !problems.some(problem => problem.severity === 'error');
  return finish(
    request,
    stillOk,
    enumerations,
    uniqueKeys,
    ports,
    tables,
    adapters,
    problems,
    normalizations,
    preserved,
    removed,
    stillOk ? emit : [],
  );
}

function planEntity(
  request: D1PersistenceRequest,
  entityId: string,
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
  uniqueKeys: D1UniqueKeyUse[],
  ports: D1PersistencePortPlan[],
  tables: D1PersistenceTablePlan[],
  adapters: D1PersistenceAdapterPlan[],
  preserved: string[],
  removed: string[],
  blocked: Set<string>,
): void {
  const domain = request.domain.entities.find(item => item.entityId === entityId);
  if (!domain) {
    error(problems, 'ENTITY_NOT_IN_DOMAIN', entityId, `Entity ${entityId} is not in the domain draft.`);
    blocked.add(entityId);
    return;
  }
  const portSel = request.selection.ports.filter(item => item.entity === entityId);
  const tableSel = request.selection.tables.filter(item => item.entity === entityId);
  if (portSel.length > 1) {
    error(problems, 'PORT_DUP', entityId, `Entity ${entityId} has more than one repository port.`);
    blocked.add(entityId);
  }
  if (tableSel.length > 1) {
    error(problems, 'TABLE_DUP', entityId, `Entity ${entityId} has more than one table.`);
    blocked.add(entityId);
  }
  const ban = LOCAL_BAN[domain.storageTarget];
  if (ban) {
    for (const table of tableSel) {
      error(problems, ban.table, table.tableId, `Table ${table.tableId} is a local table for ${ban.label} ${entityId}.`);
    }
    for (const port of portSel) {
      error(problems, ban.port, port.portId, `Port ${port.portId} is a local repository for ${ban.label} ${entityId}.`);
    }
    if (tableSel.length || portSel.length) blocked.add(entityId);
    return;
  }
  if (domain.storageTarget !== 'moduleDatabase') {
    error(problems, 'STORAGE_UNKNOWN', entityId, `Entity ${entityId} storage ${domain.storageTarget || '(missing)'} is not a local table target.`);
    blocked.add(entityId);
    return;
  }
  if (portSel.length === 0) {
    error(problems, 'PORT_UNPLANNED', entityId, `Entity ${entityId} has no repository port in the plan.`);
    blocked.add(entityId);
  }
  if (tableSel.length === 0) {
    error(problems, 'TABLE_UNPLANNED', entityId, `Entity ${entityId} has no table in the plan.`);
    blocked.add(entityId);
  }
  if (blocked.has(entityId)) return;

  const portId = portSel[0].portId;
  const tableId = tableSel[0].tableId;
  const portFile = oneFile(request, 'repositoryPort', portId, problems, blocked, entityId);
  const tableFile = oneFile(request, 'table', tableId, problems, blocked, entityId);
  const adapterFile = oneFile(request, 'repositoryAdapter', portId, problems, blocked, entityId);
  if (!portFile || !tableFile || !adapterFile || blocked.has(entityId)) return;

  const body = isRecord(request.entities[entityId]) ? request.entities[entityId] : null;
  if (!body) {
    error(problems, 'ENTITY_BODY_MISSING', entityId, `Entity ${entityId} has no ontology body.`);
    blocked.add(entityId);
    return;
  }
  const physical = physicalName(entityId, body, request.physicalCitations[entityId] || [], problems, blocked);
  const keys = consumeUniqueKeys(entityId, domain, body, problems, blocked);
  const leaves = readLeaves(entityId, body, problems, blocked);
  if (!physical || !keys || !leaves || blocked.has(entityId)) return;

  const primaryKey = primaryKeyOf(entityId, body, leaves, problems, normalizations, blocked);
  if (!primaryKey || blocked.has(entityId)) return;
  const methods = methodsFor(entityId, request, problems, normalizations, blocked);
  const bindings = bindingsFor(entityId, leaves, primaryKey, keys, problems, normalizations, blocked);
  if (!methods || !bindings || blocked.has(entityId)) return;
  const indexes = indexesFor(physical, keys, leaves, primaryKey, problems, normalizations);
  if (blocked.has(entityId)) return;

  const incompatible = preservedPortIssues(request, portFile, portId, methods, problems, normalizations);
  if (incompatible) blocked.add(entityId);

  const detailsColumn = bindings.some(binding => binding.placement === 'json') ? D1_DETAILS_COLUMN : null;
  if (detailsColumn) {
    normalizations.push({
      code: 'DETAILS_COLUMN',
      path: `${entityId}.${D1_DETAILS_COLUMN}`,
      detail: 'Non-indexed fields use the runtime details JSONB column. Keys inside it are the logical paths.',
    });
  }

  const portDefinition = definitionFor(request, 'repositoryPort', portId, {
    entityId,
    interfaceName: portId,
    methods,
  });
  const tableDefinition = definitionFor(request, 'table', tableId, {
    tableId,
    entityId,
    physicalName: physical,
    primaryKey,
    uniqueKeys: keys,
    indexes,
  });
  const adapterDefinition = definitionFor(request, 'repositoryAdapter', portId, {
    entityId,
    portId,
    tableId,
    columns: bindings.map(binding => ({ field: binding.field, column: binding.column })),
  });
  refuseDefinition(portDefinition, portFile.defPath, problems, blocked, entityId);
  refuseDefinition(tableDefinition, tableFile.defPath, problems, blocked, entityId);
  refuseDefinition(adapterDefinition, adapterFile.defPath, problems, blocked, entityId);

  const show = !blocked.has(entityId);
  if (show) {
    uniqueKeys.push({
      entityId,
      tableId,
      uniqueKeys: keys,
      consumed: true,
      placedOn: 'table.data.uniqueKeys',
    });
  }
  ports.push({
    portId,
    entityId,
    action: portFile.action,
    defPath: portFile.defPath,
    methods,
    definition: show ? portDefinition : null,
  });
  tables.push({
    tableId,
    entityId,
    action: tableFile.action,
    defPath: tableFile.defPath,
    physicalName: physical,
    detailsColumn,
    definition: show ? tableDefinition : null,
  });
  adapters.push({
    portId,
    entityId,
    tableId,
    action: adapterFile.action,
    defPath: adapterFile.defPath,
    methods,
    bindings,
    definition: show ? adapterDefinition : null,
  });
  noteAction(portFile, preserved, removed);
  noteAction(tableFile, preserved, removed);
  noteAction(adapterFile, preserved, removed);
  for (const issue of bindingRoundTripIssues(bindings)) {
    error(problems, 'ROUND_TRIP', adapterFile.defPath, issue);
  }
  for (const issue of applicationAdapterIssues(portPipeline(request, portId, entityId, domain, portFile.defPath))) {
    error(problems, 'APPLICATION_IMPORT', portFile.defPath, issue);
  }
}

function domainDraftOk(request: D1PersistenceRequest, problems: D1PersistenceProblem[]): boolean {
  const path = `l1/${request.moduleName}/pipeline/agentDefsL1/drafts/domain30.json`;
  const domain = request.domain;
  if (!domain || domain.schemaVersion !== D1_DOMAIN_VERSION || domain.project !== request.project || domain.moduleName !== request.moduleName) {
    error(problems, 'DOMAIN_DRAFT', path, 'domain30 draft does not belong to this project. persistence40 wrote nothing.');
    return false;
  }
  if (domain.ok !== true) {
    error(problems, 'DOMAIN_NOT_OK', path, 'domain30 draft is not ok. persistence40 wrote nothing.');
    return false;
  }
  return true;
}

function unconsumedEnumerations(domain: D1DomainBuild): D1UnconsumedEnumeration[] {
  const out: D1UnconsumedEnumeration[] = [];
  for (const entity of domain?.entities || []) {
    for (const item of entity.enumerations || []) {
      out.push({
        entityId: entity.entityId,
        path: item.path,
        values: [...item.values],
        consumed: false,
        source: 'domain30.enumerations',
        reason: ENUMERATION_REASON,
      });
    }
  }
  return out;
}

function noteStepBoundaries(request: D1PersistenceRequest, normalizations: D1PersistenceNormalization[]): void {
  for (const file of request.selection.files) {
    if (file.artifactType !== 'persistenceSeeds' && file.artifactType !== 'repositoryRegistration') continue;
    normalizations.push({
      code: 'OUT_OF_STEP',
      path: file.defPath,
      detail: 'persistence40 does not write seeds or the registry.',
    });
  }
}

function plannedEntities(request: D1PersistenceRequest): string[] {
  return [...new Set([
    ...request.selection.ports.map(item => item.entity),
    ...request.selection.tables.map(item => item.entity),
  ])].filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function oneFile(
  request: D1PersistenceRequest,
  artifactType: string,
  identity: string,
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
  entityId: string,
): D1PersistenceFile | null {
  const found = request.selection.files.filter(file => file.artifactType === artifactType && file.identity === identity);
  if (found.length !== 1) {
    error(
      problems,
      found.length === 0 ? 'FILE_UNPLANNED' : 'NAME_COLLISION',
      identity,
      found.length === 0
        ? `${artifactType} ${identity} has no file in the plan.`
        : `${artifactType} ${identity} has more than one file in the plan.`,
    );
    blocked.add(entityId);
    return null;
  }
  const file = found[0];
  if (!(D1_PERSISTENCE_ACTIONS as readonly string[]).includes(file.action)) {
    error(problems, 'ACTION_UNKNOWN', file.defPath, `Action ${file.action || '(missing)'} is not a persistence action.`);
    blocked.add(entityId);
    return null;
  }
  if (file.action === 'conflict') {
    error(problems, 'PLAN_CONFLICT', file.defPath, `${artifactType} ${identity} is a plan conflict. The file was not written.`);
    blocked.add(entityId);
    return null;
  }
  return file;
}

function physicalName(
  entityId: string,
  body: Record<string, unknown>,
  citations: readonly string[],
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
): string {
  const storage = isRecord(body.storage) ? body.storage : null;
  const table = storage ? text(storage.table) : '';
  const path = `${entityId}.storage.table`;
  if (!table) {
    error(problems, 'PHYSICAL_NAME', path, `Entity ${entityId} has no storage.table. No physical name was invented.`);
    blocked.add(entityId);
    return '';
  }
  if (!isSafeToken(table)) {
    error(problems, 'PHYSICAL_NAME', path, `Physical name ${table} is not a token. It was not rewritten.`);
    blocked.add(entityId);
    return '';
  }
  for (const cited of citations) {
    if (cited === table) continue;
    error(problems, 'DIVERGENT_BINDING', path, `Physical name ${table} does not match citation ${cited}.`);
    blocked.add(entityId);
  }
  return blocked.has(entityId) ? '' : table;
}

function consumeUniqueKeys(
  entityId: string,
  domain: D1DomainEntityPlan,
  body: Record<string, unknown>,
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
): string[][] | null {
  const fromBody = readUniqueKeys(entityId, body, problems, blocked);
  if (!fromBody) return null;
  const fromDraft = (domain.uniqueKeys || []).map(key => [...key]);
  if (JSON.stringify(fromDraft) !== JSON.stringify(fromBody)) {
    error(problems, 'UNIQUE_KEYS_DIVERGENT', `${entityId}.uniqueKeys`, `Domain draft uniqueKeys for ${entityId} do not match the ontology.`);
    blocked.add(entityId);
    return null;
  }
  return fromDraft;
}

function readUniqueKeys(
  entityId: string,
  body: Record<string, unknown>,
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
): string[][] | null {
  if (body.uniqueKeys === undefined) return [];
  if (!Array.isArray(body.uniqueKeys)) {
    error(problems, 'UNIQUE_KEYS', entityId, `Entity ${entityId} uniqueKeys is not a list.`);
    blocked.add(entityId);
    return null;
  }
  const keys: string[][] = [];
  for (let index = 0; index < body.uniqueKeys.length; index += 1) {
    const row = body.uniqueKeys[index];
    const fields = Array.isArray(row) ? row.map(item => text(item)) : null;
    if (!fields || fields.some(field => !field)) {
      error(problems, 'UNIQUE_KEYS', `${entityId}.uniqueKeys.${index}`, `Unique key ${index} is not a list of field names.`);
      blocked.add(entityId);
      return null;
    }
    keys.push(fields);
  }
  return keys;
}

function readLeaves(
  entityId: string,
  body: Record<string, unknown>,
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
): Leaf[] | null {
  const record = isRecord(body.record) ? body.record : null;
  if (!record || !isRecord(record.fields) || Array.isArray(record.fields)) {
    error(problems, 'RECORD_SHAPE', `${entityId}.record.fields`, `Entity ${entityId} record.fields is not a v3 field map. An NS4 field list is not converted.`);
    blocked.add(entityId);
    return null;
  }
  const leaves: Leaf[] = [];
  const failed = walkFields(entityId, record.fields, '', leaves, problems, blocked);
  return failed ? null : leaves;
}

function walkFields(
  entityId: string,
  fields: Record<string, unknown>,
  prefix: string,
  leaves: Leaf[],
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
): boolean {
  let failed = false;
  for (const [key, raw] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const origin = `${entityId}.record.fields.${path}`;
    if (!isRecord(raw) || Array.isArray(raw)) {
      error(problems, 'FIELD_SHAPE', origin, `Field ${path} is not an object.`);
      blocked.add(entityId);
      failed = true;
      continue;
    }
    if (raw.indexed !== undefined && typeof raw.indexed !== 'boolean') {
      error(problems, 'FIELD_INDEXED', origin, `Field ${path} indexed is not a boolean.`);
      blocked.add(entityId);
      failed = true;
    }
    if (raw.required !== undefined && typeof raw.required !== 'boolean') {
      error(problems, 'FIELD_REQUIRED', origin, `Field ${path} required is not a boolean.`);
      blocked.add(entityId);
      failed = true;
    }
    const type = text(raw.type);
    if (!type) {
      error(problems, 'FIELD_TYPE', origin, `Field ${path} has no type.`);
      blocked.add(entityId);
      failed = true;
      continue;
    }
    if (type === 'object' && isRecord(raw.fields) && !Array.isArray(raw.fields)) {
      if (raw.indexed === true) {
        error(problems, 'INDEXED_OBJECT', origin, `Object ${path} is indexed. No column was invented for the object.`);
        blocked.add(entityId);
        failed = true;
      }
      if (walkFields(entityId, raw.fields, path, leaves, problems, blocked)) failed = true;
      continue;
    }
    if (raw.indexed === true && path.includes('.')) {
      error(problems, 'INDEXED_NESTED', origin, `Nested field ${path} is indexed. It was not promoted to a column.`);
      blocked.add(entityId);
      failed = true;
    }
    if (leaves.some(leaf => leaf.path === path)) {
      error(problems, 'NAME_COLLISION', origin, `Field ${path} is declared more than once.`);
      blocked.add(entityId);
      failed = true;
      continue;
    }
    leaves.push({ path, indexed: raw.indexed === true, required: raw.required === true });
  }
  return failed;
}

function primaryKeyOf(
  entityId: string,
  body: Record<string, unknown>,
  leaves: Leaf[],
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
  blocked: Set<string>,
): string[] | null {
  const storage = isRecord(body.storage) ? body.storage : null;
  const idField = storage ? text(storage.idField) : '';
  const hasId = leaves.some(leaf => leaf.path === 'id');
  if (idField && hasId && idField !== 'id') {
    error(problems, 'DIVERGENT_BINDING', `${entityId}.storage.idField`, `idField ${idField} does not match field id.`);
    blocked.add(entityId);
    return null;
  }
  const name = idField || (hasId ? 'id' : '');
  if (!name || !leaves.some(leaf => leaf.path === name)) {
    error(problems, 'PRIMARY_KEY', entityId, `Entity ${entityId} has no id field. No primary key was invented.`);
    blocked.add(entityId);
    return null;
  }
  normalizations.push({
    code: 'ID_COLUMN',
    path: `${entityId}.${name}`,
    detail: `Primary key column name is the logical field ${name}.`,
  });
  return [name];
}

function methodsFor(
  entityId: string,
  request: D1PersistenceRequest,
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
  blocked: Set<string>,
): D1PortMethod[] | null {
  const selected = new Set<Operation>();
  let failed = false;
  for (const usecase of request.selection.usecases) {
    if (usecase.entity !== entityId) continue;
    const path = `usecases.${usecase.usecaseId}.operation`;
    if (!(USECASE_STATUSES as readonly string[]).includes(usecase.status)) {
      error(problems, 'STATUS_UNKNOWN', path, `Usecase ${usecase.usecaseId} status ${usecase.status || '(missing)'} is not a plan status.`);
      failed = true;
      continue;
    }
    if (usecase.status === 'toRemove') {
      normalizations.push({ code: 'OPERATION_REMOVED', path, detail: usecase.operation || '(missing)' });
      continue;
    }
    if (!(OPERATIONS as readonly string[]).includes(usecase.operation)) {
      error(problems, 'OPERATION_UNKNOWN', path, `Operation ${usecase.operation || '(missing)'} has no repository method.`);
      failed = true;
      continue;
    }
    selected.add(usecase.operation as Operation);
  }
  if (failed || blocked.has(entityId)) {
    blocked.add(entityId);
    return null;
  }
  if (selected.size === 0) {
    error(problems, 'METHODS_EMPTY', entityId, `Entity ${entityId} has no selected operation. No repository method was invented.`);
    blocked.add(entityId);
    return null;
  }
  return OPERATIONS.filter(operation => selected.has(operation)).map(operation => methodFor(entityId, operation));
}

function methodFor(entityId: string, operation: Operation): D1PortMethod {
  if (operation === 'list') return { name: 'list', params: [`${entityId}Filter`], returns: `${entityId}[]` };
  if (operation === 'transition') return { name: 'transition', params: [entityId, 'transitionId'], returns: entityId };
  if (operation === 'delete') return { name: 'delete', params: ['id'], returns: 'void' };
  return { name: operation, params: [entityId], returns: entityId };
}

function bindingsFor(
  entityId: string,
  leaves: Leaf[],
  primaryKey: string[],
  uniqueKeys: string[][],
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
  blocked: Set<string>,
): D1ColumnBinding[] | null {
  const columnPaths = new Set<string>(primaryKey);
  for (const key of uniqueKeys) {
    for (const field of key) {
      if (field.includes('.')) {
        error(problems, 'UNIQUE_KEY_NESTED', `${entityId}.uniqueKeys`, `Unique key field ${field} is nested. It was not promoted to a column.`);
        blocked.add(entityId);
        continue;
      }
      columnPaths.add(field);
    }
  }
  for (const leaf of leaves) {
    if (leaf.indexed && !leaf.path.includes('.')) columnPaths.add(leaf.path);
  }
  if (blocked.has(entityId)) return null;
  const bindings: D1ColumnBinding[] = [];
  for (const leaf of leaves) {
    const placement = columnPaths.has(leaf.path) ? 'column' as const : 'json' as const;
    if (placement === 'column' && leaf.path === D1_DETAILS_COLUMN) {
      error(problems, 'COLUMN_COLLISION', `${entityId}.${leaf.path}`, `Field ${leaf.path} would use the details column name. It was not renamed.`);
      blocked.add(entityId);
      continue;
    }
    bindings.push({
      field: leaf.path,
      column: columnForField(leaf.path, placement),
      nullable: !leaf.required,
      placement,
    });
    if (leaf.path === 'version') {
      normalizations.push({
        code: placement === 'json' ? 'VERSION_IN_DETAILS' : 'VERSION_COLUMN',
        path: `${entityId}.version`,
        detail: placement === 'json'
          ? 'Row version stays the logical field version inside details JSON. It is not the table schema version and it was not renamed.'
          : 'Row version stays the logical column version. It was not renamed.',
      });
    }
  }
  for (const field of columnPaths) {
    if (!leaves.some(leaf => leaf.path === field)) {
      error(problems, 'UNIQUE_KEY_FIELD', `${entityId}.${field}`, `Key field ${field} is not a field of ${entityId}.`);
      blocked.add(entityId);
    }
  }
  const issues = bindingRoundTripIssues(bindings);
  for (const issue of issues) error(problems, 'ROUND_TRIP', entityId, issue);
  return blocked.has(entityId) || issues.length > 0 ? null : bindings;
}

function indexesFor(
  physical: string,
  uniqueKeys: string[][],
  leaves: Leaf[],
  primaryKey: string[],
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
): Array<{ name: string; columns: string[]; unique: boolean }> {
  const indexes: Array<{ name: string; columns: string[]; unique: boolean }> = [];
  const add = (columns: string[], unique: boolean) => {
    const name = `${physical}_${columns.join('_')}`;
    if (indexes.some(index => index.name === name)) {
      error(problems, 'NAME_COLLISION', name, `Index ${name} is declared more than once.`);
      return;
    }
    indexes.push({ name, columns: [...columns], unique });
  };
  for (const key of uniqueKeys) add(key, true);
  for (const leaf of leaves) {
    if (!leaf.indexed) continue;
    if (primaryKey.length === 1 && primaryKey[0] === leaf.path) {
      normalizations.push({ code: 'PK_INDEX_OMITTED', path: leaf.path, detail: 'The primary key is not repeated as a secondary index.' });
      continue;
    }
    if (indexes.some(index => index.columns.length === 1 && index.columns[0] === leaf.path)) continue;
    add([leaf.path], false);
  }
  return indexes;
}

function preservedPortIssues(
  request: D1PersistenceRequest,
  file: D1PersistenceFile,
  portId: string,
  methods: D1PortMethod[],
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
): boolean {
  if (file.action !== 'preserve') return false;
  const existing = request.preservedPorts[file.defPath];
  const found = readPortMethods(existing);
  if (!found) {
    error(problems, 'PORT_BYTES_MISSING', file.defPath, `Preserved port ${portId} has no readable methods. The file was not rewritten.`);
    return true;
  }
  let incompatible = false;
  for (const method of methods) {
    const prior = found.find(item => item.name === method.name);
    if (!prior) {
      error(problems, 'PORT_INCOMPATIBLE', file.defPath, `Preserved port ${portId} does not implement ${method.name}.`);
      incompatible = true;
      continue;
    }
    if (JSON.stringify(prior.params) !== JSON.stringify(method.params) || prior.returns !== method.returns) {
      error(problems, 'PORT_INCOMPATIBLE', file.defPath, `Preserved port ${portId} method ${method.name} does not match the planned signature.`);
      incompatible = true;
    }
  }
  for (const prior of found) {
    if (!methods.some(method => method.name === prior.name)) {
      normalizations.push({ code: 'PORT_METHOD_KEPT', path: file.defPath, detail: prior.name });
    }
  }
  return incompatible;
}

function readPortMethods(value: unknown): D1PortMethod[] | null {
  if (!isRecord(value) || value.unreadable === true) return null;
  const data = isRecord(value.data) ? value.data : value;
  if (!isRecord(data) || !Array.isArray(data.methods)) return null;
  const methods: D1PortMethod[] = [];
  for (const method of data.methods) {
    if (!isRecord(method) || !text(method.name) || !text(method.returns) || !Array.isArray(method.params)) return null;
    const params = method.params.map(item => text(item));
    if (params.some(item => !item)) return null;
    methods.push({ name: text(method.name), params, returns: text(method.returns) });
  }
  return methods;
}

function definitionFor(
  request: D1PersistenceRequest,
  artifactType: 'repositoryPort' | 'table' | 'repositoryAdapter',
  artifactId: string,
  data: Record<string, unknown>,
): D1Definition {
  return pendingDefinition(artifactType, artifactId, request.moduleName, data);
}

function refuseDefinition(
  definition: D1Definition,
  defPath: string,
  problems: D1PersistenceProblem[],
  blocked: Set<string>,
  entityId: string,
): void {
  const issues = definitionIssues(definition);
  if (issues.length === 0) return;
  error(problems, 'DEFINITION', defPath, issues[0]);
  blocked.add(entityId);
}

function noteAction(file: D1PersistenceFile, preserved: string[], removed: string[]): void {
  if (file.action === 'preserve') preserved.push(file.defPath);
  if (file.action === 'remove') removed.push(file.defPath);
}

function portPipeline(
  request: D1PersistenceRequest,
  portId: string,
  entityId: string,
  domain: D1DomainEntityPlan,
  defPath: string,
): D1PipelineItem {
  const qualified = qualifyDefPath(request.project, defPath);
  return {
    id: pipelineId(request.project, request.moduleName, 'repositoryPort', portId),
    type: 'repositoryPort',
    defPath: qualified,
    outputPath: futureOutputPath(qualified),
    outputAvailability: 'future',
    dependsFiles: [qualifyDefPath(request.project, domain.defPath)].filter(Boolean),
    dependsOn: [pipelineId(request.project, request.moduleName, 'domainEntity', entityId)],
    skills: skillPaths('repositoryPort'),
  };
}

/** A port file must not depend on an adapter. The check is the application side of the hexagon. */
export function applicationAdapterIssues(item: D1PipelineItem): string[] {
  if (item.type !== 'repositoryPort') return [];
  const issues: string[] = [];
  for (const dep of item.dependsOn) {
    if (dep.includes('/repositoryAdapter/')) issues.push(`Application depends on adapter ${dep}.`);
  }
  for (const file of item.dependsFiles) {
    if (file.includes('/adapters/') || file.includes('RepositoryAdapter')) {
      issues.push(`Application file depends on adapter ${file}.`);
    }
  }
  return issues;
}

function emitParts(
  request: D1PersistenceRequest,
  ports: D1PersistencePortPlan[],
  tables: D1PersistenceTablePlan[],
  adapters: D1PersistenceAdapterPlan[],
  problems: D1PersistenceProblem[],
): D1PersistenceEmit[] {
  const out: D1PersistenceEmit[] = [];
  for (const plan of ports) {
    if (!plan.definition || !WRITE_ACTIONS.has(plan.action)) continue;
    const domain = request.domain.entities.find(item => item.entityId === plan.entityId);
    if (!domain) continue;
    const pipeline = portPipeline(request, plan.portId, plan.entityId, domain, plan.defPath);
    pushEmit(out, plan.definition, pipeline, plan.defPath, problems);
  }
  for (const plan of tables) {
    if (!plan.definition || !WRITE_ACTIONS.has(plan.action)) continue;
    const qualified = qualifyDefPath(request.project, plan.defPath);
    const pipeline: D1PipelineItem = {
      id: pipelineId(request.project, request.moduleName, 'table', plan.tableId),
      type: 'table',
      defPath: qualified,
      outputPath: futureOutputPath(qualified),
      outputAvailability: 'future',
      dependsFiles: [qualifyDefPath(request.project, domainDef(request, plan.entityId))].filter(Boolean),
      dependsOn: [pipelineId(request.project, request.moduleName, 'domainEntity', plan.entityId)],
      skills: skillPaths('table'),
    };
    pushEmit(out, plan.definition, pipeline, plan.defPath, problems);
  }
  for (const plan of adapters) {
    if (!plan.definition || !WRITE_ACTIONS.has(plan.action)) continue;
    const port = ports.find(item => item.portId === plan.portId);
    const table = tables.find(item => item.tableId === plan.tableId);
    if (!port || !table) continue;
    const qualified = qualifyDefPath(request.project, plan.defPath);
    const dependsOn = [
      pipelineId(request.project, request.moduleName, 'repositoryPort', plan.portId),
      pipelineId(request.project, request.moduleName, 'table', plan.tableId),
    ].sort();
    const pipeline: D1PipelineItem = {
      id: pipelineId(request.project, request.moduleName, 'repositoryAdapter', plan.portId),
      type: 'repositoryAdapter',
      defPath: qualified,
      outputPath: futureOutputPath(qualified),
      outputAvailability: 'future',
      dependsFiles: [qualifyDefPath(request.project, port.defPath), qualifyDefPath(request.project, table.defPath)].sort(),
      dependsOn,
      skills: skillPaths('repositoryAdapter'),
    };
    pushEmit(out, plan.definition, pipeline, plan.defPath, problems);
  }
  return out;
}

function domainDef(request: D1PersistenceRequest, entityId: string): string {
  return request.domain.entities.find(item => item.entityId === entityId)?.defPath || '';
}

function pushEmit(
  out: D1PersistenceEmit[],
  definition: D1Definition,
  pipeline: D1PipelineItem,
  defPath: string,
  problems: D1PersistenceProblem[],
): void {
  const stamped = stampDefinition(definition, pipeline.defPath, pipeline.dependsFiles);
  const rendered = renderDefinition(stamped, pipeline.defPath);
  if ('issues' in rendered) {
    error(problems, 'DEFINITION', defPath, rendered.issues[0] || 'Definition did not render.');
    return;
  }
  out.push({ definition: stamped, pipeline: [pipeline] });
}

function sourceOf(body: unknown): string {
  return isRecord(body) ? text(body.source) : '';
}

function finish(
  request: D1PersistenceRequest,
  ok: boolean,
  enumerations: D1UnconsumedEnumeration[],
  uniqueKeys: D1UniqueKeyUse[],
  ports: D1PersistencePortPlan[],
  tables: D1PersistenceTablePlan[],
  adapters: D1PersistenceAdapterPlan[],
  problems: D1PersistenceProblem[],
  normalizations: D1PersistenceNormalization[],
  preserved: string[],
  removed: string[],
  emit: D1PersistenceEmit[] = [],
): D1PersistenceBuild {
  if (!normalizations.some(item => item.code === 'ENUMERATIONS_NOT_CONSUMED')) {
    normalizations.push({
      code: 'ENUMERATIONS_NOT_CONSUMED',
      path: 'domain30.enumerations',
      detail: enumerations.length
        ? `${enumerations.length} enum values stay on the domain draft. persistence40 does not copy them.`
        : 'The domain draft has no enumerations. persistence40 did not invent any.',
    });
  }
  sortInPlace(enumerations, item => `${item.entityId}\u0000${item.path}`);
  sortInPlace(uniqueKeys, item => `${item.entityId}\u0000${item.tableId || ''}`);
  sortInPlace(problems, item => `${item.path}\u0000${item.code}\u0000${item.message}`);
  sortInPlace(normalizations, item => `${item.path}\u0000${item.code}\u0000${item.detail}`);
  ports.sort((left, right) => left.portId.localeCompare(right.portId));
  tables.sort((left, right) => left.tableId.localeCompare(right.tableId));
  adapters.sort((left, right) => left.portId.localeCompare(right.portId));
  preserved.sort();
  removed.sort();
  emit.sort((left, right) => (left.pipeline[0]?.defPath || '').localeCompare(right.pipeline[0]?.defPath || ''));
  return {
    schemaVersion: D1_PERSISTENCE_VERSION,
    project: request.project,
    moduleName: request.moduleName,
    llmCalls: 0,
    ok,
    enumerations,
    uniqueKeys,
    ports,
    tables,
    adapters,
    problems,
    normalizations,
    preserved,
    removed,
    emit: ok ? emit : [],
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function error(problems: D1PersistenceProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.severity === 'error' && problem.code === code && problem.path === path && problem.message === message)) return;
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1PersistenceProblem[], code: string, path: string, message: string): void {
  if (problems.some(problem => problem.code === code && problem.path === path)) return;
  problems.push({ severity: 'review', code, path, message });
}

function sortInPlace<T>(items: T[], key: (item: T) => string): void {
  items.sort((left, right) => key(left).localeCompare(key(right)));
}
