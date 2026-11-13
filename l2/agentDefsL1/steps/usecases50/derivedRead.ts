/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/derivedRead.ts" enhancement="_blank"/>

import { capabilityNames } from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';

/** What a `ddm` read computes. The materializer owns how. */
export interface D1DerivedRead {
  mode: 'onRead';
  sources: string[];
  windowField: string;
  groupBy: string[];
  measures: string[];
}

const BY_WINDOW = 'aggregate.byWindow';

/**
 * The read shape of a `ddm`, or `null` when the ontology has no `aggregate.byWindow`.
 * `problems` names each gap. `derivedRead` still carries whatever was readable.
 */
export function derivedReadOf(
  body: unknown,
  moduleEntityIds: readonly string[],
  entityId: string,
): { derivedRead: D1DerivedRead; problems: string[] } | null {
  if (!capabilityNames(body).includes(BY_WINDOW)) return null;
  const fields = topFields(body);
  const windows = fields.filter(field => isWindow(field)).map(field => field.name);
  const groupBy = fields
    .filter(field => isGroup(field) && !windows.includes(field.name))
    .map(field => field.name);
  const measures = measurePaths(fields);
  const sources = namedSources(body, moduleEntityIds, entityId);
  const problems: string[] = [];
  let windowField = '';
  if (windows.length !== 1) {
    problems.push(
      `DDM_WINDOW_UNREADABLE: record.fields needs exactly one top-level timestamp field that is derived and indexed; found ${windows.length}.`,
    );
  } else {
    windowField = windows[0];
  }
  if (sources.length === 0) {
    problems.push(
      'DDM_SOURCE_UNREADABLE: description names no other entity id of this module as a whole word.',
    );
  }
  return {
    derivedRead: { mode: 'onRead', sources, windowField, groupBy, measures },
    problems,
  };
}

interface TopField {
  name: string;
  value: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function topFields(body: unknown): TopField[] {
  if (!isRecord(body) || !isRecord(body.record) || !isRecord(body.record.fields)) return [];
  const out: TopField[] = [];
  for (const [name, value] of Object.entries(body.record.fields)) {
    if (isRecord(value)) out.push({ name, value });
  }
  return out;
}

function isWindow(field: TopField): boolean {
  return field.value.type === 'timestamp' && field.value.derived === true && field.value.indexed === true;
}

function isGroup(field: TopField): boolean {
  return field.name !== 'id'
    && field.name !== 'version'
    && field.value.type === 'string'
    && field.value.derived === true
    && field.value.indexed === true;
}

function measurePaths(fields: readonly TopField[]): string[] {
  const details = fields.find(field => field.name === 'details');
  if (!details || !isRecord(details.value.fields)) return [];
  const out: string[] = [];
  walkDerivedLeaves(details.value.fields, 'details', out);
  return out;
}

function walkDerivedLeaves(fields: Record<string, unknown>, prefix: string, out: string[]): void {
  for (const [name, value] of Object.entries(fields)) {
    if (!isRecord(value)) continue;
    const path = `${prefix}.${name}`;
    if (isRecord(value.fields)) {
      walkDerivedLeaves(value.fields, path, out);
      continue;
    }
    if (value.derived === true) out.push(path);
  }
}

function namedSources(body: unknown, moduleEntityIds: readonly string[], entityId: string): string[] {
  const descriptions: string[] = [];
  collectDescriptions(body, descriptions);
  const text = descriptions.join('\n');
  return moduleEntityIds.filter(id => id !== entityId && wholeWord(text, id));
}

function collectDescriptions(value: unknown, out: string[]): void {
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'title') continue;
    if (key === 'description' && typeof child === 'string') out.push(child);
    else collectDescriptions(child, out);
  }
}

function wholeWord(text: string, id: string): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`).test(text);
}
