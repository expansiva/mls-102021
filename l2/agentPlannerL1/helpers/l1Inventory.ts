/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/l1Inventory.ts" enhancement="_blank"/>

import { parseDefsSource } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import type { OwnerStatus } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { diskFileInfo, hostListFolder, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

/** Same enum as `cbShared.ALL_STATUSES`. Listed here so this module does not import cbShared at runtime. */
const OWNER_STATUSES: readonly OwnerStatus[] = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];

export interface L1InventoryField {
  name: string;
  type?: string;
  fieldRef?: string;
}

export interface L1InventoryFunction {
  name: string;
  input: L1InventoryField[];
  output: L1InventoryField[];
}

export interface L1InventoryUsecase {
  usecaseId: string;
  file: string;
  functions: L1InventoryFunction[];
  ports: string[];
  rulesApplied: string[];
  statusBackend: OwnerStatus | '';
}

export interface L1InventoryPort {
  portId: string;
  entity: string;
}

export interface L1InventoryTable {
  tableId: string;
  entity: string;
}

export interface L1Inventory {
  routes: string[];
  usecases: L1InventoryUsecase[];
  ports: L1InventoryPort[];
  tables: L1InventoryTable[];
  present: boolean;
}

const EMPTY_INVENTORY: L1Inventory = {
  routes: [],
  usecases: [],
  ports: [],
  tables: [],
  present: false,
};

type StorFile = {
  project?: number | string;
  level?: number | string;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent: () => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asOwnerStatus(value: unknown): OwnerStatus | '' {
  return typeof value === 'string' && (OWNER_STATUSES as readonly string[]).includes(value)
    ? value as OwnerStatus
    : '';
}

function l1Folder(moduleName: string, suffix: string): string {
  return `${moduleName}/${suffix}`;
}

function displayL1(file: Ns5FileInfo): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `l${file.level}/${folder}${file.shortName}${file.extension}`;
}

function l5ProjectFile(project: number): Ns5FileInfo {
  return { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
}

function l5TodoFile(project: number, moduleName: string): Ns5FileInfo {
  return { project, level: 5, folder: moduleName, shortName: 'todoBackend', extension: '.defs.ts' };
}

function folderAfterL1(raw: string, moduleName: string, fallback: string): string {
  const marker = '/l1/';
  const index = raw.indexOf(marker);
  if (index >= 0) {
    const rest = raw.slice(index + marker.length).replace(/^\.\//, '').replace(/\/$/, '');
    if (rest) return rest;
  }
  return l1Folder(moduleName, fallback);
}

function listDefs(project: number, level: number, folder: string): Ns5FileInfo[] {
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, Ns5FileInfo>();
  const remember = (info: Ns5FileInfo) => {
    found.set(`${info.folder}/${info.shortName}${info.extension}`, info);
  };
  for (const file of Object.values(files)) {
    if (!file || Number(file.project) !== project || Number(file.level) !== level) continue;
    if (file.status === 'deleted') continue;
    if (String(file.folder || '') !== folder || file.extension !== '.defs.ts' || !file.shortName) continue;
    remember({
      project,
      level,
      folder,
      shortName: String(file.shortName),
      extension: '.defs.ts',
    });
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    for (const info of listFolder(project, level, folder)) {
      if (info.extension !== '.defs.ts' || !info.shortName) continue;
      const key = mls.stor.getKeyToFile(info);
      const indexed = files[key];
      if (indexed?.status === 'deleted') continue;
      if (!indexed) files[key] = diskFileInfo(info);
      remember({
        project,
        level,
        folder,
        shortName: String(info.shortName),
        extension: '.defs.ts',
      });
    }
  }
  return [...found.values()].sort((a, b) => a.shortName.localeCompare(b.shortName));
}

async function readStorText(fileInfo: Ns5FileInfo): Promise<string> {
  const file = (mls.stor.files as Record<string, StorFile | undefined>)[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') return '';
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* fall through */ }
  }
  const content = await file.getContent();
  return typeof content === 'string' ? content : '';
}

async function readDefs(fileInfo: Ns5FileInfo): Promise<Record<string, unknown> | null> {
  const text = await readStorText(fileInfo);
  if (!text) return null;
  const parsed = parseDefsSource(text);
  return isRecord(parsed) ? parsed : null;
}

async function readProjectJson(project: number): Promise<Record<string, unknown> | null> {
  const text = await readStorText(l5ProjectFile(project));
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function moduleBackend(projectJson: Record<string, unknown> | null, moduleName: string): Record<string, unknown> | null {
  const modules = projectJson && Array.isArray(projectJson.modules) ? projectJson.modules : [];
  for (const raw of modules) {
    if (!isRecord(raw)) continue;
    if (raw.moduleName !== moduleName) continue;
    return isRecord(raw.backend) ? raw.backend : null;
  }
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && !!item.trim());
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function fieldsOf(value: unknown): L1InventoryField[] {
  if (!Array.isArray(value)) return [];
  const fields: L1InventoryField[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name) continue;
    const field: L1InventoryField = { name: raw.name };
    if (typeof raw.type === 'string' && raw.type) field.type = raw.type;
    if (typeof raw.fieldRef === 'string' && raw.fieldRef) field.fieldRef = raw.fieldRef;
    fields.push(field);
  }
  return fields;
}

function todoOwnerType(raw: string): string {
  if (raw === 'useCase' || raw === 'operation') return 'operation';
  return raw;
}

async function readStatusByUsecase(project: number, moduleName: string): Promise<Map<string, OwnerStatus>> {
  const parsed = await readDefs(l5TodoFile(project, moduleName));
  const owners = parsed && Array.isArray(parsed.owners) ? parsed.owners : [];
  const map = new Map<string, OwnerStatus>();
  for (const raw of owners) {
    if (!isRecord(raw)) continue;
    const kind = todoOwnerType(typeof raw.ownerType === 'string' ? raw.ownerType : '');
    const id = typeof raw.ownerId === 'string' ? raw.ownerId : '';
    if (kind !== 'operation' || !id) continue;
    const status = asOwnerStatus(raw.statusBackend) || asOwnerStatus(raw.status);
    if (status) map.set(id, status);
  }
  return map;
}

async function readUsecases(
  project: number,
  moduleName: string,
  statuses: Map<string, OwnerStatus>,
): Promise<L1InventoryUsecase[]> {
  const folder = l1Folder(moduleName, 'layer_2_application/usecases');
  const usecases: L1InventoryUsecase[] = [];
  for (const file of listDefs(project, 1, folder)) {
    const parsed = await readDefs(file);
    if (!parsed || parsed.artifactType !== 'usecase') continue;
    const data = isRecord(parsed.data) ? parsed.data : {};
    const usecaseId = typeof data.usecaseId === 'string' && data.usecaseId
      ? data.usecaseId
      : (typeof parsed.artifactId === 'string' ? parsed.artifactId : file.shortName);
    const rawFunctions = Array.isArray(data.functions) ? data.functions : [];
    const functions: L1InventoryFunction[] = [];
    const functionRules: string[] = [];
    for (const raw of rawFunctions) {
      if (!isRecord(raw)) continue;
      const name = typeof raw.functionName === 'string' ? raw.functionName : '';
      if (!name) continue;
      functions.push({
        name,
        input: fieldsOf(raw.input),
        output: fieldsOf(raw.output),
      });
      functionRules.push(...stringList(raw.rulesApplied));
    }
    usecases.push({
      usecaseId,
      file: displayL1(file),
      functions,
      ports: stringList(data.ports),
      rulesApplied: uniqueStrings([...stringList(data.rulesApplied), ...functionRules]),
      statusBackend: statuses.get(usecaseId) || '',
    });
  }
  return usecases.sort((a, b) => a.usecaseId.localeCompare(b.usecaseId));
}

async function readPorts(project: number, moduleName: string): Promise<L1InventoryPort[]> {
  const folder = l1Folder(moduleName, 'layer_2_application/ports');
  const ports: L1InventoryPort[] = [];
  for (const file of listDefs(project, 1, folder)) {
    const parsed = await readDefs(file);
    if (!parsed || parsed.artifactType !== 'repositoryPort') continue;
    const data = isRecord(parsed.data) ? parsed.data : {};
    const portId = typeof parsed.artifactId === 'string' && parsed.artifactId
      ? parsed.artifactId
      : file.shortName;
    const entity = typeof data.entityId === 'string' ? data.entityId : '';
    ports.push({ portId, entity });
  }
  return ports.sort((a, b) => a.portId.localeCompare(b.portId));
}

async function readTables(project: number, moduleName: string, tableFolder: string): Promise<L1InventoryTable[]> {
  const tables: L1InventoryTable[] = [];
  for (const file of listDefs(project, 1, tableFolder)) {
    const parsed = await readDefs(file);
    if (!parsed || parsed.artifactType !== 'table') continue;
    const data = isRecord(parsed.data) ? parsed.data : {};
    const tableId = typeof data.tableId === 'string' && data.tableId
      ? data.tableId
      : (typeof parsed.artifactId === 'string' ? parsed.artifactId : file.shortName);
    const entity = typeof data.entityId === 'string' && data.entityId
      ? data.entityId
      : (typeof parsed.artifactId === 'string' && parsed.artifactId ? parsed.artifactId : tableId);
    tables.push({ tableId, entity });
  }
  return tables.sort((a, b) => a.tableId.localeCompare(b.tableId));
}

async function readControllerRoutes(project: number, moduleName: string, controllersFolder: string): Promise<string[]> {
  const routes = new Set<string>();
  for (const file of listDefs(project, 1, controllersFolder)) {
    const parsed = await readDefs(file);
    if (!parsed || parsed.artifactType !== 'httpController') continue;
    const data = isRecord(parsed.data) ? parsed.data : {};
    if (Array.isArray(data.handlers)) {
      for (const handler of data.handlers) {
        if (isRecord(handler) && typeof handler.route === 'string' && handler.route) {
          routes.add(handler.route);
        }
      }
    }
    if (Array.isArray(data.routes)) {
      for (const route of data.routes) {
        if (isRecord(route) && typeof route.key === 'string' && route.key) routes.add(route.key);
      }
    }
  }
  return [...routes];
}

/**
 * Snapshot of the existing l1 of `module` in `project`. Pure over `mls.stor`.
 * No l1 (and no backend block) ⇒ `present: false` and empty lists.
 * Status comes from `l5/<mod>/todoBackend.defs.ts owners[]`, never from `status: draft` in the defs.
 */
export async function readL1Inventory(project: number, moduleName: string): Promise<L1Inventory> {
  if (!project || !moduleName) return EMPTY_INVENTORY;
  const projectJson = await readProjectJson(project);
  const backend = moduleBackend(projectJson, moduleName);
  const persistence = backend && isRecord(backend.persistence) ? backend.persistence : null;
  const tableFolder = folderAfterL1(
    typeof persistence?.tableDefsDir === 'string' ? persistence.tableDefsDir : '',
    moduleName,
    'layer_1_external/adapters/persistence',
  );
  const controllersFolder = folderAfterL1(
    typeof backend?.backendControllers === 'string' ? backend.backendControllers : '',
    moduleName,
    'layer_1_external/adapters/http/controllers',
  );
  const statuses = await readStatusByUsecase(project, moduleName);
  const usecases = await readUsecases(project, moduleName, statuses);
  const ports = await readPorts(project, moduleName);
  const tables = await readTables(project, moduleName, tableFolder);
  const controllerRoutes = await readControllerRoutes(project, moduleName, controllersFolder);
  const routes = [...new Set([...stringList(backend?.routeKeys), ...controllerRoutes])].sort();
  const present = usecases.length > 0 || routes.length > 0 || ports.length > 0 || tables.length > 0;
  if (!present) return EMPTY_INVENTORY;
  return { routes, usecases, ports, tables, present: true };
}
