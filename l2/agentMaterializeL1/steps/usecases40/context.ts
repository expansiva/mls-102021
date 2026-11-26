/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/context.ts" enhancement="_blank"/>

// What the model sees for one usecase (materializadorL1.md §2.1): the source (the l4 ontology of the entity and
// the text of every rule of the module) and the def as the intent (entity, operation, transition, rulesApplied, effects:
// materializadorL1.md §10), plus the recipe attempt and platform signatures.

import { connectionCatalogSource, siblingDeclarationImports } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { emitUsecase, emittedValueExports, ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { catalogOperations, expectVersionType } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { READ_NEVER_FAILS } from '/_102021_/l2/agentMaterializeL1/helpers/readNeverFails.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { rulesFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { flatFieldsOf, usecaseInputsOf } from '/_102021_/l2/agentMaterializeL1/helpers/m12Required.js';
import { resolveInputType } from '/_102021_/l2/agentMaterializeL1/emitters/typeResolve.js';
import { identityField, versionField } from '/_102021_/l2/agentMaterializeL1/emitters/domainOptional.js';
import { dependencyUnits, recipeDraft, rulesToEnforce, rulesUnbound, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { callInputSourceText, connectionRowsOf, externalEntityIds, externalRepositoryPort, gatewayNameOf, moduleGatewayNames, repositoryPortNames, typeMemberNames, usecaseGate, type M12CallInputs, type M12ChildRecord, type M12ConsumerCall, type M12GatewayOutput, type M12EventPublisher, type M12ParentRule } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { MDM_LIST_USERS_PAGE_SIZE_MAX } from '/_102021_/l2/agentMaterializeL1/helpers/mdmPlatformLimits.js';
import { moduleMdmLinksSection } from '/_102021_/l2/agentMaterializeL1/helpers/m12MdmLinks.js';
import { readNotApplicable, type M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { catalogFilePath, catalogImportPath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { MODULE_EVENT_PUBLISH, publisherNameOf } from '/_102021_/l2/helpers/l1Defs/moduleEvent.js';

export const M12_USECASE_TOOL = 'writeUsecase' as const;

export interface M12UsecaseContext {
  unit: M12Unit;
  functionName: string;
  header: string;
  scaffold: string;
  rules: Array<{ ruleId: string; text: string }>;
  human: string;
}

/** The export lines of a TypeScript source: what another file may use from it. */
export function exportSignatures(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^export\s/u.test(line)) continue;
    if (/^export\s+(interface|type)\s/u.test(line)) {
      // Keep a declared shape whole: it is the contract the model must type against.
      const block = [line];
      let depth = (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);
      // d1_321: a type alias that goes on to the next lines (`export type R =` then `| { … }` per line) is kept whole, up to the `;` that ends it.
      let open = /^export\s+type\s/u.test(line) && !/;\s*$/u.test(line) && !/\{\s*$/u.test(line);
      while ((depth > 0 || open) && index + 1 < lines.length) {
        if (open && depth <= 0 && (lines[index + 1].trim() === '' || /^export\s/u.test(lines[index + 1]))) break;
        index += 1;
        block.push(lines[index]);
        depth += (lines[index].match(/\{/gu)?.length ?? 0) - (lines[index].match(/\}/gu)?.length ?? 0);
        if (depth <= 0 && /;\s*$/u.test(lines[index])) open = false;
      }
      out.push(block.join('\n'));
      continue;
    }
    out.push(line.replace(/\{\s*$/u, '{ … }'));
  }
  return out.join('\n');
}

/** The text of each rule id in `l4/<module>/rules.defs.ts` ("ruleId": "text"). */
export function ruleTexts(source: string | null, ruleIds: readonly string[]): Array<{ ruleId: string; text: string }> {
  return ruleIds.map(ruleId => {
    const escaped = ruleId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const match = source ? new RegExp(`"${escaped}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'u').exec(source) : null;
    return { ruleId, text: match ? JSON.parse(`"${match[1]}"`) as string : '(text not found in rules.defs.ts)' };
  });
}

/** Every rule id of `l4/<module>/rules.defs.ts` ("ruleId": "text" inside "rules"). */
export function allRuleIds(source: string | null): string[] {
  if (!source) return [];
  const at = source.indexOf('"rules"');
  const body = at < 0 ? source : source.slice(at);
  return [...body.matchAll(/"([A-Za-z][A-Za-z0-9_]*)"\s*:\s*"/gu)].map(match => match[1]).filter(id => id !== 'schemaVersion' && id !== 'moduleName');
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * The entities a rule text names, by their l4 title ("item do cardápio" → ItemCardapio). Longer titles are matched
 * first and consume their span, so "item da comanda" does not also count as "comanda".
 */
export function citedEntities(text: string, titles: ReadonlyArray<{ entityId: string; title: string }>): string[] {
  let rest = plain(text);
  const out = new Set<string>();
  for (const { entityId, title } of [...titles].sort((a, b) => b.title.length - a.title.length)) {
    const escaped = plain(title).trim().replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/\s+/gu, '\\s+');
    if (!escaped) continue;
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}s?(?=[^\\p{L}\\p{N}]|$)`, 'gu');
    if (!pattern.test(rest)) continue;
    out.add(entityId);
    rest = rest.replace(pattern, '$1 ');
  }
  return [...out];
}

export interface M12EntityNames {
  entityId: string;
  title: string;
  /** Relationship name and title → target entity ("itens" / "Itens lançados" → ItemComanda). */
  relationships: Array<{ entityId: string; title: string }>;
  /** Record paths the l4 marks `derived` (id and version excluded): calculated, never read from storage. */
  derived: string[];
  /** Entities this one points to by its own foreign key (`ItemComanda.comandaId` → Comanda). */
  parents: string[];
  /** The lifecycle states the l4 gives the entity: each state id and, where an enum field lists it, the title of that state ("open" / "Aberta"). */
  states?: string[];
}

/** The paths of `fields` (nested through `fields`) the ontology marks derived, without id and version. */
function derivedPaths(fields: unknown, prefix = ''): string[] {
  if (!fields || typeof fields !== 'object') return [];
  const out: string[] = [];
  for (const [name, meta] of Object.entries(fields as Record<string, unknown>)) {
    if (!meta || typeof meta !== 'object') continue;
    const path = prefix ? `${prefix}.${name}` : name;
    const field = meta as { derived?: unknown; fields?: unknown };
    if (field.derived === true && path !== 'id' && path !== 'version') out.push(path);
    out.push(...derivedPaths(field.fields, path));
  }
  return out;
}

/** Ids of the lifecycle states of an l4 entity, plus the titles an enum field gives to those same values. */
function lifecycleStateNames(entity: { lifecycleStates?: unknown; record?: { fields?: unknown } }): string[] {
  const ids = Array.isArray(entity.lifecycleStates)
    ? entity.lifecycleStates.map(item => (item && typeof item === 'object' ? (item as { state?: unknown }).state : undefined)).filter((item): item is string => typeof item === 'string' && item !== '')
    : [];
  if (ids.length === 0) return [];
  const names = new Set(ids);
  const fields = entity.record?.fields;
  if (fields && typeof fields === 'object') {
    for (const meta of Object.values(fields as Record<string, unknown>)) {
      const values = meta && typeof meta === 'object' ? (meta as { values?: unknown }).values : undefined;
      if (!Array.isArray(values)) continue;
      for (const item of values) {
        const row = item && typeof item === 'object' ? item as { value?: unknown; title?: unknown } : {};
        if (typeof row.value === 'string' && names.has(row.value) && typeof row.title === 'string' && row.title.trim()) names.add(row.title.trim());
      }
    }
  }
  return [...names];
}

/** True when the rule text names one of the states of the entity (by id or title): the rule then depends on the state of that record. */
export function citesState(text: string, states: readonly string[] | undefined): boolean {
  return citedEntities(text, (states ?? []).map(state => ({ entityId: state, title: state }))).length > 0;
}

/** The title and relationships of an l4 ontology entity; null when the file is not the expected JSON. */
export function ontologyNames(entityId: string, source: string | null): M12EntityNames | null {
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source) : null;
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[1]);
  } catch (error) {
    console.warn(`ontology of ${entityId} is not JSON: ${String(error)}`);
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const entity = value as { title?: unknown; relationships?: unknown; record?: { fields?: unknown } };
  const relationships: Array<{ entityId: string; title: string }> = [];
  const parents: string[] = [];
  if (entity.relationships && typeof entity.relationships === 'object') {
    for (const [name, meta] of Object.entries(entity.relationships as Record<string, unknown>)) {
      const target = meta && typeof meta === 'object' ? (meta as { to?: unknown; title?: unknown; via?: unknown }) : {};
      if (typeof target.to !== 'string') continue;
      if (typeof target.via === 'string' && target.via.startsWith(`${entityId}.`) && !parents.includes(target.to)) parents.push(target.to);
      relationships.push({ entityId: target.to, title: name.replace(/([a-z0-9])([A-Z])/gu, '$1 $2') });
      if (typeof target.title === 'string') relationships.push({ entityId: target.to, title: target.title });
    }
  }
  return typeof entity.title === 'string' ? { entityId, title: entity.title, relationships, derived: derivedPaths(entity.record?.fields), parents, states: lifecycleStateNames(value as { lifecycleStates?: unknown; record?: { fields?: unknown } }) } : null;
}

/** The names of each entity of the module, read from its l4 ontology. */
export async function entityNames(ctx: M12Context): Promise<M12EntityNames[]> {
  const out: M12EntityNames[] = [];
  for (const item of ctx.units.filter(unit => unit.definition.artifactType === 'domainEntity')) {
    const entityId = String(item.definition.data.entityId ?? item.definition.artifactId);
    const names = ontologyNames(entityId, await ctx.read(ontologyRef(item.definition, item.outputRef)));
    if (!names) continue;
    // `derived` on an MDM entity means the platform keeps the field. A read through `ctx.mdm` is legitimate,
    // so those paths stay out of the usecase gate. A module entity with a port still contributes its paths.
    if (item.definition.data.storageTarget === 'mdm' || item.definition.data.storageTarget === 'external') names.derived = [];
    out.push(names);
  }
  return out;
}

/**
 * The names a rule of `entityId`'s usecase may use for an entity: every entity title, plus the relationships of
 * `entityId` ("o subtotal da comanda … dos itens" names ItemComanda through Comanda's relationship `itens`).
 */
export function ruleNames(entityId: string, entities: readonly M12EntityNames[]): Array<{ entityId: string; title: string }> {
  const own = entities.find(entity => entity.entityId === entityId);
  return [...entities.map(entity => ({ entityId: entity.entityId, title: entity.title })), ...(own?.relationships ?? [])];
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

/** `data.derivedRead` when it is the on-read summary. Absent or another shape: null, and the context stays as it is. */
export function derivedReadValue(data: unknown): { sources: string[]; windowField: string; groupBy: string[]; measures: string[] } | null {
  if (!data || typeof data !== 'object') return null;
  const value = (data as { derivedRead?: unknown }).derivedRead;
  if (!value || typeof value !== 'object') return null;
  const row = value as { mode?: unknown; sources?: unknown; windowField?: unknown; groupBy?: unknown; measures?: unknown };
  const strings = (item: unknown): string[] | null => Array.isArray(item) && item.every(part => typeof part === 'string') ? item as string[] : null;
  const sources = strings(row.sources);
  const groupBy = strings(row.groupBy);
  const measures = strings(row.measures);
  if (row.mode !== 'onRead' || !sources || typeof row.windowField !== 'string' || !row.windowField || !groupBy || !measures) return null;
  return { sources, windowField: row.windowField, groupBy, measures };
}

/**
 * The model calculates the summary on read from the list usecases of `sources`.
 * The table and the port of the summary itself are not used.
 */
export function derivedReadSection(
  derived: { sources: readonly string[]; windowField: string; groupBy: readonly string[]; measures: readonly string[] },
  sourceLists: ReadonlyArray<{ entityId: string; importPath: string; signatures: string }>,
): string {
  const lists = derived.sources.map(source => {
    const list = sourceLists.find(item => item.entityId === source);
    const importLine = list?.importPath
      ? [`Import from \`${list.importPath}\`.`, list.signatures].filter(Boolean).join('\n\n')
      : `The list usecase of \`${source}\` is not among the dependencies.`;
    return [`### ${source}`, importLine].join('\n\n');
  });
  const groups = derived.groupBy.map(name => `\`${name}\``).join(', ') || '(none)';
  const measures = derived.measures.map(name => `\`${name}\``).join(', ') || '(none)';
  return section('Derived read', [
    'The summary is calculated on read. Nobody writes this table in alpha.',
    `Window field: \`${derived.windowField}\`. Group by: ${groups}.`,
    `Measures: ${measures}.`,
    'Do not read or write the table of this summary. Do not call `resolveRepository` for this entity.',
    'Calculate it from the list usecases of the sources, by that window and those groups:',
    ...lists,
  ].join('\n\n'));
}

/** `onboarding.companyType` of a project's `l5/config.json` (`<module>.<Entity>`), or empty. */
export function companyTypeOf(configText: string | null): string {
  if (!configText) return '';
  const config = JSON.parse(configText) as { onboarding?: { companyType?: unknown } };
  return typeof config.onboarding?.companyType === 'string' ? config.onboarding.companyType : '';
}

/**
 * The session company is `activeCompanyId`, read from l5. Empty when this module does not own the entity
 * named by `companyType`.
 */
export function sessionCompanyAnchor(moduleName: string, configText: string | null, entityIds: readonly string[]): string {
  const companyType = companyTypeOf(configText);
  const split = companyType.indexOf('.');
  if (split <= 0) return '';
  const typeModule = companyType.slice(0, split);
  const entityId = companyType.slice(split + 1);
  if (typeModule !== moduleName || !entityId || !entityIds.includes(entityId)) return '';
  return section('The company of the session', [
    `The company entity of this module is \`${entityId}\` (\`${companyType}\`, from l5).`,
    'the company of the session is `ctx.sessionContext.activeCompanyId`; the person of the session is `ctx.sessionContext.person.mdmId`.',
    "A read or write of the session's company uses that id; an input id that differs is FORBIDDEN",
    'When `ctx.sessionContext.activeCompanyId` is absent, refuse with an AppError that names it; never use the person of the session as the company.',
  ].join('\n'));
}

/** The connection rows the def of the integration gives to this usecase as consumer. */
function consumerRowsOf(ctx: M12Context, functionName: string, artifactId: string): ReturnType<typeof connectionRowsOf> {
  return ctx.units
    .filter(item => item.definition.artifactType === 'integrationOutbound')
    .flatMap(item => connectionRowsOf(item.definition.data))
    .filter(row => row.consumer === functionName || row.consumer === artifactId);
}

/** The calls the usecase must make, one per connection and operation (d1_219). */
export function consumerCallsOf(ctx: M12Context, functionName: string, artifactId: string): M12ConsumerCall[] {
  const seen = new Set<string>();
  const out: M12ConsumerCall[] = [];
  for (const row of consumerRowsOf(ctx, functionName, artifactId)) {
    const key = `${row.connectionId}.${row.operationId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ connectionId: row.connectionId, operationId: row.operationId });
  }
  return out;
}

/** d1_276: the type the catalog gives the `expectVersion` of the call this usecase makes (`data.externalCall.versionType`), or '' when it has none. */
export function externalVersionOf(unit: M12Unit): string {
  const call = unit.definition.data.externalCall;
  return call && typeof call === 'object' && typeof (call as { versionType?: unknown }).versionType === 'string' ? String((call as { versionType: string }).versionType) : '';
}

/**
 * d1_277: the usecase passes an `expectVersion` the catalog types as `string`: its own outside call does (an entity kept outside), or a call it consumes
 * does (`activate`, a usecase of the module's draft that also calls `activateAgent`). The version of a connection is one (`expectVersionType`).
 */
export async function usecaseStringVersion(ctx: M12Context, unit: M12Unit): Promise<boolean> {
  if (externalVersionOf(unit) === 'string') return true;
  const functions = Array.isArray(unit.definition.data.functions) ? unit.definition.data.functions : [];
  const functionName = String((functions[0] as { functionName?: unknown } | undefined)?.functionName ?? unit.definition.data.usecaseId ?? unit.definition.artifactId);
  for (const call of consumerCallsOf(ctx, functionName, unit.definition.artifactId)) {
    const source = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, call.connectionId)).source;
    const operation = source ? catalogOperations(source)?.find(item => item.operationId === call.operationId) : undefined;
    if (source && operation?.expectsVersion && expectVersionType(source, operation.outputType) === 'string') return true;
  }
  return false;
}

/** d1_313: per call the usecase consumes, the field names of the catalog output type (every member of a union), when the type is a plain object type or a union of them. */
export async function gatewayOutputsOf(ctx: M12Context, functionName: string, artifactId: string): Promise<M12GatewayOutput[]> {
  const out: M12GatewayOutput[] = [];
  for (const call of consumerCallsOf(ctx, functionName, artifactId)) {
    const source = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, call.connectionId)).source;
    const operation = source ? catalogOperations(source)?.find(item => item.operationId === call.operationId) : undefined;
    if (!source || !operation?.outputType) continue;
    const fields = typeMemberNames(catalogTypeBody(source, operation.outputType));
    if (fields) out.push({ operationId: call.operationId, fields });
  }
  return out;
}

/** `data.calls` of the usecase def, as the gate and the context read it (d1_269). Nothing when the def has none. */
export function callInputsOfDef(unit: M12Unit): M12CallInputs[] {
  const value = unit.definition.data.calls;
  return Array.isArray(value) ? value.flatMap(row => row && typeof row === 'object' && typeof (row as { call?: unknown }).call === 'string' && Array.isArray((row as { input?: unknown }).input) ? [row as M12CallInputs] : []) : [];
}

/**
 * d1_313: a type the catalog declares as a union of object types (`type X = { success: true; name } | { success: false; reason }`, with or without a leading `|`),
 * on one line, every member whole. The model reads the fields each answer has, and the gate (`usecaseGate`) refuses a field no member has. '' for anything else.
 */
export function catalogUnionBody(source: string, name: string): string {
  const head = new RegExp(`export\\s+type\\s+${name}\\s*=\\s*`, 'u').exec(source);
  if (!head) return '';
  let depth = 0;
  let end = head.index + head[0].length;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === ';' && depth === 0) break;
  }
  const text = source.slice(head.index + head[0].length, end).replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '').replace(/\s+/gu, ' ').trim().replace(/^\|\s*/u, '');
  const members = text.split(/\}\s*\|\s*(?=\{)/u);
  if (members.length < 2 || !members.every(member => member.trim().startsWith('{'))) return '';
  const whole = members.map((member, index) => (index < members.length - 1 ? `${member.trim()} }` : member.trim())).join(' | ');
  return whole.length <= 900 ? whole : '';
}

/**
 * d1_266: the body of a type the catalog declares (`export interface X { ... }`), on one line, so the model sees the fields the call takes and not only the
 * name of the type (activate passed `{ agentId }` to `CmActivateAgentInput`, which is `{ draftId }`). '' when the source does not declare it or it is long.
 */
export function catalogTypeBody(source: string | null, name: string): string {
  if (!source) return '';
  const union = catalogUnionBody(source, name);
  if (union) return union;
  const start = new RegExp(`export\\s+(?:interface\\s+${name}\\b[^{]*|type\\s+${name}\\s*=\\s*)\\{`, 'u').exec(source);
  if (!start) return '';
  let depth = 1;
  let end = start.index + start[0].length;
  for (; end < source.length && depth > 0; end += 1) {
    if (source[end] === '{') depth += 1;
    else if (source[end] === '}') depth -= 1;
  }
  const body = source.slice(start.index + start[0].length - 1, end).replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '').replace(/\s+/gu, ' ').trim();
  return body.length > 0 && body.length <= 700 ? body : '';
}

/**
 * The catalog types the body of `typeName` names (`CmAgentCard` in `{ agents: CmAgentCard[] }`), the ones the catalog declares, in order, once. `depth` is how
 * many levels down it follows (1: the types the body names; the message of an arrival is three deep: input, module catalog, action), at most `max` types.
 */
export function answerTypeNames(source: string | null, typeName: string, depth = 1, max = 8): string[] {
  const found: string[] = [];
  let level = [typeName];
  for (let step = 0; step < depth && found.length < max; step += 1) {
    const next: string[] = [];
    for (const current of level) {
      const body = catalogTypeBody(source, current);
      if (!body || !source) continue;
      for (const match of body.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/gu)) {
        const name = match[1];
        if (name === typeName || found.includes(name) || found.length >= max) continue;
        if (new RegExp(`export\\s+(?:interface\\s+${name}\\b|type\\s+${name}\\s*=)`, 'u').test(source)) { found.push(name); next.push(name); }
      }
    }
    level = next;
  }
  return found;
}

/**
 * Gateways this usecase consumes: the interface, the import, and only its operations, with the catalog types.
 */
export async function connectionGatewaySection(ctx: M12Context, functionName: string, artifactId: string): Promise<string> {
  const rows = consumerRowsOf(ctx, functionName, artifactId);
  if (rows.length === 0) return '';
  const byConnection = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byConnection.get(row.connectionId) ?? [];
    list.push(row);
    byConnection.set(row.connectionId, list);
  }
  const importPath = `/_${ctx.run.project}_/l1/${ctx.run.module}/layer_1_external/adapters/integration/outbound.js`;
  const blocks: string[] = [
    `Import the gateway type with \`import type { … } from '${importPath}'\`.`,
    'Resolve it with `resolveRepository<<Connection>Gateway>(ctx, \'<Connection>Gateway\')`, then call `gateway.<operation>(input, ctx)`, `gateway.<operation>(input, ctx, opts)` or `gateway.<operation>(input, ctx, opts, context)`.',
    'The agent and the other fields of `ConnectionContext` the caller may set go in the fourth parameter (`{ agentId }`). The session sets `actorMdmId`; the caller does not.',
    'Pass `opts.idempotencyKey` only when an l4 rule asks for it. The gateway does not invent a key.',
    'Let an error from the gateway propagate. Do not catch it and replace it with a generic message.',
    'Do not write HTTP. Do not import `callConnection`. Do not redeclare the catalog types: they are imported by the gateway file.',
    'The def names this usecase the consumer of every operation listed below: the file must call each one as `gateway.<operation>(…)`. A listed operation that is not called refuses the file.',
  ];
  const external = externalEntityIds(ctx.units);
  // d1_265: the entity the usecase works on decides, not the entities the call names: the cm call `activateAgent` names the external `Agent`, but the
  // usecase `activate` moves the AgentDraft, which the module stores, so its transition is written on the module copy and the gateway is called too.
  const own = ctx.units.find(item => item.definition.artifactType === 'usecase' && item.definition.artifactId === artifactId)?.definition.data.entityId;
  const ownEntity = typeof own === 'string' && own ? own : '';
  const keptOutside = ownEntity ? external.has(ownEntity) : rows.some(row => row.entityRefs.some(entity => external.has(entity)));
  if (keptOutside) {
    blocks.push('The entity is kept outside this module. Read and write it only through the gateway. Do not call `resolveRepository` for the entity repository, do not use `ctx.mdm` for it, and do not use a table.');
  } else if (ownEntity || rows.some(row => row.entityRefs.length > 0)) {
    blocks.push('The entity is stored in this module and also lives in the system outside. Keep the repository for the module copy and call the gateway for the operations below, in the order the l4 rules under "Rules" say. The gateway call is not optional: it is how the change reaches the system outside.');
  }
  for (const connectionId of [...byConnection.keys()].sort()) {
    const gateway = gatewayNameOf(connectionId);
    const catalogSource = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, connectionId)).source;
    const catalog = (catalogSource ? catalogOperations(catalogSource) : null) ?? [];
    const lines = (byConnection.get(connectionId) ?? []).map(row => {
      const operation = catalog.find(item => item.operationId === row.operationId);
      const effect = row.effect ? ` Covers effect \`${row.effect}\`.` : '';
      if (!operation) return `- \`${row.operationId}\`: the catalog does not list this operation.${effect}`;
      const version = operation.expectsVersion
        ? ` The usecase receives \`expectVersion\` in its input (what the screen sent, from the \`version\` it read), typed \`${expectVersionType(catalogSource ?? '', operation.outputType)}\` as the catalog types the \`version\` of the answer: it passes it on as it is in \`opts\` (\`{ expectVersion }\`), never converted (no \`Number(...)\`), and does not put it in the catalog \`input\`. When it is missing the gateway answers \`invalid\`.`
        : '';
      const later = operation.reply === 'later'
        ? ` The method returns the id of the work (\`${operation.outputType}\`). The usecase returns that id as its output and does not wait for the result. Do not create a column or a correlation table for it. Store it only when an l4 rule or entity says to store it. The result arrives later through the serve operation \`${operation.resultOperation}\`.`
        : '';
      // d1_278: the fields of the answer reach the model, one level down: `CmListAgentsOutput` is `{ agents: CmAgentCard[] }` and the card is what the
      // answer carries (no `definition`). Without it the model guessed the field it needed and annotated the result `unknown`.
      const shapes = [operation.inputType, operation.outputType, ...answerTypeNames(catalogSource, operation.outputType)].flatMap(name => {
        const body = catalogTypeBody(catalogSource, name);
        return body ? [`\`${name}\` is \`${body}\``] : [];
      });
      const typed = shapes.length ? ` The catalog types: ${shapes.join('; ')}. The call takes the fields of the input type, none else.` : '';
      // d1_269: the def says where a required field no field of the usecase names comes from; the model builds it from there.
      const own = ctx.units.find(item => item.definition.artifactType === 'usecase' && item.definition.artifactId === artifactId);
      const chosen = (own ? callInputsOfDef(own) : []).find(item => item.call === `${connectionId}.${row.operationId}`)?.input ?? [];
      const sources = chosen.length
        ? ` The def says where ${chosen.map(item => `\`${item.field}\``).join(', ')} comes from, and the usecase input does not declare it: ${chosen.map(item => `\`${item.field}\` is ${callInputSourceText(item.from)}`).join('; ')}. Build it from that source.`
        : '';
      return `- \`${operation.operationId}(input: ${operation.inputType}, ctx: RequestContext, opts?: CallConnectionOptions, context?: GatewayCallContext): Promise<${operation.outputType}>\`.${effect}${typed}${sources}${version}${later}`;
    });
    blocks.push([
      `### ${gateway}`,
      `\`import type { ${gateway} } from '${importPath}'\`.`,
      `\`const gateway = resolveRepository<${gateway}>(ctx, '${gateway}');\``,
      ...lines,
    ].join('\n'));
  }
  return section('Connection gateways', blocks.join('\n\n'));
}

/**
 * Events this usecase publishes (d1_216): the effects of its def that the module's `integrationOutbound` binds to the platform
 * publisher. The publisher function of each is in the generated `outbound.ts`.
 */
export function eventPublishersOf(ctx: M12Context, unit: M12Unit): Array<M12EventPublisher & { on: string }> {
  const effects = Array.isArray(unit.definition.data.effects) ? unit.definition.data.effects : [];
  const wanted = new Set(effects.map(item => (item && typeof item === 'object' ? String((item as { eventId?: unknown }).eventId ?? '') : '')).filter(Boolean));
  if (wanted.size === 0) return [];
  const out: Array<M12EventPublisher & { on: string }> = [];
  for (const item of ctx.units) {
    if (item.definition.artifactType !== 'integrationOutbound') continue;
    const events = Array.isArray(item.definition.data.events) ? item.definition.data.events : [];
    for (const event of events) {
      if (!event || typeof event !== 'object') continue;
      const row = event as Record<string, unknown>;
      const eventId = String(row.eventId ?? '');
      if (!wanted.has(eventId) || row.mechanism !== MODULE_EVENT_PUBLISH.symbol || row.mechanismRef !== MODULE_EVENT_PUBLISH.path) continue;
      if (!out.some(publisher => publisher.eventId === eventId)) out.push({ eventId, fn: publisherNameOf(eventId), on: String(row.on ?? '') });
    }
  }
  return out.sort((a, b) => a.eventId.localeCompare(b.eventId));
}

/**
 * d1_221: the entities this usecase records with the one it writes. The D1 gave the def the port of each as a dependency (the entity the
 * L4 says its parent writes), so the port of an entity other than its own, in the module database, is one to create through.
 */
export function childRecordsOf(ctx: M12Context, unit: M12Unit): M12ChildRecord[] {
  const own = String(unit.definition.data.entityId ?? '');
  const external = externalEntityIds(ctx.units);
  const out: M12ChildRecord[] = [];
  for (const dep of dependencyUnits(ctx, unit)) {
    if (dep.definition.artifactType !== 'repositoryPort') continue;
    const entityId = String(dep.definition.data.entityId ?? '');
    if (!entityId || entityId === own || external.has(entityId) || out.some(item => item.entityId === entityId)) continue;
    out.push({ entityId, port: dep.definition.artifactId });
  }
  return out.sort((a, b) => a.entityId.localeCompare(b.entityId));
}

/** A field of the child the usecase fills, with where its value comes from. */
export interface M12ChildField {
  path: string;
  type: string;
  required: boolean;
  origin: string;
}

export interface M12ChildRecordFields extends M12ChildRecord {
  parentId: string;
  fields: M12ChildField[];
}

/**
 * d1_224/d1_227: the fields of each entity the usecase records, from the def of the entity (name, type, `ref`, derived) and the type the compiler
 * sees (which are optional). Every field the record needs has one origin, said by code and the same in every usecase:
 * - the identity and the version are the ones the module gives any new record (`serverAssigned`: `ctx.idGenerator.newId()` and `1`);
 * - a derived timestamp is the moment of the write, `ctx.clock.nowIso()`;
 * - a reference to the entity this usecase writes is its identity; a reference to an entity kept in the platform is the person of the session,
 *   `ctx.sessionContext.person.mdmId` (and nothing else: not `actorId`); any other reference comes from the input;
 * - the rest is a value of the step: the input or the answer of the outside call.
 * A derived field with no such origin (a calculation), and an object that only holds the members listed below it, are not listed.
 */
export async function childRecordFieldsOf(ctx: M12Context, unit: M12Unit): Promise<M12ChildRecordFields[]> {
  const parentId = String(unit.definition.data.entityId ?? '');
  const out: M12ChildRecordFields[] = [];
  for (const record of childRecordsOf(ctx, unit)) {
    const entity = ctx.units.find(item => item.definition.artifactType === 'domainEntity' && String(item.definition.data.entityId ?? '') === record.entityId);
    const defined = Array.isArray(entity?.definition.data.fields) ? entity.definition.data.fields as Array<Record<string, unknown>> : [];
    const identity = entity ? identityField(entity.definition) : '';
    const version = entity ? versionField(entity.definition, identity) : '';
    const generated = entity ? await readOptional(entity.output) : null;
    const resolved = generated ? await resolveInputType({ entry: generated, typeName: record.entityId, readImport: async () => null }) : null;
    const known = new Map(flatFieldsOf(resolved?.text ?? '').map(field => [field.path, field.optional]));
    const storedInPlatform = (entityId: string): boolean => ctx.units.some(item => item.definition.artifactType === 'domainEntity'
      && String(item.definition.data.entityId ?? '') === entityId && item.definition.data.storageTarget === 'mdm');
    const fields: M12ChildField[] = [];
    for (const field of defined) {
      const path = String(field.name ?? '');
      const type = String(field.type ?? '');
      if (!path || type === 'object') continue;
      const ref = typeof field.ref === 'string' ? field.ref : '';
      const derived = field.derived === true;
      let origin = '';
      if (path === identity) origin = 'the identity of a new record: `ctx.idGenerator.newId()`';
      else if (path === version) origin = 'the version of a new record: `1`';
      else if (derived && type === 'timestamp') origin = 'the moment of the write: `ctx.clock.nowIso()`';
      else if (derived) continue;
      else if (ref === parentId) origin = `the identity of the ${parentId} this usecase writes`;
      else if (ref && storedInPlatform(ref)) origin = `${ref}, the person of the session: \`ctx.sessionContext.person.mdmId\` (not \`actorId\`); when the session has no person, throw an error that names the field`;
      else if (ref) origin = `${ref}: the id of that record, from the input; if the input does not carry it, throw an error that names the field`;
      else if (type === 'timestamp') origin = 'the moment of the write: `ctx.clock.nowIso()`';
      else origin = 'a value of the step: the input of this usecase or the answer of the outside call, never a default';
      fields.push({ path, type: ref ? `reference to ${ref}` : type, required: known.has(path) ? known.get(path) === false : true, origin });
    }
    out.push({ ...record, parentId, fields });
  }
  return out;
}

/** Unique keys of the entity table (`table` def, `uniqueKeys`) and the error the generated repository throws on a repeat. '' when the table has none. */
export function repositoryUniqueKeySection(units: readonly { definition: { artifactType: string; data: Record<string, unknown> } }[], entityId: string): string {
  if (!entityId) return '';
  const table = units.find(item => item.definition.artifactType === 'table' && String(item.definition.data.entityId ?? '') === entityId);
  const keys = table && Array.isArray(table.definition.data.uniqueKeys)
    ? table.definition.data.uniqueKeys.filter((key): key is string[] => Array.isArray(key) && key.every(field => typeof field === 'string') && key.length > 0)
    : [];
  if (!keys.length) return '';
  return `Unique keys: ${keys.map(key => `(${key.join(', ')})`).join(', ')}. On a violation, the repository \`create\` throws \`AppError('CONFLICT', 'Unique key already stored.', 409)\`.`;
}

/** What the model must do for each entity the usecase records with its parent: resolve the port and create, after the outside call when there is one; and the fields. */
export function childRecordSection(records: readonly M12ChildRecordFields[] | readonly M12ChildRecord[], afterOperations: readonly string[]): string {
  if (records.length === 0) return '';
  const order = afterOperations.length
    ? `The entity this usecase writes lives outside the module: record the child only once the call to ${afterOperations.map(operation => `\`${operation}\``).join(', ')} has answered with success, never before it and never when it refused.`
    : 'Record the child after the write of the entity, in the same transaction, so both are saved or neither is.';
  const listed = (records as readonly Partial<M12ChildRecordFields>[]).flatMap(record => record.fields?.length
    ? [`Fields of ${record.entityId} (a missing one is an error that names it, not a value made up):`, ...record.fields.map(field => `- ${field.path} (${field.type}, ${field.required ? 'required' : 'optional'}): ${field.origin}`)]
    : []);
  return section('Records this usecase writes with its entity', [
    'The L4 says the entity below has no step of its own: the usecase that writes its parent records it. Each one is a port dependency of this usecase.',
    ...records.map(record => `- ${record.entityId}: \`const repository = resolveRepository<${record.port}>(ctx, '${record.port}')\`, then \`await repository.create(record)\`.`),
    order,
    'The fields the system fills (who did it, when, the id of the entity written) come from `ctx` and from the answer of the write. A value the L4 does not give is not made up: if one is missing, say so in the error, do not use a default.',
    ...(listed.length ? [listed.join('\n')] : []),
  ].join('\n\n'));
}

/** What the model must do for each event of the usecase: publish it after the write, in the transaction, with the bound context. */
export function eventPublishSection(ctx: M12Context, publishers: ReadonlyArray<M12EventPublisher & { on: string }>): string {
  if (publishers.length === 0) return '';
  const importPath = `/_${ctx.run.project}_/l1/${ctx.run.module}/layer_1_external/adapters/integration/outbound.js`;
  const lines = publishers.map(item => `- \`${item.fn}(payload: unknown, ctx: RequestContext, opts?: { requestId?: string }): Promise<{ eventId: string }>\` publishes \`${item.eventId}\`${item.on ? `, which the module raises when ${item.on} happens` : ''}.`);
  return section('Events this usecase publishes', [
    `This usecase publishes the events below after it writes. Import the functions with \`import { ${publishers.map(item => item.fn).join(', ')} } from '${importPath}'\`.`,
    ...lines,
    'The payload is the record this usecase just saved, as stored. Do not send a partial object.',
    'Write and publish in one transaction: `return ctx.data.moduleData.runInTransaction(async (tx) => { const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }; … })`. Resolve the repository with `bound`, write, then `await` the publisher.',
    'The second argument of the publisher is that `bound`. Never `ctx` outside the transaction, never an object literal, never a copy that sets `moduleId`: the platform refuses an event whose module is not the one running, and queues it in the transaction of the context it receives.',
    'A refused event throws and the transaction rolls back. Do not catch the error, do not use `.catch`, and do not call the publisher without `await`. Do not write the queue yourself.',
  ].join('\n\n'));
}

function fence(lang: string, text: string): string {
  return `\`\`\`${lang}\n${text.trim()}\n\`\`\``;
}

export async function loadUsecaseContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<M12UsecaseContext> {
  const [functionName] = emittedValueExports(unit.definition);
  if (!functionName) throw new Error(`FUNCTION_MISSING: ${unit.defRef} has no function.${unit.planIssue ? ` ${unit.planIssue}` : ''}`);
  const scaffoldResult = await emitUsecase(unit.definition, unit.outputRef, ctx.read);
  if ('code' in scaffoldResult) throw new Error(`${scaffoldResult.code}: ${scaffoldResult.detail}`);
  const scaffold = scaffoldResult.source;
  const header = scaffold.split('\n')[0];
  const ruleIds = rulesToEnforce(unit.definition);
  const unboundIds = rulesUnbound(unit.definition);
  const externalWrite = externalEntityIds(ctx.units).has(String(unit.definition.data.entityId ?? '')) && String(unit.definition.data.operation ?? '') !== 'list' && String(unit.definition.data.operation ?? '') !== 'get';
  const rulesSource = await readOptional(rulesFile(ctx.run.project, ctx.run.module));
  const rules = ruleTexts(rulesSource, ruleIds);
  const unbound = ruleTexts(rulesSource, unboundIds);

  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the usecase \`${functionName}\` of module ${ctx.run.module}, file \`${unit.outputRef}\`.`,
    `Keep the exported function name and the exported type names of the scaffold. Its input members follow from the operation and the entity, and are a hint: the input accepts what the entity accepts by the l4, so a field the system sets (the initial state, a number from a sequence, a field of another operation, a value a rule copies) is not an input and is set here.`,
    ruleIds.length && externalWrite
      ? `The entity is external: the external system meets the rules listed under "Rules" through the call, so no local check duplicates them. Let the error of the gateway through with its own code, message and status (\`conflict\`, \`refused\`…); do not replace it. If you catch an AppError of the gateway only to add context, rethrow \`new AppError(error.code, error.message, error.statusCode, { ruleIds: [${ruleIds.map(ruleId => JSON.stringify(ruleId)).join(', ')}] })\`: the code and the message stay the system's, and the details carry the rule ids of this write. Return notApplicable: [].`
      : ruleIds.length
      ? `Enforce each rule listed under "Rules this usecase must apply". Each one throws \`new AppError(<code>, <message>, <status>, { ruleId: "<ruleId>" })\` when it is broken, with the rule id written as that exact string literal. A rule in that list that does not concern this operation (its text is about another entity or operation) goes to \`notApplicable\` with the reason, instead of a check that makes no sense. A rule under "Rules of this entity that no transition binds" is not listed in \`notApplicable\`.`
      : 'The def has no rule to enforce beyond its operation. Return notApplicable: [].',
  ].join('\n')));
  const operationOfUnit = String(unit.definition.data.operation ?? '');
  if (operationOfUnit === 'list' || operationOfUnit === 'get') parts.push(section('A read does not fail for a missing item', READ_NEVER_FAILS));
  const arrival = arrivalOf(ctx, unit);
  if (arrival) {
    parts.push(section('Arrival (process transitions, from the def)', [
      `This update is the arrival of a message from outside. It moves the record only through the transitions the def lists (\`arrivalTransitions\`: ${arrival.transitions.map(item => `${item.transitionId}: ${item.from.join(', ')} → ${item.to}`).join('; ')}), which no person makes.`,
      arrival.stateFrom
        ? `The message names the state in its field \`${arrival.stateFrom}\` (${[...new Set(arrival.transitions.map(item => item.to))].map(state => `'${state}'`).join(' | ')}), and the input of this usecase carries it as \`${arrival.stateFrom}\` with those values. Choose the transition by it and set \`${arrival.stateField || 'the state field'}\` to the literal of that transition, as in \`${arrival.stateField || 'status'}: input.${arrival.stateFrom} === '${arrival.transitions[0].to}' ? '${arrival.transitions[0].to}' : '${arrival.transitions[1]?.to ?? arrival.transitions[0].to}'\`: every state the transitions lead to is written as a literal and the field is never copied as it is (\`${arrival.stateField || 'status'}: input.${arrival.stateFrom}\` is refused). Check that the current state of the record is the from of the transition you took, refuse the arrival when it is not, and apply the rules of that transition.`
        : `When the arrival moves the state, take the transition whose from holds the current state of the record and whose to is the state the arrival names; set \`${arrival.stateField || 'the state field'}\` to that literal state (${arrival.transitions.map(item => `'${item.to}'`).join(' or ')}) and refuse the arrival when no listed transition fits. Never read the state from the input and never set a state no transition leads to; apply the rules of the transition you took.`,
      'The message carries no version of the record: the input declares no `version` and the file never reads `input.version`. Read the record, check that its state allows the transition, and let the repository keep the version.',
    ].join('\n')));
  }
  const entityRef = ontologyRef(unit.definition, unit.outputRef);
  const ontology = await ctx.read(entityRef);
  if (ontology) parts.push(section(`l4 ontology of the entity ${entityRef} (source)`, fence('ts', ontology.slice(0, 30000))));
  // The def carries the intent only (§10): entity, operation, transition, the rules to apply and the effects.
  parts.push(section('Definition (the intent: entity, operation, transitionRef, rulesApplied, effects; the how is yours, by the l4)', fence('json', JSON.stringify(unit.declared, null, 2))));
  parts.push(section('Scaffold (keep the exported names; the input members are a hint)', fence('ts', scaffold)));
  const draft = await recipeDraft(ctx, unit);
  parts.push(section('Recipe attempt', 'source' in draft
    ? ['The deterministic recipe produced this file. Keep what is right; it is a draft, not the answer.', fence('ts', draft.source.slice(0, 16000))].join('\n\n')
    : `The deterministic recipe could not produce this usecase: ${draft.refusal.slice(0, 16000)}`));
  if (rules.length) parts.push(section('Rules this usecase must apply (rulesApplied, with the l4 text; enforce each one, or declare it notApplicable with the reason)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  if (unbound.length) parts.push(section('Rules of this entity that no transition binds', [
    'Honor those this operation governs; an `AppError` with `ruleId` only when the rule refuses something here.',
    ...unbound.map(rule => `- ${rule.ruleId}: ${rule.text}`),
  ].join('\n')));
  const authority = ctx.units.find(item => item.definition.artifactType === 'authorityMap');
  if (authority) {
    const authoritySource = await readOptional(authority.output) ?? JSON.stringify(authority.definition.data);
    parts.push(section('Actors of the authorityMap', authorityActorsText(authorityActorIds(authoritySource))));
  }
  const shownRuleIds = new Set([...ruleIds, ...unboundIds]);
  const others = ruleTexts(rulesSource, allRuleIds(rulesSource).filter(ruleId => !shownRuleIds.has(ruleId)));
  if (others.length) parts.push(section('Other rules of the module (l4 text: a rule about this entity and operation that the def missed is enforced here too)', others.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  const dependencies = dependencyUnits(ctx, unit);
  const externalIds = externalEntityIds(ctx.units);
  for (const dep of dependencies) {
    if (dep.definition.artifactType === 'repositoryPort' && externalIds.has(String(dep.definition.data.entityId ?? ''))) continue;
    const generated = await readOptional(dep.output);
    parts.push(section(`Dependency ${dep.definition.artifactType} ${dep.definition.artifactId}`, [
      `Import from \`/${dep.outputRef.replace(/\.ts$/u, '.js')}\`.`,
      generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(dep.definition.data, null, 2)),
    ].join('\n\n')));
  }
  const derived = derivedReadValue(unit.definition.data);
  if (derived) {
    const lists: Array<{ entityId: string; importPath: string; signatures: string }> = [];
    for (const source of derived.sources) {
      const dep = dependencies.find(item => item.definition.artifactType === 'usecase'
        && String(item.definition.data.entityId ?? '') === source
        && String(item.definition.data.operation ?? '') === 'list');
      if (!dep) {
        lists.push({ entityId: source, importPath: '', signatures: '' });
        continue;
      }
      const generated = await readOptional(dep.output);
      lists.push({
        entityId: source,
        importPath: `/${dep.outputRef.replace(/\.ts$/u, '.js')}`,
        signatures: generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(dep.definition.data, null, 2)),
      });
    }
    parts.push(derivedReadSection(derived, lists));
  }
  // Another entity a rule of this usecase names: its entity and port files, so a field is read by its name and not
  // guessed (createItemComanda read the menu price as `details.preco`; it is `details.precoVigente`). The rules are
  // the def's and the module rules that name this entity; an entity no such rule names is not sent.
  const entityId = String(unit.definition.data.entityId ?? '');
  const titles = ruleNames(entityId, await entityNames(ctx));
  const ruleScope = [...rules, ...others.filter(rule => citedEntities(rule.text, titles).includes(entityId))];
  const citedBy = new Map<string, string[]>();
  for (const rule of ruleScope) {
    for (const cited of citedEntities(rule.text, titles)) {
      if (cited !== entityId) citedBy.set(cited, [...(citedBy.get(cited) ?? []), rule.ruleId]);
    }
  }
  const sent = new Set(dependencies.map(dep => dep.defRef));
  for (const item of ctx.units) {
    if (item.definition.artifactType !== 'domainEntity' && item.definition.artifactType !== 'repositoryPort') continue;
    const citedEntityId = String(item.definition.data.entityId ?? '');
    if (item.definition.artifactType === 'repositoryPort' && externalIds.has(citedEntityId)) continue;
    const ruleIds = citedBy.get(citedEntityId);
    if (!ruleIds || sent.has(item.defRef)) continue;
    const generated = await readOptional(item.output);
    const shown = generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(item.definition.data, null, 2));
    const heading = `Entity cited by a rule: ${item.definition.artifactType} ${item.definition.artifactId} (${ruleIds.join(', ')})`;
    const importFrom = `Import from \`/${item.outputRef.replace(/\.ts$/u, '.js')}\`.`;
    if (item.definition.artifactType === 'domainEntity' && item.definition.data.storageTarget === 'external') {
      parts.push(section(heading, [
        'The entity is kept outside this module. Read and write it only through the connection gateway.',
        'Do not call `resolveRepository` for its repository, do not use `ctx.mdm` for it, and do not use a table.',
        shown,
      ].join('\n\n')));
      continue;
    }
    if (item.definition.artifactType === 'domainEntity' && item.definition.data.storageTarget === 'mdm') {
      const citedOntology = await ctx.read(ontologyRef(item.definition, item.outputRef));
      parts.push(section(heading, [
        importFrom,
        'Read it from the platform MDM; it has no repository port in this module.',
        mdmContextSection(ctx.run.module, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [], await ctx.read(MDM_MODULE_REF), entitySubtype(citedOntology)),
        shown,
      ].join('\n\n')));
      continue;
    }
    parts.push(section(heading, [
      `${importFrom} Read its records through this port and its fields by these names.`,
      shown,
    ].join('\n\n')));
  }
  // A sibling the recipe derived for the same entity: how this codebase reads ports and builds outputs.
  const sibling = ctx.units.find(item => item !== unit && item.definition.artifactType === 'usecase' && String(item.definition.data.entityId ?? '') === entityId);
  const siblingSource = sibling ? await readOptional(sibling.output) : null;
  if (sibling && siblingSource) parts.push(section(`Example: ${sibling.unitId} (derived by the recipe, same entity)`, fence('ts', siblingSource.slice(0, 12000))));
  if (usesMdm(unit)) {
    const platformRuleIds = (Array.isArray(unit.definition.data.rulePlan) ? unit.definition.data.rulePlan : [])
      .map(row => (row && typeof row === 'object' ? String((row as { ruleId?: unknown }).ruleId ?? '') : ''))
      .filter(ruleId => ruleId.startsWith('rule-'));
    parts.push(section('The platform MDM (source: how the engine stores and returns this entity today)', mdmContextSection(ctx.run.module, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [...new Set(platformRuleIds)], await ctx.read(MDM_MODULE_REF), entitySubtype(ontology), mdmBoundCalls(unit.definition.data))));
  }
  const links = await moduleMdmLinksSection(ctx);
  if (links) parts.push(section('Links of the platform MDM (source: the compact keys each link is stored under)', links));
  const companyAnchor = sessionCompanyAnchor(
    ctx.run.module,
    await ctx.read(`_${ctx.run.project}_/l5/config.json`),
    ctx.units.map(item => String(item.definition.data.entityId ?? '')),
  );
  if (companyAnchor) parts.push(companyAnchor);
  if (String(unit.definition.data.operation ?? '') === 'create') {
    const unique = repositoryUniqueKeySection(ctx.units, entityId);
    if (unique) parts.push(section(`Unique keys of ${entityId}`, unique));
  }
  const gateways = await connectionGatewaySection(ctx, functionName, unit.definition.artifactId);
  if (gateways) parts.push(gateways);
  const publishing = eventPublishSection(ctx, eventPublishersOf(ctx, unit));
  if (publishing) parts.push(publishing);
  const recording = childRecordSection(await childRecordFieldsOf(ctx, unit), consumerCallsOf(ctx, functionName, unit.definition.artifactId).map(call => call.operationId));
  if (recording) parts.push(recording);
  for (const ref of [PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry]) {
    const text = await ctx.read(ref);
    if (text) parts.push(section(`Platform ${ref}`, [`Import from \`/${ref.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(text))].join('\n\n')));
  }
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  return { unit, functionName, header, scaffold, rules, human: parts.join('\n') };
}

/**
 * d1_259 s1c: the process transitions a `serve` arrival applies through this `update` (the def lists them with from, to and rules) and the field that
 * holds the state: the enum field `status` of the entity's domain def, or its only enum field. Undefined when the def lists none.
 */
export function arrivalOf(ctx: M12Context, unit: M12Unit): { transitions: Array<{ transitionId: string; to: string; from: string[] }>; stateField: string; stateFrom?: string } | undefined {
  const listed = unit.definition.data.arrivalTransitions;
  if (String(unit.definition.data.operation ?? '') !== 'update' || !Array.isArray(listed) || listed.length === 0) return undefined;
  const transitions = listed.flatMap(item => {
    const row = item && typeof item === 'object' ? item as { transitionId?: unknown; to?: unknown; from?: unknown } : {};
    return typeof row.transitionId === 'string' && typeof row.to === 'string'
      ? [{ transitionId: row.transitionId, to: row.to, from: Array.isArray(row.from) ? row.from.filter((state): state is string => typeof state === 'string') : [] }]
      : [];
  });
  if (transitions.length === 0) return undefined;
  const entityId = String(unit.definition.data.entityId ?? '');
  const domain = ctx.units.find(item => item.definition.artifactType === 'domainEntity' && String(item.definition.data.entityId ?? item.definition.artifactId) === entityId);
  const fields = Array.isArray(domain?.definition.data.fields) ? domain.definition.data.fields as Array<{ name?: unknown; type?: unknown }> : [];
  const enums = fields.filter(field => field.type === 'enum' && typeof field.name === 'string').map(field => String(field.name));
  const stateFrom = unit.definition.data.stateFrom;
  return { transitions, stateField: enums.includes('status') ? 'status' : enums.length === 1 ? enums[0] : '', ...(typeof stateFrom === 'string' && stateFrom ? { stateFrom } : {}) };
}

/** For a transition usecase, its id and target state from the l4 lifecycle (`transitions[].to`); null otherwise. */
export async function transitionOf(ctx: M12Context, unit: M12Unit): Promise<{ transitionId: string; to: string } | undefined> {
  if (String(unit.definition.data.operation ?? '') !== 'transition') return undefined;
  const lifecycle = unit.definition.data.lifecycle;
  const transitionId = String(unit.definition.data.transitionRef ?? '')
    || (lifecycle && typeof lifecycle === 'object' ? String((lifecycle as { transitionId?: unknown }).transitionId ?? '') : '');
  if (!transitionId) return undefined;
  const source = await ctx.read(ontologyRef(unit.definition, unit.outputRef));
  return transitionTarget(source, transitionId);
}

/** The `to` of a transition in an l4 ontology source. */
export function transitionTarget(source: string | null, transitionId: string): { transitionId: string; to: string } | undefined {
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source) : null;
  if (!match) return undefined;
  try {
    const value = JSON.parse(match[1]) as { transitions?: unknown };
    const list = Array.isArray(value.transitions) ? value.transitions : [];
    const found = list.find(item => item && typeof item === 'object' && (item as { transitionId?: unknown }).transitionId === transitionId) as { to?: unknown } | undefined;
    return typeof found?.to === 'string' ? { transitionId, to: found.to } : undefined;
  } catch (error) {
    console.warn(`ontology is not JSON: ${String(error)}`);
    return undefined;
  }
}

/** Module rules whose text names a parent of this usecase's entity, each with the port that reads that parent. */
export async function parentRulesOf(ctx: M12Context, unit: M12Unit, entities: readonly M12EntityNames[]): Promise<M12ParentRule[]> {
  const entityId = String(unit.definition.data.entityId ?? '');
  const own = entities.find(entity => entity.entityId === entityId);
  if (!own || own.parents.length === 0) return [];
  const externalIds = externalEntityIds(ctx.units);
  const portOf = new Map(ctx.units
    .filter(item => item.definition.artifactType === 'repositoryPort' && !externalIds.has(String(item.definition.data.entityId ?? '')))
    .map(item => [String(item.definition.data.entityId ?? ''), item.definition.artifactId] as const));
  const rulesSource = await readOptional(rulesFile(ctx.run.project, ctx.run.module));
  const titles = ruleNames(entityId, entities);
  const out: M12ParentRule[] = [];
  for (const rule of ruleTexts(rulesSource, allRuleIds(rulesSource))) {
    const parents = citedEntities(rule.text, titles)
      // d1_306: citing the parent is not enough: the rule must also name a state of it, which is what the gate asks the file to check.
      .filter(cited => own.parents.includes(cited) && portOf.has(cited) && citesState(rule.text, entities.find(entity => entity.entityId === cited)?.states))
      .map(cited => ({ entityId: cited, port: portOf.get(cited)! }));
    if (parents.length) out.push({ ruleId: rule.ruleId, parents });
  }
  return out;
}

export const MDM_ONTOLOGY_REF = '_102034_/l4/ontology/mdm.defs.ts';
export const MDM_FACADE_REF = '_102034_/l1/mdm/layer_3_usecases/mdmFacade.ts';
export const MDM_MODULE_REF = '_102034_/l1/mdm/module.ts';

const PLATFORM_API_RULE = 'A value or a rule the platform API gives is used through it, never rebuilt from other fields or reimplemented.';
const PLATFORM_RECORD_RULE = 'A platform record is built in its exported shape; server-owned fields come from the server.';

/** One MDM call the usecase def binds (`data.mdm.calls`: `target` + `method`). */
export interface MdmBoundCall {
  target: string;
  method: string;
  /** One of several ways to reach the same result: the code need not call it. */
  alternative: boolean;
}

const MDM_TARGET_CLASS: Record<string, string> = {
  entity: 'MdmEntity',
  prospect: 'MdmProspect',
  collection: 'MdmCollection',
  attachment: 'MdmAttachment',
  identity: 'MdmIdentity',
};

/** Calls the def binds. Empty when `data.mdm.calls` is absent. */
export function mdmBoundCalls(data: { mdm?: unknown }): MdmBoundCall[] {
  const mdm = data.mdm;
  if (!mdm || typeof mdm !== 'object' || Array.isArray(mdm)) return [];
  const calls = (mdm as { calls?: unknown }).calls;
  if (!Array.isArray(calls)) return [];
  const out: MdmBoundCall[] = [];
  for (const item of calls) {
    if (!item || typeof item !== 'object') continue;
    const target = String((item as { target?: unknown }).target ?? '');
    const method = String((item as { method?: unknown }).method ?? '');
    if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(target) || !/^[A-Za-z][A-Za-z0-9]*$/u.test(method)) continue;
    const alternative = (item as { alternative?: unknown }).alternative === true;
    const same = out.find(call => call.target === target && call.method === method);
    if (same) same.alternative = same.alternative && alternative;
    else out.push({ target, method, alternative });
  }
  return out;
}

/** A usecase of an entity kept in the platform MDM: its def has `mdm` (§10), depends on the MDM ontology or calls `ctx.mdm`. */
export function usesMdm(unit: M12Unit): boolean {
  const mdm = unit.definition.data.mdm;
  if (!!mdm && typeof mdm === 'object' && Object.keys(mdm).length > 0) return true;
  const sequence = Array.isArray(unit.definition.data.sequence) ? unit.definition.data.sequence : [];
  return unit.definition.dependencies.some(ref => ref.endsWith('/l4/ontology/mdm.defs.ts'))
    || sequence.some(step => !!step && typeof step === 'object' && (step as { kind?: unknown }).kind === 'mdm');
}

function ontologyTree(source: string | null): Record<string, unknown> | null {
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source) : null;
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch (error) {
    console.warn(`MDM ontology is not JSON: ${String(error)}`);
    return null;
  }
}

/** Every `"of"` name in the MDM ontology, in first-seen order. */
function namedOf(tree: Record<string, unknown> | null): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const record = node as Record<string, unknown>;
    if (typeof record.of === 'string' && /^[A-Za-z][A-Za-z0-9]*$/u.test(record.of) && !out.includes(record.of)) out.push(record.of);
    Object.values(record).forEach(walk);
  };
  walk(tree);
  return out;
}

/** The `subtype` an l4 entity ontology declares (`"subtype": "Person"`), or '' when it declares none. */
export function entitySubtype(source: string | null): string {
  const subtype = ontologyTree(source)?.subtype;
  return typeof subtype === 'string' ? subtype : '';
}

/**
 * Group names and every field name the MDM ontology gives the entity: the fields of its groups and, when the entity
 * has a subtype, the fields of `subtypes.<subtype>` (the read returns them flat too: `details.privacyConsent`).
 */
function ontologyShape(tree: Record<string, unknown> | null, subtype = ''): { groups: string[]; fields: string[] } {
  const groupsNode = tree?.groups;
  if (!groupsNode || typeof groupsNode !== 'object') return { groups: [], fields: [] };
  const groups: string[] = [];
  const fields: string[] = [];
  const addFields = (node: unknown): void => {
    const nodeFields = node && typeof node === 'object' ? (node as { fields?: unknown }).fields : undefined;
    if (!nodeFields || typeof nodeFields !== 'object') return;
    for (const name of Object.keys(nodeFields as Record<string, unknown>)) {
      if (!name.startsWith('<') && !fields.includes(name)) fields.push(name);
    }
  };
  for (const [group, meta] of Object.entries(groupsNode as Record<string, unknown>)) {
    if (!group.startsWith('<')) groups.push(group);
    addFields(meta);
  }
  const subtypesNode = tree?.subtypes;
  if (subtype && subtypesNode && typeof subtypesNode === 'object') addFields((subtypesNode as Record<string, unknown>)[subtype]);
  return { groups, fields };
}

function exportName(line: string): string | null {
  return /^(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:interface|type|function|class|const)\s+([A-Za-z_][A-Za-z0-9_]*)/u.exec(line.trim())?.[1]
    ?? /^export\s+(?:async\s+)?(?:interface|type|function|class|const)\s+([A-Za-z_][A-Za-z0-9_]*)/u.exec(line)?.[1]
    ?? null;
}

/** Exported interface and type blocks whose name is an ontology `"of"` or starts with that name. */
/** The value exports of the module facade, copied from its text: `export function …` lines and `export { … } from …` re-exports (type-only ones left out). */
function moduleFunctionExports(moduleSource: string): string {
  const out: string[] = [];
  for (const match of moduleSource.matchAll(/^export\s+\{([^}]*)\}\s+from\s+['"][^'"]+['"];?/gmu)) out.push(match[0]);
  for (const match of moduleSource.matchAll(/^export\s+(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\([^)]*\)[^{;]*/gmu)) out.push(`${match[0].trim()};`);
  return out.join('\n');
}

function interfacesForNamedTypes(moduleSource: string, ofs: readonly string[]): string {
  if (!ofs.length) return '';
  const lines = moduleSource.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^export\s+(?:interface|type)\s/u.test(line)) continue;
    const name = exportName(line);
    if (!name || !ofs.some(of => name === of || name.startsWith(of))) continue;
    const block = [line];
    let depth = (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);
    while ((depth > 0 || !block[block.length - 1].includes(';')) && index + 1 < lines.length && depth >= 0) {
      if (depth === 0 && block[block.length - 1].includes(';')) break;
      index += 1;
      block.push(lines[index]);
      depth += (lines[index].match(/\{/gu)?.length ?? 0) - (lines[index].match(/\}/gu)?.length ?? 0);
      if (depth === 0 && lines[index].includes(';')) break;
      if (depth === 0 && lines[index].trim() === '}') break;
    }
    blocks.push(block.join('\n'));
  }
  return blocks.join('\n\n');
}

function commentBefore(lines: readonly string[], index: number): string[] {
  let cursor = index - 1;
  while (cursor >= 0 && lines[cursor].trim() === '') cursor -= 1;
  if (cursor < 0 || !lines[cursor].trim().endsWith('*/')) return [];
  const end = cursor;
  while (cursor >= 0 && !lines[cursor].includes('/**')) cursor -= 1;
  return cursor < 0 ? [] : lines.slice(cursor, end + 1);
}

/** Signature up to, and not including, the body brace. `next` is the line that opens the body. */
function signatureUntilBody(lines: readonly string[], index: number): { text: string; next: number } {
  const chunk: string[] = [];
  let paren = 0;
  let seenParen = false;
  for (let cursor = index; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    let cut = -1;
    for (let column = 0; column < line.length; column += 1) {
      const char = line[column];
      if (char === '(') { paren += 1; seenParen = true; }
      else if (char === ')') paren -= 1;
      else if (char === '{' && seenParen && paren === 0) {
        const rest = line.slice(column + 1).trim();
        if (rest === '' || rest.startsWith('//') || rest.startsWith('/*')) { cut = column; break; }
      }
    }
    if (cut >= 0) {
      chunk.push(`${line.slice(0, cut).replace(/\s*$/u, '')};`);
      return { text: chunk.join('\n'), next: cursor };
    }
    chunk.push(line);
    if (seenParen && paren === 0 && /;\s*$/u.test(line)) return { text: chunk.join('\n'), next: cursor + 1 };
  }
  return { text: chunk.join('\n'), next: lines.length };
}

function skipBody(lines: readonly string[], index: number): number {
  let depth = 0;
  let started = false;
  for (let cursor = index; cursor < lines.length; cursor += 1) {
    for (const char of lines[cursor]) {
      if (char === '{') { depth += 1; started = true; }
      else if (char === '}') depth -= 1;
    }
    if (started && depth === 0) return cursor + 1;
  }
  return lines.length;
}

/**
 * Exported functions and the methods of exported classes, each with its JSDoc, bodies omitted.
 * Names come from the facade text; nothing is listed here.
 */
function facadeApiSignatures(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  const methodStart = /^\s+(?:public |private |protected )?(?:async )?[A-Za-z_][A-Za-z0-9_]*\s*(?:<[^>\n]*>)?\s*\(/u;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^export\s+(?:async\s+)?function\s/u.test(line)) {
      const doc = commentBefore(lines, index);
      const signature = signatureUntilBody(lines, index);
      out.push([...doc, signature.text].join('\n'));
      index = lines[signature.next]?.includes('{') ? skipBody(lines, signature.next) - 1 : signature.next - 1;
      continue;
    }
    if (!/^export\s+class\s/u.test(line)) continue;
    out.push(`export class ${exportName(line) ?? 'Facade'} {`);
    let depth = (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);
    index += 1;
    while (index < lines.length && depth > 0) {
      const current = lines[index];
      if (depth === 1 && methodStart.test(current)) {
        const doc = commentBefore(lines, index);
        const signature = signatureUntilBody(lines, index);
        out.push([...doc, signature.text].join('\n'));
        index = lines[signature.next]?.includes('{') ? skipBody(lines, signature.next) : signature.next;
        continue;
      }
      depth += (current.match(/\{/gu)?.length ?? 0) - (current.match(/\}/gu)?.length ?? 0);
      index += 1;
    }
    out.push('}');
    index -= 1;
  }
  return out.join('\n');
}

/** Exported interface and type blocks of a source (the `ctx.mdm` contracts). */
function exportedTypeBlocks(source: string): string {
  const lines = source.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^export\s+(?:interface|type)\s/u.test(line)) continue;
    const block = [line];
    let depth = (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);
    while ((depth > 0 || !block[block.length - 1].includes(';')) && index + 1 < lines.length && depth >= 0) {
      if (depth === 0 && block[block.length - 1].includes(';')) break;
      index += 1;
      block.push(lines[index]);
      depth += (lines[index].match(/\{/gu)?.length ?? 0) - (lines[index].match(/\}/gu)?.length ?? 0);
      if (depth === 0 && lines[index].includes(';')) break;
      if (depth === 0 && lines[index].trim() === '}') break;
    }
    blocks.push(block.join('\n'));
  }
  return blocks.join('\n\n');
}

/**
 * The platform MDM APIs a module must call instead of inventing them. Named types come from the ontology
 * `"of"` and their interfaces from the module exports. Functions and methods come from the facade text.
 * Same text inside `mdmContextSection` and, when a request contract names an MDM entity a usecase already
 * owns, on its own.
 */
export function mdmPlatformApiSection(ontologySource: string | null, facadeSource: string | null = null, moduleSource: string | null = null): string {
  const ofs = namedOf(ontologyTree(ontologySource));
  const lines = [`- ${PLATFORM_API_RULE}`, `- ${PLATFORM_RECORD_RULE}`];
  if (ofs.length) {
    lines.push(
      '- A field whose type in the MDM ontology is named (`"of"`): type it with the interface exported from `/_102034_/l1/mdm/module.js` for that name; never `Record<string, unknown>` and never a shape of your own.',
      '- Required members of that exported interface are the ones written without `?`.',
    );
    const types = moduleSource ? interfacesForNamedTypes(moduleSource, ofs) : '';
    if (types) lines.push(fence('ts', types));
    const moduleFunctions = moduleSource ? moduleFunctionExports(moduleSource) : '';
    if (moduleFunctions) lines.push('Functions the module facade exports (import them from `/_102034_/l1/mdm/module.js`; call them, do not reimplement them):', fence('ts', moduleFunctions));
  }
  const api = facadeSource ? facadeApiSignatures(facadeSource) : '';
  if (api) lines.push('Platform functions and methods (import them from the facade the prompt gives; call them, do not reimplement them):', fence('ts', api));
  return lines.join('\n');
}

/** The method line of `target.method` in the facade, body omitted. Empty when the facade has no such method. */
function facadeMethodSignature(facadeSource: string | null, target: string, method: string): string {
  const className = MDM_TARGET_CLASS[target];
  if (!facadeSource || !className || !/^[A-Za-z][A-Za-z0-9]*$/u.test(method)) return '';
  const lines = facadeSource.split('\n');
  const start = lines.findIndex(line => new RegExp(`^export class ${className}\\b`, 'u').test(line));
  if (start < 0) return '';
  const methodStart = new RegExp(`^\\s+(?:public |private |protected )?(?:async )?${method}\\s*(?:<[^>\\n]*>)?\\s*\\(`, 'u');
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^export /u.test(lines[index])) break;
    if (!methodStart.test(lines[index])) continue;
    return signatureUntilBody(lines, index).text.trim().replace(/\s+/gu, ' ');
  }
  return '';
}

/** Facade text reduced to the bound methods and the interfaces those signatures name. */
function boundFacadeExcerpt(facadeSource: string | null, calls: readonly MdmBoundCall[]): string | null {
  if (!facadeSource || calls.length === 0) return null;
  const chunks: string[] = [];
  const typeNames = new Set<string>();
  for (const call of calls) {
    const signature = facadeMethodSignature(facadeSource, call.target, call.method);
    const className = MDM_TARGET_CLASS[call.target];
    if (!signature || !className) continue;
    chunks.push(`export class ${className} {\n  ${signature} {\n    return undefined as never;\n  }\n}`);
    for (const name of signature.matchAll(/\b[A-Z][A-Za-z0-9]*\b/gu)) typeNames.add(name[0]);
  }
  if (chunks.length === 0) return null;
  const types = exportedTypeBlocks(facadeSource).split('\n\n').filter(block => {
    const name = /^export (?:interface|type) ([A-Za-z0-9]+)/u.exec(block)?.[1];
    return !!name && typeNames.has(name);
  });
  return [...types, ...chunks].join('\n\n');
}

/** One bound call, with the shape the facade gives that method. */
function boundCallText(moduleName: string, call: MdmBoundCall, facadeSource: string | null): string {
  const signature = facadeMethodSignature(facadeSource, call.target, call.method);
  const key = `${call.target}.${call.method}`;
  const known: Record<string, string> = {
    'entity.get': '- `ctx.mdm.entity.get({ mdmId })` returns the read result the facade exports: read `result.mdmId`, `result.version` and `result.details.<field>` (flat).',
    'entity.findByDocument': '- `ctx.mdm.entity.findByDocument` returns the read result the facade exports: read `result.mdmId`, `result.version` and `result.details.<field>` (flat). It returns null when there is none.',
    'entity.create': '- `ctx.mdm.entity.create` takes flat details.',
    'entity.attachRole': '- `ctx.mdm.entity.attachRole(mdmId, \'' + moduleName + '.<Entity>\', branch?)` makes the record one of this module\'s and may write the module branch.',
    'entity.update': '- `ctx.mdm.entity.update({ mdmId, expectedVersion, patch })`: `patch` is flat (and `' + moduleName + '` for the module branch); `expectedVersion` is the version that was read, unchanged.',
    'collection.listByType': '- `ctx.mdm.collection.listByType({ type: \'' + moduleName + '.<Entity>\', name?, status?, page, pageSize })` returns `{ items, page, pageSize, total }`. `name` is already a case-insensitive "contains" search. Each item is an index row with flat `details` and NO `version`: when the output needs the version, `get` the record. `hasMore` is `page * pageSize < total`.',
    'identity.listUsers': `- \`ctx.mdm.identity.listUsers({ name?, pageSize?, cursor? })\` returns \`{ items, nextCursor }\`. The input is \`name\`, \`pageSize\` and \`cursor\`. \`pageSize\` is an integer from 1 to ${MDM_LIST_USERS_PAGE_SIZE_MAX}: the MDM answers 400 above that, so never ask for more. To list everyone, follow \`nextCursor\` until it is empty. Each item has \`mdmId\`, \`version\`, \`name\`, \`status\` and \`tags\`.`,
  };
  const line = known[key] ?? `- \`ctx.mdm.${call.target}.${call.method}(\``;
  return signature ? `${line}\n  Facade: \`${signature}\`.` : line;
}

/**
 * How the platform MDM stores and returns an entity today, for a usecase of an MDM entity. The ontology of the
 * module groups the fields (`details.identification.name`); the engine is FLAT (`details.name`), which the MDM
 * ontology states in knownDivergences.grouped-document. Without this the model guessed the groups and every read
 * of a patient failed (agendaClinica, 07/10). Verified against mdmFacade.ts and the in-memory engine.
 * With `boundCalls`, only those calls are taught (the signature comes from the facade). Without it, the text
 * stays the one every MDM entity had before a def named its calls.
 */
export function mdmContextSection(moduleName: string, ontologySource: string | null, facadeSource: string | null, platformRuleIds: readonly string[] = [], moduleSource: string | null = null, subtype = '', boundCalls?: readonly MdmBoundCall[]): string {
  const shape = ontologyShape(ontologyTree(ontologySource), subtype);
  const groupText = shape.groups.length ? shape.groups.map(group => '`' + group + '`').join(', ') : 'the groups the MDM ontology names';
  const fieldText = shape.fields.length ? shape.fields.map(field => '`details.' + field + '`').join(', ') : '`details.<field>`';
  const callLines = boundCalls
    ? boundCalls.map(call => boundCallText(moduleName, call, facadeSource))
    : [
      '- `ctx.mdm.entity.get({ mdmId })`, `create`, `update`, `attachRole` and `findByDocument` return',
      '  the read result the facade exports: read `result.mdmId`, `result.version` and',
      '  `result.details.<field>` (flat). `findByDocument` returns null when there is none.',
      '- `ctx.mdm.entity.create` takes flat details; then',
      '  `ctx.mdm.entity.attachRole(mdmId, \'' + moduleName + '.<Entity>\', branch?)` makes the record one of this module\'s',
      '  (it is what `listByType` finds) and may write the module branch.',
      '- `ctx.mdm.entity.update({ mdmId, expectedVersion, patch })`: `patch` is flat (and `' + moduleName + '` for the module',
      '  branch); `expectedVersion` is the version that was read, unchanged.',
      '- `ctx.mdm.collection.listByType({ type: \'' + moduleName + '.<Entity>\', name?, status?, page, pageSize })` returns',
      '  `{ items, page, pageSize, total }`. `name` is already a case-insensitive "contains" search. Each item is an index',
      '  row with flat `details` and NO `version`:',
      '  when the output needs the version, `get` the record. `hasMore` is `page * pageSize < total`.',
    ];
  const facadeForDump = boundCalls ? boundFacadeExcerpt(facadeSource, boundCalls) : facadeSource;
  const lines = [
    'This entity is kept in the platform MDM, not in a table of the module. Read and write it through `ctx.mdm` as below.',
    '',
    '- The l4 ontology of this entity groups its fields (`details.<group>.<field>`, groups ' + groupText + ',',
    '  and `details.' + moduleName + '`). That grouping is the TARGET of the',
    '  platform; the engine stores and returns the document FLAT today (MDM ontology, knownDivergences.grouped-document):',
    '  - a field of a platform group is `details.<field>` (from the ontology: ' + fieldText + ');',
    '  - a group the ontology keeps as its own object stays an object; this module\'s own branch is `details.' + moduleName + '` (an object, may be absent).',
    ...callLines,
    '- Build the output in the grouped shape this usecase declares (the entity of the module), placing each flat field',
    '  into its group. Never expect the groups in what the engine returns. A field the engine does not have is absent,',
    '  not an error: do not require an optional field; a',
    '  missing optional object becomes an empty object or is left out, as the declared type allows. Read from the',
    '  input only what its interface declares.',
    '- The engine returns `null` for any field it does not have. `null` is the same as absent: test with `== null` (it catches `null` and `undefined`), leave the',
    '  field out of the output, and never throw because a field is `null`. An optional field left empty is normal;',
    '  treating a null optional field as invalid broke every read that had one.',
  ];
  lines.push(mdmPlatformApiSection(ontologySource, facadeForDump, moduleSource));
  const parts = [lines.join('\n')];
  const platformRules = platformRuleIds.map(ruleId => {
    const escaped = ruleId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const found = ontologySource ? new RegExp(`"${escaped}"\\s*:\\s*"([^"]*)"`, 'u').exec(ontologySource)?.[1] : undefined;
    return `- ${ruleId}: ${found ?? '(text not found in the MDM ontology)'}`;
  });
  if (platformRules.length) {
    parts.push([
      'Platform rules this definition lists (`rule-*`): the MDM engine applies them, as their text says. The module does not',
      'check them and does not refuse a request for them: it passes the data through and lets the engine act. Do not throw an AppError with these rule ids.',
      ...platformRules,
    ].join('\n'));
  }
  if (ontologySource) {
    const header = ontologySource.slice(0, ontologySource.indexOf('import type') > 0 ? ontologySource.indexOf('import type') : 2400).trim();
    const divergence = /"grouped-document":\s*"([^"]*)"/u.exec(ontologySource)?.[1];
    parts.push(['MDM ontology (`' + MDM_ONTOLOGY_REF + '`), header:', fence('ts', header.slice(0, 4000)), divergence ? `knownDivergences.grouped-document: ${divergence}` : ''].join('\n\n'));
  }
  if (facadeForDump) {
    const types = exportedTypeBlocks(facadeForDump);
    if (types) parts.push(['`ctx.mdm` types (`' + MDM_FACADE_REF + '`):', fence('ts', types)].join('\n\n'));
  }
  return parts.join('\n\n');
}

export const M12_USECASE_TOOL_DESCRIPTION = 'Return the whole usecase TypeScript file, and the listed rules that do not apply to it';

/** The usecase gate over the answer: shape, imports, and every listed rule enforced or declared not applicable. */
export async function usecaseAnswerProblems(ctx: M12Context, unit: M12Unit, code: string, notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]> {
  const data = await loadUsecaseContext(ctx, unit);
  const ruleIds = rulesToEnforce(unit.definition);
  const rulesText = await readOptional(rulesFile(ctx.run.project, ctx.run.module));
  // Without the rules file the module is not known: nothing outside the unit's list is refused.
  const moduleRuleIds = rulesText ? allRuleIds(rulesText) : undefined;
  const waived = readNotApplicable(notApplicable, ruleIds, moduleRuleIds);
  const declared = new Set(waived.items.map(item => item.ruleId));
  const entities = await entityNames(ctx);
  const derived = [...new Set(entities.flatMap(entity => entity.derived))];
  const parentRules = await parentRulesOf(ctx, unit, entities);
  const transition = await transitionOf(ctx, unit);
  const arrival = arrivalOf(ctx, unit);
  return [
    ...waived.problems,
    ...usecaseGate(code, { gatewayOutputs: await gatewayOutputsOf(ctx, data.functionName, unit.definition.artifactId), siblingImports: await siblingDeclarationImports(ctx.read, ctx.run.project, ctx.run.module), header: data.header, functionName: data.functionName, project: ctx.run.project, moduleName: ctx.run.module, ruleIds: ruleIds.filter(ruleId => !declared.has(ruleId)), externalEntity: externalEntityIds(ctx.units).has(String(unit.definition.data.entityId ?? '')), stringVersion: await usecaseStringVersion(ctx, unit), derivedPaths: derived, operation: String(unit.definition.data.operation ?? ''), parentRules, transition, ...(arrival ? { arrival } : {}), ports: [...repositoryPortNames(ctx.units, item => item.definition.artifactId), ...moduleGatewayNames(ctx.units)], gateways: moduleGatewayNames(ctx.units), externalPort: externalRepositoryPort(ctx.units, String(unit.definition.data.entityId ?? '')), publishers: eventPublishersOf(ctx, unit), callInputs: callInputsOfDef(unit), consumerCalls: consumerCallsOf(ctx, data.functionName, unit.definition.artifactId), childRecords: childRecordsOf(ctx, unit), usecaseInputs: await usecaseInputsOf(ctx), mdmCalls: mdmBoundCalls(unit.definition.data) }),
  ];
}

/** Actor ids of an authorityMap source (`"actorRef": "companyOwner"`). */
export function authorityActorIds(source: string): string[] {
  const ids: string[] = [];
  for (const match of source.matchAll(/["']actorRef["']\s*:\s*["']([A-Za-z][A-Za-z0-9]*)["']/gu)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  return ids;
}

/** Prompt text: a rule check may name only these actor ids. */
export function authorityActorsText(actorIds: readonly string[]): string {
  const list = actorIds.map(id => `- ${id}`).join('\n');
  return [`an actor named in a rule check is one of these ids; never another name`, list].filter(Boolean).join('\n');
}
