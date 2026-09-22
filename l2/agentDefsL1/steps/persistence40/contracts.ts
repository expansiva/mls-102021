/// <mls fileReference="_102021_/l2/agentDefsL1/steps/persistence40/contracts.ts" enhancement="_blank"/>

import type { D1Definition, D1PortMethod } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import type { D1DomainBuild } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';

export const D1_PERSISTENCE_VERSION = '2026-09-21-d1-persistence-v1' as const;

/** Prefix for a logical field stored in the runtime `details` JSONB column. One writer, reversible. */
export const D1_JSON_COLUMN_PREFIX = 'json:' as const;

/** Runtime JSONB column name. Not derived per table and not snake-cased. */
export const D1_DETAILS_COLUMN = 'details' as const;

export const D1_PERSISTENCE_ACTIONS = ['create', 'update', 'recompose', 'preserve', 'remove', 'conflict'] as const;

export const ENUMERATION_REASON = 'Table and adapter schemas have no enum values. They stay on the domain draft.' as const;

export interface D1PersistenceFile {
  artifactType: string;
  identity: string;
  defPath: string;
  action: string;
}

export interface D1PersistenceProblem {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
}

export interface D1PersistenceNormalization {
  code: string;
  path: string;
  detail: string;
}

export interface D1ColumnBinding {
  field: string;
  column: string;
  nullable: boolean;
  placement: 'column' | 'json';
}

/** Enum values read from the domain draft and not copied onto a table or adapter. */
export interface D1UnconsumedEnumeration {
  entityId: string;
  path: string;
  values: string[];
  consumed: false;
  source: 'domain30.enumerations';
  reason: typeof ENUMERATION_REASON;
}

export interface D1UniqueKeyUse {
  entityId: string;
  tableId: string | null;
  uniqueKeys: string[][];
  consumed: boolean;
  /** Where a consumed key was written, or why it was not. */
  placedOn: string;
}

export interface D1PersistencePortPlan {
  portId: string;
  entityId: string;
  action: string;
  defPath: string;
  methods: D1PortMethod[];
  definition: D1Definition | null;
}

export interface D1PersistenceTablePlan {
  tableId: string;
  entityId: string;
  action: string;
  defPath: string;
  physicalName: string;
  /** Runtime JSONB column, or null when every field is a real column. */
  detailsColumn: string | null;
  definition: D1Definition | null;
}

export interface D1PersistenceAdapterPlan {
  portId: string;
  entityId: string;
  tableId: string;
  action: string;
  defPath: string;
  methods: D1PortMethod[];
  bindings: D1ColumnBinding[];
  definition: D1Definition | null;
}

export interface D1PersistenceEmit {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

export interface D1PersistenceBuild {
  schemaVersion: typeof D1_PERSISTENCE_VERSION;
  project: number;
  moduleName: string;
  llmCalls: 0;
  ok: boolean;
  enumerations: D1UnconsumedEnumeration[];
  uniqueKeys: D1UniqueKeyUse[];
  ports: D1PersistencePortPlan[];
  tables: D1PersistenceTablePlan[];
  adapters: D1PersistenceAdapterPlan[];
  problems: D1PersistenceProblem[];
  normalizations: D1PersistenceNormalization[];
  preserved: string[];
  removed: string[];
  emit: D1PersistenceEmit[];
}

export interface D1PersistenceRequest {
  project: number;
  moduleName: string;
  selection: {
    ports: Array<{ portId: string; entity: string; status: string }>;
    tables: Array<{ tableId: string; entity: string; status: string }>;
    usecases: Array<{ usecaseId: string; entity: string; operation: string; status: string }>;
    files: D1PersistenceFile[];
  };
  domain: D1DomainBuild;
  entities: Record<string, unknown>;
  /** Preserved port bytes keyed by defPath. The value is the definition object. */
  preservedPorts: Record<string, unknown>;
  /** Extra physical names that must equal `storage.table`. Keyed by entity id. */
  physicalCitations: Record<string, string[]>;
  /** Catalog paths this step opened and did not write. */
  catalogsRead: string[];
}

/** Logical field encoded by one column string. `json:` marks the details envelope. */
export function fieldFromColumn(column: string): string {
  return column.startsWith(D1_JSON_COLUMN_PREFIX) ? column.slice(D1_JSON_COLUMN_PREFIX.length) : column;
}

export function columnForField(field: string, placement: 'column' | 'json'): string {
  return placement === 'json' ? `${D1_JSON_COLUMN_PREFIX}${field}` : field;
}

/** Names required by the port and missing from the adapter. */
export function uncoveredMethods(required: readonly string[], implemented: readonly string[]): string[] {
  return required.filter(name => !implemented.includes(name));
}

/** A binding round-trips when each column string decodes to its own field and no column is shared. */
export function bindingRoundTripIssues(bindings: readonly D1ColumnBinding[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const binding of bindings) {
    const decoded = fieldFromColumn(binding.column);
    if (decoded !== binding.field || !binding.column) {
      issues.push(`Field ${binding.field} does not round-trip through ${binding.column || '(empty)'}.`);
    }
    if (binding.placement === 'json' && !binding.column.startsWith(D1_JSON_COLUMN_PREFIX)) {
      issues.push(`Field ${binding.field} is marked json but its column is ${binding.column}.`);
    }
    if (binding.placement === 'column' && binding.column.startsWith(D1_JSON_COLUMN_PREFIX)) {
      issues.push(`Field ${binding.field} is marked column but its column is ${binding.column}.`);
    }
    if (seen.has(binding.column)) issues.push(`Column ${binding.column} is used by more than one field.`);
    if (binding.column) seen.add(binding.column);
  }
  return issues;
}
