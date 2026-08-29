/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCorpus.ts" enhancement="_blank"/>

// Offline corpus runner for validate-all guards. Reads generated l1 of a fixed project list
// (no glob of mls-*) and applies existing pure collectors. No network, no LLM, no writes.

import { collectModuleDataAdapterFindings } from '/_102021_/l2/agentChangeBackend/helpers/cbAdapterNotes.js';
import {
  collectDetailsKeyIssues,
  collectJsonbRowParseFindings,
  fieldIdsFromL4Fields,
  jsonbColumnsFromTableSource,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';
import { parseDefsSource } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import { collectRawMdmAccessIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js';
import { collectColumnTypeMismatchFindings } from '/_102021_/l2/agentChangeBackend/helpers/cbTableColumnTypes.js';
import { collectRedundantPkIndexFindings } from '/_102021_/l2/agentChangeBackend/helpers/cbTableIndexes.js';

export const CB_CORPUS_PROJECT_IDS = ['102046', '102047', '102048', '102049', '102051'] as const;
export type CbCorpusProjectId = (typeof CB_CORPUS_PROJECT_IDS)[number];

export const CB_CORPUS_GUARD_FAMILIES = [
  'moduleDataAdapter',
  'jsonbRowParse',
  'redundantPkIndex',
  'columnTypeMismatch',
  'detailsKey',
  'rawMdmAccess',
] as const;
export type CbCorpusGuardFamily = (typeof CB_CORPUS_GUARD_FAMILIES)[number];

const L1_SCAN_FOLDERS = [
  'layer_1_external/adapters/persistence',
  'layer_1_external/adapters/http/controllers',
  'layer_2_application/usecases',
  'layer_3_domain/entities',
] as const;

/** Families with this many findings or fewer list the accused files in the baseline. */
const SMALL_FAMILY_FILE_LIMIT = 24;

const SKIP_TABLE_SN = new Set(['seeds', 'persistence', 'registerrepositories']);

export interface CbCorpusFileFinding {
  file: string;
  family: CbCorpusGuardFamily;
  findings: string[];
}

export interface CbCorpusProjectResult {
  project: CbCorpusProjectId;
  skipped: boolean;
  warning?: string;
  files: CbCorpusFileFinding[];
}

export interface CbCorpusRunResult {
  projects: CbCorpusProjectResult[];
}

export interface CbCorpusFamilyBaseline {
  count: number;
  files?: string[];
}

export type CbCorpusProjectBaseline = Record<CbCorpusGuardFamily, CbCorpusFamilyBaseline>;

export interface CbCorpusBaseline {
  projects: Record<string, CbCorpusProjectBaseline>;
}

/** Minimal FS surface so this module stays off `node:*` (frontend tsc has `types: []`). */
export interface CbCorpusIo {
  isDir(absPath: string): boolean;
  isFile(absPath: string): boolean;
  list(absPath: string): string[];
  read(absPath: string): string;
  join(...parts: string[]): string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function posixRel(...parts: string[]): string {
  return parts.join('/');
}

function sortedNames(io: CbCorpusIo, dir: string): string[] {
  return io.list(dir).slice().sort((a, b) => a.localeCompare(b));
}

function shortNameOf(fileName: string): string {
  return fileName.replace(/\.defs\.ts$/i, '').replace(/\.ts$/i, '').toLowerCase();
}

function isAdapterTs(fileName: string): boolean {
  return /repositoryadapter\.ts$/i.test(fileName) && !fileName.endsWith('.defs.ts');
}

function isDefs(fileName: string): boolean {
  return fileName.endsWith('.defs.ts');
}

function isTableArtifact(fileName: string): boolean {
  const sn = shortNameOf(fileName);
  if (sn.endsWith('repositoryadapter')) return false;
  if (SKIP_TABLE_SN.has(sn)) return false;
  return true;
}

function entityFromDefs(source: string): { sn: string; fields: unknown } | null {
  const parsed = parseDefsSource(source);
  if (!isRecord(parsed)) return null;
  const data = isRecord(parsed.data) ? parsed.data : parsed;
  const entityId = typeof data.entityId === 'string' ? data.entityId.trim() : '';
  if (!entityId || !Array.isArray(data.fields)) return null;
  return { sn: lowerFirst(entityId).toLowerCase(), fields: data.fields };
}

interface LoadedFile {
  fileName: string;
  relPath: string;
  source: string;
}

function loadFolder(io: CbCorpusIo, absDir: string, relDir: string): LoadedFile[] {
  if (!io.isDir(absDir)) return [];
  const out: LoadedFile[] = [];
  for (const name of sortedNames(io, absDir)) {
    if (!name.endsWith('.ts')) continue;
    const full = io.join(absDir, name);
    if (!io.isFile(full)) continue;
    out.push({
      fileName: name,
      relPath: posixRel(relDir, name),
      source: io.read(full),
    });
  }
  return out;
}

function pushFinding(
  acc: CbCorpusFileFinding[],
  file: string,
  family: CbCorpusGuardFamily,
  findings: string[],
): void {
  if (!findings.length) return;
  acc.push({ file, family, findings: [...findings].sort((a, b) => a.localeCompare(b)) });
}

function scanModuleFiles(files: LoadedFile[]): CbCorpusFileFinding[] {
  const persistence = files.filter((f) => f.relPath.includes('/adapters/persistence/'));
  const entities = files.filter((f) => f.relPath.includes('/layer_3_domain/entities/'));

  const declaredTableNames = new Set<string>();
  const jsonbColumnsByTable = new Map<string, Set<string>>();
  const jsonbColumnsAll = new Set<string>();
  for (const file of persistence) {
    for (const m of file.source.matchAll(/tableName:\s*'([^']+)'/g)) declaredTableNames.add(m[1]);
    for (const m of file.source.matchAll(/"tableName"\s*:\s*"([^"]+)"/g)) declaredTableNames.add(m[1]);
    const jsonb = jsonbColumnsFromTableSource(file.source);
    if (!jsonb?.columns.length) continue;
    const bucket = jsonbColumnsByTable.get(jsonb.tableName) ?? new Set<string>();
    for (const column of jsonb.columns) {
      bucket.add(column);
      jsonbColumnsAll.add(column);
    }
    if (jsonb.tableName) jsonbColumnsByTable.set(jsonb.tableName, bucket);
  }

  const fieldsByTableSn = new Map<string, unknown>();
  const fieldIdsByAdapterSn = new Map<string, Set<string>>();
  for (const file of entities) {
    if (!isDefs(file.fileName)) continue;
    const entity = entityFromDefs(file.source);
    if (!entity) continue;
    fieldsByTableSn.set(entity.sn, entity.fields);
    const ids = fieldIdsFromL4Fields(entity.fields);
    if (ids.size) fieldIdsByAdapterSn.set(`${entity.sn}repositoryadapter`, ids);
  }

  const acc: CbCorpusFileFinding[] = [];
  for (const file of files) {
    const sn = shortNameOf(file.fileName);
    const inPersistence = file.relPath.includes('/adapters/persistence/');

    if (inPersistence && isAdapterTs(file.fileName)) {
      pushFinding(acc, file.relPath, 'moduleDataAdapter', collectModuleDataAdapterFindings(file.source, sn, declaredTableNames));
      const tableName = /getTable(?:<[^>]*>)?\(\s*'([^']+)'\s*\)/.exec(file.source)?.[1];
      const columns = (tableName && jsonbColumnsByTable.get(tableName)) || jsonbColumnsAll;
      pushFinding(acc, file.relPath, 'jsonbRowParse', collectJsonbRowParseFindings(file.source, columns, file.relPath));
      const fieldIds = fieldIdsByAdapterSn.get(sn);
      if (fieldIds?.size) {
        pushFinding(acc, file.relPath, 'detailsKey', collectDetailsKeyIssues(file.source, fieldIds, file.relPath));
      }
    }

    if (inPersistence && isTableArtifact(file.fileName)) {
      if (isDefs(file.fileName)) {
        pushFinding(acc, file.relPath, 'redundantPkIndex', collectRedundantPkIndexFindings(file.source, file.relPath));
      }
      const fields = fieldsByTableSn.get(sn);
      if (fields) {
        pushFinding(acc, file.relPath, 'columnTypeMismatch', collectColumnTypeMismatchFindings(file.source, fields, file.relPath));
      }
    }

    if (!isDefs(file.fileName)) {
      pushFinding(acc, file.relPath, 'rawMdmAccess', collectRawMdmAccessIssues(file.source));
    }
  }

  acc.sort((a, b) => a.file.localeCompare(b.file) || a.family.localeCompare(b.family));
  return acc;
}

export function runCbCorpus(mlsBase: string, io: CbCorpusIo): CbCorpusRunResult {
  const projects: CbCorpusProjectResult[] = [];
  for (const project of CB_CORPUS_PROJECT_IDS) {
    const l1 = io.join(mlsBase, `mls-${project}`, 'l1');
    if (!io.isDir(l1)) {
      projects.push({
        project,
        skipped: true,
        warning: `mls-${project}/l1 not on disk — skipped`,
        files: [],
      });
      continue;
    }
    const moduleFiles: LoadedFile[] = [];
    for (const moduleName of sortedNames(io, l1)) {
      if (moduleName.startsWith('.')) continue;
      const moduleAbs = io.join(l1, moduleName);
      if (!io.isDir(moduleAbs)) continue;
      for (const folder of L1_SCAN_FOLDERS) {
        moduleFiles.push(...loadFolder(io, io.join(moduleAbs, ...folder.split('/')), posixRel(moduleName, folder)));
      }
    }
    projects.push({
      project,
      skipped: false,
      files: scanModuleFiles(moduleFiles),
    });
  }
  return { projects };
}

function emptyFamilies(): CbCorpusProjectBaseline {
  return {
    moduleDataAdapter: { count: 0 },
    jsonbRowParse: { count: 0 },
    redundantPkIndex: { count: 0 },
    columnTypeMismatch: { count: 0 },
    detailsKey: { count: 0 },
    rawMdmAccess: { count: 0 },
  };
}

export function summarizeCbCorpus(run: CbCorpusRunResult): CbCorpusBaseline {
  const projects: Record<string, CbCorpusProjectBaseline> = {};
  for (const project of run.projects) {
    if (project.skipped) continue;
    const families = emptyFamilies();
    const filesByFamily = new Map<CbCorpusGuardFamily, Set<string>>();
    for (const family of CB_CORPUS_GUARD_FAMILIES) filesByFamily.set(family, new Set());
    for (const row of project.files) {
      families[row.family].count += row.findings.length;
      filesByFamily.get(row.family)!.add(row.file);
    }
    for (const family of CB_CORPUS_GUARD_FAMILIES) {
      const count = families[family].count;
      if (count > 0 && count <= SMALL_FAMILY_FILE_LIMIT) {
        families[family].files = [...filesByFamily.get(family)!].sort((a, b) => a.localeCompare(b));
      }
    }
    projects[project.project] = families;
  }
  return { projects };
}

export function diffCbCorpusBaseline(actual: CbCorpusBaseline, expected: CbCorpusBaseline): string[] {
  const diffs: string[] = [];
  for (const project of Object.keys(actual.projects).sort()) {
    const got = actual.projects[project];
    const exp = expected.projects[project];
    if (!exp) {
      diffs.push(`${project}: not in baseline (got ${CB_CORPUS_GUARD_FAMILIES.map((f) => `${f}=${got[f].count}`).join(', ')})`);
      continue;
    }
    for (const family of CB_CORPUS_GUARD_FAMILIES) {
      if (got[family].count !== exp[family].count) {
        diffs.push(`${project} ${family}: baseline ${exp[family].count}, got ${got[family].count}`);
      }
      const expFiles = exp[family].files;
      const gotFiles = got[family].files;
      if (expFiles && gotFiles) {
        const expJoin = expFiles.join('\n');
        const gotJoin = gotFiles.join('\n');
        if (expJoin !== gotJoin) {
          diffs.push(`${project} ${family} files: baseline [${expFiles.join(', ')}], got [${gotFiles.join(', ')}]`);
        }
      }
    }
  }
  return diffs;
}
