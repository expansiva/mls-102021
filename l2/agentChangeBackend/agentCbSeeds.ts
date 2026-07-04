/// <mls fileReference="_102021_/l2/agentChangeBackend/agentCbSeeds.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Deterministic seed generation for backend modules. Writes one runtime-discoverable seeds.ts inside
// layer_1_external/adapters/persistence with TableSeedRows exports for local tables and MDM-owned
// records. No LLM: this is mechanical fixture data for migrate, memory runtime, smoke tests and docs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/cbMaterializeIo.js';
import {
  readBackendScan, enqueueNext, createUpdateStatusIntent, isRecord, readString, lowerFirst, logPrefix,
  type CbEntity, type CbScan,
} from '/_102021_/l2/agentChangeBackend/cbShared.js';

const AGENT_NAME = 'agentCbSeeds';
const SEED_ROWS_PER_TARGET = 2;
const T0 = '2026-07-01T08:00:00.000Z';
const T1 = '2026-07-01T09:00:00.000Z';

interface TableColumnSeedPlan {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableSeedPlan {
  tableId: string;
  tableName: string;
  seedFor: string;
  columns: TableColumnSeedPlan[];
  primaryKey: string[];
}

interface EntityField {
  fieldId: string;
  type: string;
  required: boolean;
  enumValues: string[];
}

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend', agentDescription: 'Generate deterministic TableSeedRows for local and MDM data', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const project = mls.actualProject || 0;
    const moduleName = scan.moduleNames[0] || 'unknown';
    const language = await readDefaultLanguage(project);
    const tablePlans = await readTablePlans(project, moduleName);
    const content = buildSeedsSource(project, moduleName, language, scan, tablePlans);
    const ok = await saveGeneratedTs(project, 1, `${moduleName}/layer_1_external/adapters/persistence`, 'seeds', content);
    if (!ok) throw new Error('failed to save seeds.ts');
    return [
      enqueueNext(context, parentStep, step, 'cb-register', 'agentCbRegister', 'Registrar backend', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Generated seeds.ts (${tablePlans.length} table target(s), ${scan.entities.filter(e => e.kind === 'mdm').length} mdm entity type(s), language=${language}).`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function readDefaultLanguage(project: number): Promise<string> {
  try {
    const key = mls.stor.getKeyToFile({ project, level: 5, folder: '', shortName: 'project', extension: '.json' } as unknown as mls.stor.IFileInfo);
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file || file.status === 'deleted') return 'en';
    const cfg = JSON.parse(String(await file.getContent()));
    const first = Array.isArray(cfg.languages) ? cfg.languages[0] : null;
    return typeof first?.language === 'string' && first.language.trim() ? first.language.trim() : 'en';
  } catch {
    return 'en';
  }
}

async function readTablePlans(project: number, moduleName: string): Promise<TableSeedPlan[]> {
  const plans: TableSeedPlan[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    if (String(file.folder || '') !== `${moduleName}/layer_1_external/adapters/persistence`) continue;
    const artifact = parseArtifact(String(await file.getContent()));
    if (!artifact || artifact.artifactType !== 'table' || !isRecord(artifact.data)) continue;
    const data = artifact.data;
    const tableId = readString(data.tableId) || readString(artifact.artifactId) || String(file.shortName || '');
    const tableName = readString(data.tableName) || toSnake(tableId);
    const columns = Array.isArray(data.columns) ? data.columns.filter(isRecord).map((column) => ({
      name: readString(column.name),
      type: readString(column.type),
      nullable: column.nullable === true,
    })).filter(column => !!column.name) : [];
    if (!tableId || columns.length === 0) continue;
    plans.push({
      tableId,
      tableName,
      seedFor: `${moduleName}${tableId}`,
      columns,
      primaryKey: Array.isArray(data.primaryKey) ? data.primaryKey.map(readString).filter(Boolean) : [],
    });
  }
  return plans.sort((left, right) => left.seedFor.localeCompare(right.seedFor));
}

function parseArtifact(content: string): Record<string, unknown> | undefined {
  const s = content.indexOf('= ');
  const e = content.indexOf(' as const;');
  if (s === -1 || e <= s) return undefined;
  try {
    const parsed = JSON.parse(content.slice(s + 2, e));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function buildSeedsSource(project: number, moduleName: string, language: string, scan: CbScan, tablePlans: TableSeedPlan[]): string {
  const localBlocks = tablePlans.map((plan) => ({
    exportName: `${lowerFirst(plan.tableId)}Seeds`,
    seedFor: plan.seedFor,
    rows: Array.from({ length: SEED_ROWS_PER_TARGET }, (_, i) => buildLocalRow(moduleName, language, scan, plan, i + 1)),
  }));
  const mdmBlocks = buildMdmSeedBlocks(moduleName, language, scan);
  const blocks = [...localBlocks, ...mdmBlocks];
  const lines = [
    `/// <mls fileReference="_${project}_/l1/${moduleName}/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>`,
    '',
    `// Deterministic initial data for ${moduleName}. Generated by agentCbSeeds.`,
    '// Discovered by shape (TableSeedRows) from this tableDefsDir and merged into matching',
    '// TableDefinition.seedRows. MDM rows target 102034-owned repositories through the global registry.',
    '',
    `import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';`,
    '',
    ...blocks.flatMap(block => [
      `export const ${toExportName(block.exportName)}: TableSeedRows = ${JSON.stringify({ seedFor: block.seedFor, rows: block.rows }, null, 2)};`,
      '',
    ]),
  ];
  return `${lines.join('\n')}`;
}

function buildLocalRow(moduleName: string, language: string, scan: CbScan, plan: TableSeedPlan, index: number): Record<string, unknown> {
  const entity = entityById(scan, plan.tableId);
  const row: Record<string, unknown> = {};
  const columnNames = new Set(plan.columns.map(column => column.name));
  for (const column of plan.columns) {
    row[column.name] = column.name === 'details'
      ? buildDetails(moduleName, language, scan, entity, columnNames, index)
      : valueForColumn(moduleName, language, scan, plan, column, index);
  }
  return row;
}

function valueForColumn(
  moduleName: string,
  language: string,
  scan: CbScan,
  plan: TableSeedPlan,
  column: TableColumnSeedPlan,
  index: number,
): unknown {
  const name = column.name.toLowerCase();
  const entity = entityById(scan, plan.tableId);
  if (name.includes('created')) return index === 1 ? T0 : T1;
  if (name.includes('updated')) return index === 1 ? T0 : T1;
  if (name === 'status' || name.endsWith('_status')) return statusValue(entity, name.includes('previous'));
  if (name === 'type' || name.endsWith('_type')) return typeValue(plan.tableId, name);
  if (name === 'quantity' || name.endsWith('_quantity')) return index === 1 ? 12 : 4;
  if (name.includes('total') || name.includes('amount') || name.includes('price')) return index === 1 ? 24.5 : 42;
  if (name === 'number' || name.endsWith('_number')) return String(index).padStart(2, '0');
  if (name === 'name' || name.endsWith('_name')) return sampleName(entity, index, language);
  if (name === 'id' || name.endsWith('_id') || plan.primaryKey.includes(column.name)) {
    return idFor(matchEntityForColumn(scan, plan.tableId, column.name), index, moduleName);
  }
  if (column.type.includes('json')) return {};
  if (column.type.includes('bool')) return index === 1;
  if (column.type.includes('number') || column.type.includes('int') || column.type.includes('decimal')) return index;
  return `${toKebab(plan.tableId)}-${index}`;
}

function buildDetails(
  moduleName: string,
  language: string,
  scan: CbScan,
  entity: CbEntity | undefined,
  columnNames: Set<string>,
  index: number,
): Record<string, unknown> {
  const details: Record<string, unknown> = { label: sampleName(entity, index, language), updatedAt: index === 1 ? T0 : T1 };
  for (const field of entityFields(entity)) {
    const snake = toSnake(field.fieldId);
    if (columnNames.has(snake) || columnNames.has(field.fieldId) || field.fieldId === 'id') continue;
    details[field.fieldId] = valueForField(moduleName, language, scan, entity, field, index);
  }
  return details;
}

function buildMdmSeedBlocks(moduleName: string, language: string, scan: CbScan): Array<{ exportName: string; seedFor: string; rows: Record<string, unknown>[] }> {
  const mdmEntities = scan.entities.filter(entity => entity.kind === 'mdm').sort((left, right) => left.entityId.localeCompare(right.entityId));
  const indexRows: Record<string, unknown>[] = [];
  const documentRows: Record<string, unknown>[] = [];
  for (const entity of mdmEntities) {
    const subtype = mdmSubtypeFor(entity.entityId);
    for (let index = 1; index <= SEED_ROWS_PER_TARGET; index++) {
      const mdmId = idFor(entity.entityId, index, moduleName);
      const name = sampleName(entity, index, language);
      const createdAt = index === 1 ? T0 : T1;
      indexRows.push({
        mdmId,
        subtype,
        name,
        status: 'Active',
        docType: null,
        docId: null,
        countryCode: countryCodeForLanguage(language),
        tags: [moduleName, entity.entityId],
        searchVector: `${name} ${entity.entityId} ${moduleName}`.toLowerCase(),
        mergedInto: null,
        dynamoPk: mdmId,
        createdAt,
        updatedAt: createdAt,
      });
      documentRows.push({
        mdmId,
        version: 1,
        details: buildMdmDetails(moduleName, language, scan, entity, subtype, mdmId, name, createdAt, index),
      });
    }
  }
  return [
    { exportName: 'mdmEntityIndexSeeds', seedFor: 'mdmEntityIndex', rows: indexRows },
    { exportName: 'mdmDocumentSeeds', seedFor: 'mdmDocumentCache', rows: documentRows },
  ].filter(block => block.rows.length > 0);
}

function buildMdmDetails(
  moduleName: string,
  language: string,
  scan: CbScan,
  entity: CbEntity,
  subtype: string,
  mdmId: string,
  name: string,
  createdAt: string,
  index: number,
): Record<string, unknown> {
  const moduleDetails: Record<string, unknown> = {};
  for (const field of entityFields(entity)) {
    moduleDetails[field.fieldId] = valueForField(moduleName, language, scan, entity, field, index);
  }
  const details: Record<string, unknown> = {
    mdmId,
    subtype,
    name,
    status: 'Active',
    docType: null,
    docId: null,
    countryCode: countryCodeForLanguage(language),
    tags: [moduleName, entity.entityId],
    aliases: [],
    contacts: [],
    relationshipRefs: {},
    addresses: [],
    mergedInto: null,
    createdAt,
    updatedAt: createdAt,
    [moduleName]: moduleDetails,
  };
  if (subtype === 'Location') details.locationType = 'DiningArea';
  if (subtype === 'Company') {
    details.companyKind = 'LegalEntity';
    details.legalName = name;
  }
  return details;
}

function valueForField(
  moduleName: string,
  language: string,
  scan: CbScan,
  entity: CbEntity | undefined,
  field: EntityField,
  index: number,
): unknown {
  const id = field.fieldId.toLowerCase();
  if (field.enumValues.length) return field.enumValues[0];
  if (id === 'name' || id.endsWith('name')) return sampleName(entity, index, language);
  if (id.includes('description')) return `${sampleName(entity, index, language)} description`;
  if (id.includes('created') || id.includes('updated') || field.type === 'datetime') return index === 1 ? T0 : T1;
  if (id.includes('price') || id.includes('amount') || id.includes('total') || field.type === 'money') return index === 1 ? 12.5 : 19.9;
  if (id.includes('quantity') || id.includes('minimum') || field.type === 'number') return index === 1 ? 10 : 3;
  if (field.type === 'boolean') return index === 1;
  if (field.type === 'uuid' || id.endsWith('id')) {
    const target = matchEntityForField(scan, entity?.entityId || '', field);
    return idFor(target, index, moduleName);
  }
  if (id.includes('category')) return language.toLowerCase().startsWith('pt') ? 'geral' : 'general';
  if (id.includes('unit')) return language.toLowerCase().startsWith('pt') ? 'unidade' : 'unit';
  return `${toKebab(field.fieldId)}-${index}`;
}

function entityFields(entity: CbEntity | undefined): EntityField[] {
  if (!entity?.fields) return [];
  return entity.fields.filter(isRecord).map(field => ({
    fieldId: readString(field.fieldId),
    type: readString(field.type),
    required: field.required === true,
    enumValues: Array.isArray(field.enum) ? field.enum.map(readString).filter(Boolean) : [],
  })).filter(field => !!field.fieldId);
}

function statusValue(entity: CbEntity | undefined, previous = false): string {
  const status = entityFields(entity).find(field => field.fieldId === 'status');
  if (status?.enumValues.length) return previous && status.enumValues.length > 1 ? status.enumValues[0] : status.enumValues[0];
  return previous ? 'pending' : 'active';
}

function typeValue(tableId: string, columnName: string): string {
  if (columnName.includes('order')) return 'dineIn';
  if (columnName.includes('movement')) return 'adjustment';
  if (columnName.includes('event')) return 'created';
  return toKebab(tableId);
}

function sampleName(entity: CbEntity | undefined, index: number, language: string): string {
  const base = language.toLowerCase().startsWith('pt')
    ? (entity?.title || humanize(entity?.entityId || 'Registro'))
    : humanize(entity?.entityId || 'Record');
  return `${base} ${index}`;
}

function matchEntityForColumn(scan: CbScan, tableId: string, columnName: string): string {
  const normalized = columnName.toLowerCase();
  if (normalized === 'id' || normalized === `${toSnake(tableId)}_id`) return tableId;
  const stem = normalized.replace(/_id$/u, '').replace(/_uuid$/u, '');
  return scan.entities.find(entity => toSnake(entity.entityId) === stem || entity.entityId.toLowerCase() === stem.replace(/_/g, ''))?.entityId || tableId;
}

function matchEntityForField(scan: CbScan, fallbackEntityId: string, field: EntityField): string {
  const fieldStem = field.fieldId.replace(/Id$/u, '');
  const byType = scan.entities.find(entity => entity.entityId === field.type);
  if (byType) return byType.entityId;
  const byField = scan.entities.find(entity => entity.entityId.toLowerCase() === fieldStem.toLowerCase());
  return byField?.entityId || fallbackEntityId || fieldStem || 'Record';
}

function entityById(scan: CbScan, entityId: string): CbEntity | undefined {
  return scan.entities.find(entity => entity.entityId === entityId);
}

function idFor(entityId: string, index: number, moduleName: string): string {
  return uuidFrom(`${moduleName}:${entityId}:${index}`);
}

function uuidFrom(input: string): string {
  const parts = Array.from({ length: 5 }, (_, index) => hashHex(`${input}:${index}`)).join('');
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-4${parts.slice(13, 16)}-8${parts.slice(17, 20)}-${parts.slice(20, 32)}`;
}

function hashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
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

function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function toKebab(value: string): string {
  return toSnake(value).replace(/_/g, '-');
}

function humanize(value: string): string {
  const words = toSnake(value).split('_').filter(Boolean);
  return words.map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ') || value;
}

function toExportName(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_$]/g, '');
  return /^[A-Za-z_$]/.test(safe) ? safe : `seed${safe}`;
}
