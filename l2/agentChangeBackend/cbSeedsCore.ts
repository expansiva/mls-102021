/// <mls fileReference="_102021_/l2/agentChangeBackend/cbSeedsCore.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure seed-plan compiler. The LLM may choose a useful business scenario, but it never writes
// TypeScript: this module validates its JSON plan, resolves symbolic references to stable UUIDs
// and emits the runtime-discoverable TableSeedRows source.

export const SEED_T0 = '2026-07-01T08:00:00.000Z';
export const SEED_T1 = '2026-07-01T09:00:00.000Z';
export const SEED_PLAN_START = '/* <agentCbSeedsPlan>';
export const SEED_PLAN_END = '</agentCbSeedsPlan> */';

export interface SeedFieldDefinition {
  fieldId: string;
  type: string;
  required: boolean;
  enumValues: string[];
}

export interface SeedEntityDefinition {
  entityId: string;
  title: string;
  kind: string;
  fields: SeedFieldDefinition[];
}

export interface SeedTableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

export interface SeedTableDefinition {
  tableId: string;
  tableName: string;
  seedFor: string;
  columns: SeedTableColumn[];
  primaryKey: string[];
}

export interface SeedReference {
  ref: string;
}

export type SeedValue = string | number | boolean | null | SeedReference;

export interface SeedFieldValue {
  name: string;
  value: SeedValue;
}

export interface SeedChildRow {
  key: string;
  fields: SeedFieldValue[];
}

export interface SeedChildCollection {
  name: string;
  rows: SeedChildRow[];
}

export interface SeedLocalRow {
  key: string;
  columns: SeedFieldValue[];
  details: SeedFieldValue[];
  children: SeedChildCollection[];
}

export interface SeedLocalTable {
  tableId: string;
  rows: SeedLocalRow[];
}

export interface SeedMdmRelationship {
  targetRef: string;
  type: string;
  metadata: SeedFieldValue[];
  isBidirectional: boolean;
}

export interface SeedMdmRow {
  key: string;
  fields: SeedFieldValue[];
  relationships: SeedMdmRelationship[];
}

export interface SeedMdmEntity {
  entityId: string;
  rows: SeedMdmRow[];
}

export interface SeedPlan {
  summary: string;
  localTables: SeedLocalTable[];
  mdmEntities: SeedMdmEntity[];
}

export interface SeedBuildInput {
  project: number;
  moduleName: string;
  language: string;
  entities: SeedEntityDefinition[];
  tablePlans: SeedTableDefinition[];
  ruleIds: string[];
  plan: SeedPlan;
}

export interface SeedBuildResult {
  errors: string[];
  content?: string;
  summary: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isSeedReference(value: unknown): value is SeedReference {
  return isRecord(value) && typeof value.ref === 'string' && Object.keys(value).length === 1;
}

function isSeedValue(value: unknown): value is SeedValue {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isSeedReference(value);
}

function parseFields(value: unknown): SeedFieldValue[] {
  return arrayValue(value).map((item): SeedFieldValue => {
    const record = isRecord(item) ? item : {};
    return { name: stringValue(record.name), value: isSeedValue(record.value) ? record.value : '' };
  });
}

function parseChildren(value: unknown): SeedChildCollection[] {
  return arrayValue(value).map((item): SeedChildCollection => {
    const record = isRecord(item) ? item : {};
    return {
      name: stringValue(record.name),
      rows: arrayValue(record.rows).map((row): SeedChildRow => {
        const parsed = isRecord(row) ? row : {};
        return { key: stringValue(parsed.key), fields: parseFields(parsed.fields) };
      }),
    };
  });
}

function parsePlanRows(value: unknown): SeedLocalRow[] {
  return arrayValue(value).map((item): SeedLocalRow => {
    const record = isRecord(item) ? item : {};
    return {
      key: stringValue(record.key),
      columns: parseFields(record.columns),
      details: parseFields(record.details),
      children: parseChildren(record.children),
    };
  });
}

/** Turns a tool-call result into a defensive internal representation. Validation below remains the
 * authority: malformed values become empty and produce objective findings instead of being trusted. */
export function parseSeedPlan(value: unknown): SeedPlan {
  const record = isRecord(value) ? value : {};
  return {
    summary: stringValue(record.summary),
    localTables: arrayValue(record.localTables).map((item): SeedLocalTable => {
      const parsed = isRecord(item) ? item : {};
      return { tableId: stringValue(parsed.tableId), rows: parsePlanRows(parsed.rows) };
    }),
    mdmEntities: arrayValue(record.mdmEntities).map((item): SeedMdmEntity => {
      const parsed = isRecord(item) ? item : {};
      return {
        entityId: stringValue(parsed.entityId),
        rows: arrayValue(parsed.rows).map((row): SeedMdmRow => {
          const rowRecord = isRecord(row) ? row : {};
          return {
            key: stringValue(rowRecord.key),
            fields: parseFields(rowRecord.fields),
            relationships: arrayValue(rowRecord.relationships).map((relationship): SeedMdmRelationship => {
              const relationshipRecord = isRecord(relationship) ? relationship : {};
              return {
                targetRef: stringValue(relationshipRecord.targetRef),
                type: stringValue(relationshipRecord.type),
                metadata: parseFields(relationshipRecord.metadata),
                isBidirectional: relationshipRecord.isBidirectional === true,
              };
            }),
          };
        }),
      };
    }),
  };
}

/** Reads the persisted plan embedded in seeds.ts. A valid plan is reused so materializing the same
 * L4/table input never asks the model for a different fixture mass. */
export function extractSeedPlanFromSource(source: string): SeedPlan | null {
  const start = source.indexOf(SEED_PLAN_START);
  const end = source.indexOf(SEED_PLAN_END);
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const raw = source.slice(start + SEED_PLAN_START.length, end).trim();
    const envelope = JSON.parse(raw) as UnknownRecord;
    return isRecord(envelope.plan) ? parseSeedPlan(envelope.plan) : null;
  } catch {
    return null;
  }
}

function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function toCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_all, char: string) => char.toUpperCase());
}

function hashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableUuid(input: string): string {
  const parts = Array.from({ length: 5 }, (_, index) => hashHex(`${input}:${index}`)).join('');
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-4${parts.slice(13, 16)}-8${parts.slice(17, 20)}-${parts.slice(20, 32)}`;
}

function entityIdField(entity: SeedEntityDefinition): string {
  return entity.fields.find(field => field.fieldId.toLowerCase() === `${entity.entityId.toLowerCase()}id`)?.fieldId || `${entity.entityId.charAt(0).toLowerCase()}${entity.entityId.slice(1)}Id`;
}

function mdmSubtypeFor(entityId: string): string {
  const lower = entityId.toLowerCase();
  if (lower.includes('table') || lower.includes('location') || lower.includes('room')) return 'Location';
  if (lower.includes('customer') || lower.includes('person') || lower.includes('user')) return 'Person';
  if (lower.includes('company') || lower.includes('supplier') || lower.includes('vendor')) return 'Company';
  if (lower.includes('service')) return 'Service';
  if (lower.includes('asset') || lower.includes('equipment')) return 'AssetEquipment';
  return 'Product';
}

function countryCodeForLanguage(language: string): string {
  return language.toLowerCase().startsWith('pt') ? 'BR' : 'US';
}

function mapFields(fields: SeedFieldValue[], path: string, errors: string[]): Map<string, SeedValue> {
  const mapped = new Map<string, SeedValue>();
  for (const field of fields) {
    if (!field.name) {
      errors.push(`${path}: field name is required`);
      continue;
    }
    if (mapped.has(field.name)) {
      errors.push(`${path}: duplicated field '${field.name}'`);
      continue;
    }
    if (!isSeedValue(field.value)) {
      errors.push(`${path}.${field.name}: value must be a scalar, null, or { ref }`);
      continue;
    }
    mapped.set(field.name, field.value);
  }
  return mapped;
}

function collectReferences(plan: SeedPlan): Set<string> {
  const refs = new Set<string>();
  for (const table of plan.localTables) {
    for (const row of table.rows) refs.add(`local:${table.tableId}.${row.key}`);
  }
  for (const entity of plan.mdmEntities) {
    for (const row of entity.rows) refs.add(`mdm:${entity.entityId}.${row.key}`);
  }
  return refs;
}

function validateReference(value: SeedValue, path: string, references: Set<string>, errors: string[]) {
  if (!isSeedReference(value)) return;
  if (!/^(local|mdm):[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(value.ref)) {
    errors.push(`${path}: reference '${value.ref}' must use local:Entity.key or mdm:Entity.key`);
  } else if (!references.has(value.ref)) {
    errors.push(`${path}: unresolved reference '${value.ref}'`);
  }
}

function validateEnum(field: SeedFieldDefinition | undefined, value: SeedValue | undefined, path: string, errors: string[]) {
  if (!field?.enumValues.length || value === undefined) return;
  if (isSeedReference(value) || typeof value !== 'string' || !field.enumValues.includes(value)) {
    errors.push(`${path}: expected one of ${field.enumValues.join(', ')}`);
  }
}

function validateDeterministicDate(fieldName: string, value: SeedValue | undefined, path: string, errors: string[]) {
  if (value === undefined || value === null || !/(At|Date)$/u.test(fieldName)) return;
  if (typeof value !== 'string' || (value !== SEED_T0 && value !== SEED_T1)) {
    errors.push(`${path}: timestamps must use ${SEED_T0} or ${SEED_T1}`);
  }
}

function hasKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_-]*$/u.test(value);
}

function valueAt(row: SeedLocalRow, name: string): SeedValue | undefined {
  return [...row.columns, ...row.details].find(field => field.name === name)?.value;
}

function hasNonNullValue(row: SeedLocalRow, name: string): boolean {
  const value = valueAt(row, name);
  return value !== undefined && value !== null;
}

function validateScenarioInvariants(input: SeedBuildInput, errors: string[]) {
  const localById = new Map(input.plan.localTables.map(table => [table.tableId, table]));
  const ruleIds = new Set(input.ruleIds);
  const shifts = localById.get('Shift');
  if (ruleIds.has('singleOpenShift') && shifts) {
    const open = shifts.rows.filter(row => valueAt(row, 'status') === 'open');
    if (open.length > 1) errors.push('Shift: singleOpenShift requires at most one open seed row');
    for (const row of open) {
      for (const field of ['closedAt', 'closedBy', 'totalApurado']) {
        if (hasNonNullValue(row, field)) errors.push(`Shift.${row.key}: open shifts must not populate ${field}`);
      }
    }
  }

  const orders = localById.get('Order');
  if (ruleIds.has('orderStatusFlow') && orders) {
    const timestamps: Array<{ status: string; field: string }> = [
      { status: 'received', field: 'receivedAt' },
      { status: 'inPreparation', field: 'inPreparationAt' },
      { status: 'ready', field: 'readyAt' },
      { status: 'delivered', field: 'deliveredAt' },
    ];
    const statusOrder = ['registered', 'received', 'inPreparation', 'ready', 'delivered'];
    for (const row of orders.rows) {
      const status = valueAt(row, 'status');
      const statusIndex = typeof status === 'string' ? statusOrder.indexOf(status) : -1;
      if (statusIndex === -1) continue;
      for (let index = 0; index < timestamps.length; index++) {
        const required = statusIndex >= index + 1;
        const present = hasNonNullValue(row, timestamps[index].field);
        if (required !== present) {
          errors.push(`Order.${row.key}: ${timestamps[index].field} must ${required ? '' : 'not '}be populated for status '${status}'`);
        }
      }
    }
  }

  for (const entityId of ['StockConsumption', 'StockAdjustment']) {
    const table = localById.get(entityId);
    if (!table) continue;
    for (const row of table.rows) {
      if (valueAt(row, 'status') !== 'voided' && (hasNonNullValue(row, 'voidedAt') || hasNonNullValue(row, 'voidReason') || hasNonNullValue(row, 'voidedReason'))) {
        errors.push(`${entityId}.${row.key}: non-voided rows must not populate void fields`);
      }
    }
  }

  if (ruleIds.has('menuItemRequiresIngredient')) {
    const menuItems = input.plan.mdmEntities.find(entity => entity.entityId === 'MenuItem');
    for (const row of menuItems?.rows ?? []) {
      const status = row.fields.find(field => field.name === 'status')?.value;
      if (status === 'active' && !row.relationships.some(relationship => relationship.type === 'requires-ingredient')) {
        errors.push(`MenuItem.${row.key}: active items require a requires-ingredient MDM relationship`);
      }
    }
  }
}

/** Deterministic validation of the plan before any seed source is saved. */
export function validateSeedPlan(input: SeedBuildInput): string[] {
  const errors: string[] = [];
  const tableById = new Map(input.tablePlans.map(table => [table.tableId, table]));
  const entityById = new Map(input.entities.map(entity => [entity.entityId, entity]));
  const references = collectReferences(input.plan);
  const seenLocalTables = new Set<string>();
  const seenMdmEntities = new Set<string>();

  if (!input.plan.summary.trim()) errors.push('plan.summary is required');

  for (const table of input.plan.localTables) {
    const path = `localTables.${table.tableId || '<missing>'}`;
    const definition = tableById.get(table.tableId);
    if (!definition) {
      errors.push(`${path}: unknown tableId`);
      continue;
    }
    if (seenLocalTables.has(table.tableId)) errors.push(`${path}: duplicated table plan`);
    seenLocalTables.add(table.tableId);
    if (!table.rows.length) errors.push(`${path}: at least one row is required`);
    const keys = new Set<string>();
    const entity = entityById.get(table.tableId);
    const entityFields = new Map((entity?.fields ?? []).map(field => [field.fieldId, field]));
    const columnNames = new Set(definition.columns.map(column => column.name));

    for (const row of table.rows) {
      const rowPath = `${path}.${row.key || '<missing>'}`;
      if (!hasKey(row.key)) errors.push(`${rowPath}: key must be a stable identifier`);
      if (keys.has(row.key)) errors.push(`${rowPath}: duplicate key`);
      keys.add(row.key);
      const columns = mapFields(row.columns, `${rowPath}.columns`, errors);
      const details = mapFields(row.details, `${rowPath}.details`, errors);
      for (const name of columns.keys()) {
        if (name === 'details' || !columnNames.has(name)) errors.push(`${rowPath}.columns.${name}: unknown persistence column`);
      }
      for (const name of details.keys()) {
        if (name !== 'label' && !entityFields.has(name)) errors.push(`${rowPath}.details.${name}: unknown entity field`);
      }
      for (const column of definition.columns) {
        if (definition.primaryKey.includes(column.name)) continue; // generated from tableId + row key
        if (column.name === 'details') {
          if (!column.nullable && details.size === 0 && row.children.length === 0) errors.push(`${rowPath}: details are required`);
          continue;
        }
        const value = columns.get(column.name);
        if (!column.nullable && value === undefined) errors.push(`${rowPath}.columns.${column.name}: required column missing`);
        validateReference(value as SeedValue, `${rowPath}.columns.${column.name}`, references, errors);
        validateDeterministicDate(toCamel(column.name), value, `${rowPath}.columns.${column.name}`, errors);
        validateEnum(entityFields.get(toCamel(column.name)), value, `${rowPath}.columns.${column.name}`, errors);
        if (column.name.endsWith('_id') && !definition.primaryKey.includes(column.name) && value !== undefined && !isSeedReference(value)) {
          errors.push(`${rowPath}.columns.${column.name}: foreign keys must use a symbolic { ref }`);
        }
      }
      for (const field of entity?.fields ?? []) {
        const mappedColumn = toSnake(field.fieldId);
        const storedAsColumn = columnNames.has(mappedColumn);
        const generatedPrimaryKey = definition.primaryKey.includes(mappedColumn);
        const value = storedAsColumn ? columns.get(mappedColumn) : details.get(field.fieldId);
        if (field.required && !generatedPrimaryKey && value === undefined) errors.push(`${rowPath}: required field '${field.fieldId}' missing`);
        validateReference(value as SeedValue, `${rowPath}.${field.fieldId}`, references, errors);
        validateDeterministicDate(field.fieldId, value, `${rowPath}.${field.fieldId}`, errors);
        validateEnum(field, value, `${rowPath}.${field.fieldId}`, errors);
        if (field.fieldId.endsWith('Id') && !generatedPrimaryKey && value !== undefined && !isSeedReference(value)) {
          errors.push(`${rowPath}.${field.fieldId}: entity references must use a symbolic { ref }`);
        }
      }
      for (const child of row.children) {
        if (!hasKey(child.name)) errors.push(`${rowPath}.children: child collection name must be a stable identifier`);
        const childKeys = new Set<string>();
        for (const childRow of child.rows) {
          if (!hasKey(childRow.key)) errors.push(`${rowPath}.children.${child.name}: child row key must be a stable identifier`);
          if (childKeys.has(childRow.key)) errors.push(`${rowPath}.children.${child.name}.${childRow.key}: duplicate child key`);
          childKeys.add(childRow.key);
          const fields = mapFields(childRow.fields, `${rowPath}.children.${child.name}.${childRow.key}`, errors);
          for (const [name, value] of fields) {
            validateReference(value, `${rowPath}.children.${child.name}.${childRow.key}.${name}`, references, errors);
            validateDeterministicDate(name, value, `${rowPath}.children.${child.name}.${childRow.key}.${name}`, errors);
          }
        }
      }
    }
  }

  for (const table of input.tablePlans) {
    if (!seenLocalTables.has(table.tableId)) errors.push(`localTables: missing plan for persistence table '${table.tableId}'`);
  }

  for (const mdmEntity of input.plan.mdmEntities) {
    const path = `mdmEntities.${mdmEntity.entityId || '<missing>'}`;
    const definition = entityById.get(mdmEntity.entityId);
    if (!definition || definition.kind !== 'mdm') {
      errors.push(`${path}: unknown or non-MDM entity`);
      continue;
    }
    if (seenMdmEntities.has(mdmEntity.entityId)) errors.push(`${path}: duplicated MDM entity plan`);
    seenMdmEntities.add(mdmEntity.entityId);
    if (!mdmEntity.rows.length) errors.push(`${path}: at least one row is required`);
    const fieldsById = new Map(definition.fields.map(field => [field.fieldId, field]));
    const keys = new Set<string>();
    for (const row of mdmEntity.rows) {
      const rowPath = `${path}.${row.key || '<missing>'}`;
      if (!hasKey(row.key)) errors.push(`${rowPath}: key must be a stable identifier`);
      if (keys.has(row.key)) errors.push(`${rowPath}: duplicate key`);
      keys.add(row.key);
      const fields = mapFields(row.fields, `${rowPath}.fields`, errors);
      for (const [name, value] of fields) {
        const field = fieldsById.get(name);
        if (!field) errors.push(`${rowPath}.fields.${name}: unknown MDM entity field`);
        validateReference(value, `${rowPath}.fields.${name}`, references, errors);
        validateDeterministicDate(name, value, `${rowPath}.fields.${name}`, errors);
        validateEnum(field, value, `${rowPath}.fields.${name}`, errors);
      }
      for (const field of definition.fields) {
        const automaticId = field.fieldId === entityIdField(definition);
        if (field.required && !automaticId && fields.get(field.fieldId) === undefined) errors.push(`${rowPath}: required field '${field.fieldId}' missing`);
        const value = fields.get(field.fieldId);
        if (field.fieldId.endsWith('Id') && !automaticId && value !== undefined && !isSeedReference(value)) {
          errors.push(`${rowPath}.${field.fieldId}: MDM references must use a symbolic { ref }`);
        }
      }
      const name = fields.get('name');
      if (typeof name !== 'string' || !name.trim()) errors.push(`${rowPath}: MDM rows require a readable name`);
      for (const relationship of row.relationships) {
        const relationshipPath = `${rowPath}.relationships.${relationship.type || '<missing>'}`;
        if (!relationship.type.trim()) errors.push(`${relationshipPath}: type is required`);
        if (!/^mdm:[A-Za-z][A-Za-z0-9_]*\.[A-Za-z][A-Za-z0-9_-]*$/u.test(relationship.targetRef) || !references.has(relationship.targetRef)) {
          errors.push(`${relationshipPath}: targetRef '${relationship.targetRef}' must resolve to an MDM row`);
        }
        const metadata = mapFields(relationship.metadata, `${relationshipPath}.metadata`, errors);
        for (const [name, value] of metadata) validateReference(value, `${relationshipPath}.metadata.${name}`, references, errors);
      }
    }
  }

  for (const entity of input.entities.filter(entity => entity.kind === 'mdm')) {
    if (!seenMdmEntities.has(entity.entityId)) errors.push(`mdmEntities: missing plan for '${entity.entityId}'`);
  }
  validateScenarioInvariants(input, errors);
  return [...new Set(errors)];
}

function resolveValue(value: SeedValue, ids: Map<string, string>): unknown {
  if (!isSeedReference(value)) return value;
  return ids.get(value.ref) ?? value.ref;
}

function resolveFields(fields: SeedFieldValue[], ids: Map<string, string>): Record<string, unknown> {
  return Object.fromEntries(fields.map(field => [field.name, resolveValue(field.value, ids)]));
}

function planMap<T extends { tableId?: string; entityId?: string }>(items: T[], key: 'tableId' | 'entityId'): Map<string, T> {
  return new Map(items.map(item => [String(item[key] || ''), item]));
}

function idMap(input: SeedBuildInput): Map<string, string> {
  const ids = new Map<string, string>();
  for (const table of input.plan.localTables) {
    for (const row of table.rows) ids.set(`local:${table.tableId}.${row.key}`, stableUuid(`${input.moduleName}:local:${table.tableId}:${row.key}`));
  }
  for (const entity of input.plan.mdmEntities) {
    for (const row of entity.rows) ids.set(`mdm:${entity.entityId}.${row.key}`, stableUuid(`${input.moduleName}:mdm:${entity.entityId}:${row.key}`));
  }
  return ids;
}

function buildLocalRows(input: SeedBuildInput, ids: Map<string, string>): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const plannedTables = planMap(input.plan.localTables, 'tableId');
  return input.tablePlans.map((table) => {
    const planned = plannedTables.get(table.tableId)!;
    return {
      exportName: `${table.tableId.charAt(0).toLowerCase()}${table.tableId.slice(1)}Seeds`,
      seedFor: table.seedFor,
      rows: planned.rows.map((row) => {
        const columns = resolveFields(row.columns, ids);
        const details = resolveFields(row.details, ids);
        for (const child of row.children) {
          details[child.name] = child.rows.map(childRow => resolveFields(childRow.fields, ids));
        }
        const out: Record<string, unknown> = {};
        for (const column of table.columns) {
          if (table.primaryKey.includes(column.name)) {
            out[column.name] = table.primaryKey.length === 1
              ? ids.get(`local:${table.tableId}.${row.key}`)
              : stableUuid(`${input.moduleName}:local:${table.tableId}:${row.key}:${column.name}`);
          } else if (column.name === 'details') {
            if (Object.keys(details).length) out.details = details;
          } else {
            out[column.name] = columns[column.name];
          }
        }
        return out;
      }),
    };
  });
}

function buildMdmRows(input: SeedBuildInput, ids: Map<string, string>): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const plannedEntities = planMap(input.plan.mdmEntities, 'entityId');
  const indexRows: Record<string, unknown>[] = [];
  const documentRows: Record<string, unknown>[] = [];
  const relationshipRows: Record<string, unknown>[] = [];
  for (const entity of input.entities.filter(entity => entity.kind === 'mdm')) {
    const planned = plannedEntities.get(entity.entityId)!;
    const idField = entityIdField(entity);
    for (const row of planned.rows) {
      const mdmId = ids.get(`mdm:${entity.entityId}.${row.key}`)!;
      const fields = resolveFields(row.fields, ids);
      fields[idField] = mdmId;
      const name = String(fields.name);
      const subtype = mdmSubtypeFor(entity.entityId);
      indexRows.push({
        mdmId, subtype, name, status: 'Active', docType: null, docId: null,
        countryCode: countryCodeForLanguage(input.language), tags: [input.moduleName, entity.entityId],
        searchVector: `${name} ${entity.entityId} ${input.moduleName}`.toLowerCase(), mergedInto: null,
        dynamoPk: mdmId, createdAt: fields.createdAt, updatedAt: fields.updatedAt,
      });
      const details: Record<string, unknown> = {
        mdmId, subtype, name, status: 'Active', docType: null, docId: null,
        countryCode: countryCodeForLanguage(input.language), tags: [input.moduleName, entity.entityId],
        aliases: [], contacts: [], relationshipRefs: {}, addresses: [], mergedInto: null,
        createdAt: fields.createdAt, updatedAt: fields.updatedAt, [input.moduleName]: fields,
      };
      if (subtype === 'Location') details.locationType = 'DiningArea';
      if (subtype === 'Company') {
        details.companyKind = 'LegalEntity';
        details.legalName = name;
      }
      documentRows.push({ mdmId, version: 1, details });
      for (const relationship of row.relationships) {
        relationshipRows.push({
          id: stableUuid(`${input.moduleName}:relationship:${entity.entityId}:${row.key}:${relationship.type}:${relationship.targetRef}`),
          fromId: mdmId,
          toId: ids.get(relationship.targetRef),
          type: relationship.type,
          role: null,
          metadata: resolveFields(relationship.metadata, ids),
          isBidirectional: relationship.isBidirectional,
          validFrom: SEED_T0,
          validTo: null,
          status: 'Active',
          createdAt: fields.createdAt,
          updatedAt: fields.updatedAt,
        });
      }
    }
  }
  return [
    { exportName: 'mdmEntityIndexSeeds', seedFor: 'mdmEntityIndex', rows: indexRows },
    { exportName: 'mdmDocumentSeeds', seedFor: 'mdmDocumentCache', rows: documentRows },
    { exportName: 'mdmRelationshipSeeds', seedFor: 'mdmRelationship', rows: relationshipRows },
  ].filter(block => block.rows.length > 0);
}

/** Compile a validated plan. IDs, relationship IDs and structural MDM records are always generated
 * locally; only the business scenario itself comes from the LLM plan. */
export function buildSeedSource(input: SeedBuildInput): SeedBuildResult {
  const errors = validateSeedPlan(input);
  const localSummary = input.plan.localTables.map(table => `${table.tableId}=${table.rows.length}`).join(', ');
  const mdmSummary = input.plan.mdmEntities.map(entity => `${entity.entityId}=${entity.rows.length}`).join(', ');
  const summary = `local [${localSummary || 'none'}]; MDM [${mdmSummary || 'none'}]`;
  if (errors.length) return { errors, summary };
  const ids = idMap(input);
  const blocks = [...buildLocalRows(input, ids), ...buildMdmRows(input, ids)];
  const planEnvelope = { version: 1, moduleName: input.moduleName, language: input.language, plan: input.plan };
  const lines = [
    `/// <mls fileReference="_${input.project}_/l1/${input.moduleName}/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>`,
    '',
    `// Deterministic initial data for ${input.moduleName}. Scenario planned by agentCbSeeds; rows and ids compiled locally.`,
    '// TableSeedRows exports are discovered by shape and merged by the persistence registry.',
    '',
    SEED_PLAN_START,
    JSON.stringify(planEnvelope, null, 2),
    SEED_PLAN_END,
    '',
    `import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';`,
    '',
    ...blocks.flatMap(block => [
      `export const ${block.exportName}: TableSeedRows = ${JSON.stringify({ seedFor: block.seedFor, rows: block.rows }, null, 2)};`,
      '',
    ]),
  ];
  return { errors: [], content: lines.join('\n'), summary };
}

export function seedPlanPromptContext(input: Omit<SeedBuildInput, 'plan'>, repairFindings: string[] = []): string {
  const entities = input.entities.map(entity => ({
    entityId: entity.entityId,
    title: entity.title,
    kind: entity.kind,
    fields: entity.fields.map(field => ({ fieldId: field.fieldId, type: field.type, required: field.required, enum: field.enumValues })),
  }));
  const tables = input.tablePlans.map(table => ({
    tableId: table.tableId,
    seedFor: table.seedFor,
    primaryKey: table.primaryKey,
    columns: table.columns,
  }));
  return [
    `## Module and language\n${JSON.stringify({ moduleName: input.moduleName, language: input.language, timestamps: [SEED_T0, SEED_T1] })}`,
    `## Entities from L4\n${JSON.stringify(entities, null, 2)}`,
    `## Local persistence tables\n${JSON.stringify(tables, null, 2)}`,
    `## L4 rules that the scenario must satisfy\n${JSON.stringify(input.ruleIds)}`,
    '## Symbolic references\nUse only { "ref": "local:TableId.rowKey" } or { "ref": "mdm:EntityId.rowKey" } for foreign keys. Never emit UUIDs.',
    '## Required result\nPlan every local table and every MDM entity. Use readable labels in the requested language. Choose a small but useful scenario that makes primary list/query operations and the main workflow usable. Use only the two supplied timestamps. Active MDM MenuItems that require ingredients must include a requires-ingredient relationship with quantityPerServing metadata.',
    ...(repairFindings.length ? [`## Repair findings from the prior plan\n${repairFindings.join('\n')}`] : []),
  ].join('\n\n');
}
