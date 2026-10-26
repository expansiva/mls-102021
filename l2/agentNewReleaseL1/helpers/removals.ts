/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/removals.ts" enhancement="_blank"/>

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

/** A field, journey, or step this master removes by editing the def, with no model. */
export type StructuralRemoval =
  | { kind: 'field'; fieldId: string }
  | { kind: 'journey'; journeyId: string }
  | { kind: 'step'; journeyId: string; stepId: string };

const FIELD_VALUE_KEYS = new Set(['name', 'field', 'path', 'column']);

/** `before` of a removed field, journey, or step. Other items are not structural. */
export function structuralRemoval(item: L4DiffItem): StructuralRemoval | null {
  if (item.op !== 'removed') return null;
  if (item.kind === 'field') return { kind: 'field', fieldId: text(item.before, 'fieldId') };
  if (item.kind === 'journey') return { kind: 'journey', journeyId: text(item.before, 'journeyId') };
  if (item.kind === 'step') return { kind: 'step', journeyId: text(item.before, 'journeyId'), stepId: text(item.before, 'stepId') };
  return null;
}

/** The id named in a refusal and in an edit note. Empty when `before` did not carry it. */
export function citedToken(removal: StructuralRemoval): string {
  if (removal.kind === 'field') return removal.fieldId;
  if (removal.kind === 'journey') return removal.journeyId;
  return removal.journeyId && removal.stepId ? `${removal.journeyId}/${removal.stepId}` : '';
}

export function removalReady(removal: StructuralRemoval): boolean {
  return citedToken(removal) !== '';
}

/**
 * Drops the structural citation from a def this kind owns.
 * Entity and repository lose the field row. Seeds lose the journey scenario, its owners, and the fixture strings
 * (every step of the journey, or only the removed step). Returns whether this kind is the mechanical target.
 */
export function applyStructuralRemoval(definition: M1Definition, unitKind: string, removal: StructuralRemoval): boolean {
  if (removal.kind === 'field') {
    if (unitKind !== 'entity' && unitKind !== 'repository') return false;
    // An entity lists the field in `fields` by `name`. A repository lists it in `columns` (and `fields`, when present) by `field`.
    const key = unitKind === 'entity' ? 'name' : 'field';
    const lists = unitKind === 'entity' ? ['fields'] : ['fields', 'columns'];
    for (const list of lists) dropNamedRow(definition.data, list, key, removal.fieldId);
    return true;
  }
  if (unitKind !== 'seeds') return false;
  const data = definition.data;
  if (removal.kind === 'journey') {
    const source = `journey:${removal.journeyId}`;
    if (Array.isArray(data.scenarios)) {
      data.scenarios = data.scenarios.filter(row => !(isRecord(row) && row.source === source));
    }
    if (Array.isArray(data.datasets)) {
      for (const dataset of data.datasets) {
        if (!isRecord(dataset) || !Array.isArray(dataset.owners)) continue;
        dataset.owners = dataset.owners.filter(owner => owner !== removal.journeyId);
      }
    }
    stripFixtureStrings(data.fixture, value => value === source || value.startsWith(`${source}/`));
    return true;
  }
  const step = `journey:${removal.journeyId}/${removal.stepId}`;
  stripFixtureStrings(data.fixture, value => value === step);
  return true;
}

/** Whole key, value, or element equal to the removed id. A field's last segment counts only as name, field, path, or column. */
export function citesRemoval(value: unknown, removal: StructuralRemoval): boolean {
  return cites(value, removal, undefined);
}

function cites(value: unknown, removal: StructuralRemoval, key: string | undefined): boolean {
  if (typeof value === 'string') return stringCites(value, removal, key);
  if (Array.isArray(value)) {
    return value.some(entry => {
      if (removal.kind === 'journey' && key === 'owners' && entry === removal.journeyId) return true;
      return cites(entry, removal, key);
    });
  }
  if (!isRecord(value)) return false;
  for (const [childKey, child] of Object.entries(value)) {
    if (removal.kind === 'field' && childKey === removal.fieldId) return true;
    if (cites(child, removal, childKey)) return true;
  }
  return false;
}

function stringCites(value: string, removal: StructuralRemoval, key: string | undefined): boolean {
  if (removal.kind === 'field') {
    if (value === removal.fieldId) return true;
    const segment = removal.fieldId.includes('.') ? removal.fieldId.slice(removal.fieldId.lastIndexOf('.') + 1) : removal.fieldId;
    return !!key && FIELD_VALUE_KEYS.has(key) && value === segment;
  }
  if (removal.kind === 'journey') {
    const source = `journey:${removal.journeyId}`;
    return value === source || value.startsWith(`${source}/`);
  }
  return value === `journey:${removal.journeyId}/${removal.stepId}`;
}

function dropNamedRow(data: Record<string, unknown>, list: string, key: string, fieldId: string): void {
  const rows = data[list];
  if (!Array.isArray(rows)) return;
  data[list] = rows.filter(row => !(isRecord(row) && row[key] === fieldId));
}

function stripFixtureStrings(fixture: unknown, match: (value: string) => boolean): void {
  if (Array.isArray(fixture)) {
    for (let index = fixture.length - 1; index >= 0; index -= 1) {
      const entry = fixture[index];
      if (typeof entry === 'string') {
        if (match(entry)) fixture.splice(index, 1);
      } else {
        stripFixtureStrings(entry, match);
      }
    }
    return;
  }
  if (!isRecord(fixture)) return;
  for (const child of Object.values(fixture)) stripFixtureStrings(child, match);
}

function text(value: unknown, key: string): string {
  if (!isRecord(value)) return '';
  const found = value[key];
  return typeof found === 'string' ? found : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
