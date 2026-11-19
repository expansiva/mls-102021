/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/externalEnums.ts" enhancement="_blank"/>

// d1_198: a field of an external entity that is an enum and crosses the input or the output of a connection operation.
// The L4 speaks the language of the module, the catalog the language of the connector, so the unions can differ. The
// generator knows both sides (the L4 of the entity, the type of the catalog). It checks only the count, in code, before
// the model: an equal count asks for a typed map, a different count fails the unit. The pair of each value is the
// model's choice, by meaning. The gate checks that the map is complete and one to one.

import { connectionCatalogSource } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { catalogFieldUnion, catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { connectionRowsOf, externalEntityIds } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { catalogFilePath } from '/_102020_/l2/helpers/connections/catalogPath.js';

export interface ExternalEnumPair {
  usecaseId: string;
  entityId: string;
  connectionId: string;
  operationId: string;
  field: string;
  /** `input`: the module value goes into the call. `output`: the catalog value comes back. */
  side: 'input' | 'output';
  catalogType: string;
  moduleValues: string[];
  catalogValues: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Values of each `enum` field of an L4 entity def (`"values": [{ "value": … }]` or plain strings), by field name. */
export function enumFieldValues(ontologySource: string | null): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const match = ontologySource ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(ontologySource) : null;
  if (!match) return out;
  let root: unknown;
  try { root = JSON.parse(match[1]); } catch { return out; }
  const fields = isRecord(root) && isRecord(root.record) && isRecord(root.record.fields) ? root.record.fields : {};
  for (const [name, field] of Object.entries(fields)) {
    if (!isRecord(field) || field.type !== 'enum' || !Array.isArray(field.values)) continue;
    const values = field.values.map(item => typeof item === 'string' ? item : isRecord(item) && typeof item.value === 'string' ? item.value : '').filter(Boolean);
    if (values.length) out.set(name, values);
  }
  return out;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every(value => right.includes(value));
}

/**
 * The enum fields of the external entity of each usecase that cross the call the usecase makes, with the unions of both
 * sides. A pair whose unions are the same set is not returned: nothing is translated.
 */
export async function externalEnumPairs(ctx: M12Context, usecases: readonly M12Unit[]): Promise<ExternalEnumPair[]> {
  const external = externalEntityIds(ctx.units);
  const rows = ctx.units.filter(item => item.definition.artifactType === 'integrationOutbound').flatMap(item => connectionRowsOf(item.definition.data));
  const pairs: ExternalEnumPair[] = [];
  for (const unit of usecases) {
    const usecaseId = String(unit.definition.data.usecaseId ?? unit.definition.artifactId ?? unit.unitId);
    const entityId = String(unit.definition.data.entityId ?? '');
    if (!external.has(entityId)) continue;
    const row = rows.find(item => item.consumer === usecaseId || item.consumer === unit.unitId);
    if (!row) continue;
    const catalog = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, row.connectionId)).source;
    const operation = catalog ? catalogOperations(catalog)?.find(item => item.operationId === row.operationId) : undefined;
    if (!catalog || !operation) continue;
    const ontology = await ctx.read(`_${ctx.run.project}_/l4/${ctx.run.module}/ontology/${entityId}.defs.ts`);
    for (const [field, moduleValues] of enumFieldValues(ontology)) {
      for (const [side, catalogType] of [['input', operation.inputType], ['output', operation.outputType]] as const) {
        const catalogValues = catalogFieldUnion(catalog, catalogType, field);
        if (!catalogValues.length || sameSet(moduleValues, catalogValues)) continue;
        pairs.push({ usecaseId, entityId, connectionId: row.connectionId, operationId: row.operationId, field, side, catalogType, moduleValues, catalogValues });
      }
    }
  }
  return pairs;
}

const quote = (values: readonly string[]): string => values.map(value => `'${value}'`).join(' | ');

/** Pairs with a different count of values: no one to one map exists. */
export function unpairedProblems(pairs: readonly ExternalEnumPair[]): string[] {
  return pairs.filter(pair => pair.moduleValues.length !== pair.catalogValues.length).map(pair =>
    `EXTERNAL_ENUM_UNPAIRED: ${pair.entityId}.${pair.field} has ${pair.moduleValues.length} values in the module (${quote(pair.moduleValues)}) and ${pair.catalogValues.length} in ${pair.connectionId}.${pair.operationId} ${pair.catalogType} (${quote(pair.catalogValues)}). No one to one map exists; the L4 and the catalog must agree before this unit is written.`);
}

/** The prompt text for the pairs that have a map to write (same count). */
export function enumMapSection(pairs: readonly ExternalEnumPair[]): string {
  const lines = pairs.map(pair => pair.side === 'input'
    ? `- ${pair.entityId}.${pair.field}, sent to ${pair.connectionId}.${pair.operationId} (${pair.usecaseId}): module values ${quote(pair.moduleValues)} → catalog values ${quote(pair.catalogValues)}.`
    : `- ${pair.entityId}.${pair.field}, returned by ${pair.connectionId}.${pair.operationId} (${pair.usecaseId}): catalog values ${quote(pair.catalogValues)} → module values ${quote(pair.moduleValues)}.`);
  return [
    'The module and the connection name these values differently. Translate at the call, with a typed map and no cast:',
    ...lines,
    'Write one `const` per pair typed `Record<From, To>` (From and To as the types of the call, for example `ListXInput[\'field\']`), with every value of From as a key and a different value of To for each. Pair the values by meaning. Never `as`, `as unknown as` or `as any`.',
  ].join('\n');
}

/** Object literals of `code` and the `key: 'value'` entries of each. */
function literalMaps(code: string): Array<Map<string, string>> {
  const maps: Array<Map<string, string>> = [];
  for (const match of code.matchAll(/\{([^{}]*)\}/gu)) {
    const entries = new Map<string, string>();
    for (const entry of match[1].matchAll(/(?:^|,|\n)\s*['"]?([\w$-]+)['"]?\s*:\s*['"]([^'"]*)['"]/gu)) entries.set(entry[1], entry[2]);
    if (entries.size) maps.push(entries);
  }
  return maps;
}

/** The code has a map for each pair: all From values as keys, each To value once, no value outside the To set. */
export function enumMapProblems(code: string, pairs: readonly ExternalEnumPair[]): string[] {
  const problems: string[] = [];
  const maps = literalMaps(code);
  for (const pair of pairs) {
    const from = pair.side === 'input' ? pair.moduleValues : pair.catalogValues;
    const to = pair.side === 'input' ? pair.catalogValues : pair.moduleValues;
    const candidate = maps.find(map => from.every(value => map.has(value)));
    const label = `${pair.entityId}.${pair.field} (${pair.usecaseId})`;
    if (!candidate) {
      problems.push(`${label}: the module values ${quote(pair.moduleValues)} and the catalog values ${quote(pair.catalogValues)} differ. Write the typed map ${pair.side === 'input' ? 'module → catalog' : 'catalog → module'} with every value of ${quote(from)} as a key.`);
      continue;
    }
    const mapped = from.map(value => candidate.get(value) ?? '');
    const outside = mapped.filter(value => !to.includes(value));
    if (outside.length) problems.push(`${label}: the map has ${outside.map(value => `'${value}'`).join(', ')}, which is not one of ${quote(to)}.`);
    const unpaired = to.filter(value => !mapped.includes(value));
    if (unpaired.length || new Set(mapped).size !== mapped.length) problems.push(`${label}: the map is not one to one: ${unpaired.length ? `${unpaired.map(value => `'${value}'`).join(', ')} has no pair` : 'two values go to the same one'}.`);
  }
  return problems;
}
