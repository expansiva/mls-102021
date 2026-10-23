/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/context.ts" enhancement="_blank"/>

// What the model sees for one usecase (materializadorL1.md §2.1): the source (the l4 ontology of the entity and
// the text of every rule of the module) and the def as the intent (entity, operation, transition, rulesApplied, effects:
// materializadorL1.md §10), plus the recipe attempt and platform signatures.

import { emitUsecase, emittedValueExports, ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { rulesFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { dependencyUnits, recipeDraft, rulesToEnforce, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { usecaseGate, type M12ParentRule } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { moduleMdmLinksSection } from '/_102021_/l2/agentMaterializeL1/helpers/m12MdmLinks.js';
import { readNotApplicable, type M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

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
      while (depth > 0 && index + 1 < lines.length) {
        index += 1;
        block.push(lines[index]);
        depth += (lines[index].match(/\{/gu)?.length ?? 0) - (lines[index].match(/\}/gu)?.length ?? 0);
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
  return typeof entity.title === 'string' ? { entityId, title: entity.title, relationships, derived: derivedPaths(entity.record?.fields), parents } : null;
}

/** The names of each entity of the module, read from its l4 ontology. */
export async function entityNames(ctx: M12Context): Promise<M12EntityNames[]> {
  const out: M12EntityNames[] = [];
  for (const item of ctx.units.filter(unit => unit.definition.artifactType === 'domainEntity')) {
    const entityId = String(item.definition.data.entityId ?? item.definition.artifactId);
    const names = ontologyNames(entityId, await ctx.read(ontologyRef(item.definition, item.outputRef)));
    if (names) out.push(names);
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
  const rulesSource = await readOptional(rulesFile(ctx.run.project, ctx.run.module));
  const rules = ruleTexts(rulesSource, ruleIds);

  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the usecase \`${functionName}\` of module ${ctx.run.module}, file \`${unit.outputRef}\`.`,
    `Keep the exported function name and the exported type names of the scaffold. Its input members follow from the operation and the entity, and are a hint: the input accepts what the entity accepts by the l4, so a field the system sets (the initial state, a number from a sequence, a field of another operation, a value a rule copies) is not an input and is set here.`,
    ruleIds.length
      ? `Enforce every rule listed under "Rules". Each one throws \`new AppError(<code>, <message>, <status>, { ruleId: "<ruleId>" })\` when it is broken, with the rule id written as that exact string literal. A listed rule that does not concern this operation (its text is about another entity or operation) goes to \`notApplicable\` with the reason, instead of a check that makes no sense.`
      : 'The def has no rule to enforce beyond its operation. Return notApplicable: [].',
  ].join('\n')));
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
  const authority = ctx.units.find(item => item.definition.artifactType === 'authorityMap');
  if (authority) {
    const authoritySource = await readOptional(authority.output) ?? JSON.stringify(authority.definition.data);
    parts.push(section('Actors of the authorityMap', authorityActorsText(authorityActorIds(authoritySource))));
  }
  const others = ruleTexts(rulesSource, allRuleIds(rulesSource).filter(ruleId => !ruleIds.includes(ruleId)));
  if (others.length) parts.push(section('Other rules of the module (l4 text: a rule about this entity and operation that the def missed is enforced here too)', others.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  const dependencies = dependencyUnits(ctx, unit);
  for (const dep of dependencies) {
    const generated = await readOptional(dep.output);
    parts.push(section(`Dependency ${dep.definition.artifactType} ${dep.definition.artifactId}`, [
      `Import from \`/${dep.outputRef.replace(/\.ts$/u, '.js')}\`.`,
      generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(dep.definition.data, null, 2)),
    ].join('\n\n')));
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
    const ruleIds = citedBy.get(String(item.definition.data.entityId ?? ''));
    if (!ruleIds || sent.has(item.defRef)) continue;
    const generated = await readOptional(item.output);
    parts.push(section(`Entity cited by a rule: ${item.definition.artifactType} ${item.definition.artifactId} (${ruleIds.join(', ')})`, [
      `Import from \`/${item.outputRef.replace(/\.ts$/u, '.js')}\`. Read its records through this port and its fields by these names.`,
      generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(item.definition.data, null, 2)),
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
    parts.push(section('The platform MDM (source: how the engine stores and returns this entity today)', mdmContextSection(ctx.run.module, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [...new Set(platformRuleIds)], await ctx.read(MDM_MODULE_REF))));
  }
  const links = await moduleMdmLinksSection(ctx);
  if (links) parts.push(section('Links of the platform MDM (source: the compact keys each link is stored under)', links));
  const companyAnchor = sessionCompanyAnchor(
    ctx.run.module,
    await ctx.read(`_${ctx.run.project}_/l5/config.json`),
    ctx.units.map(item => String(item.definition.data.entityId ?? '')),
  );
  if (companyAnchor) parts.push(companyAnchor);
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
  const portOf = new Map(ctx.units
    .filter(item => item.definition.artifactType === 'repositoryPort')
    .map(item => [String(item.definition.data.entityId ?? ''), item.definition.artifactId] as const));
  const rulesSource = await readOptional(rulesFile(ctx.run.project, ctx.run.module));
  const titles = ruleNames(entityId, entities);
  const out: M12ParentRule[] = [];
  for (const rule of ruleTexts(rulesSource, allRuleIds(rulesSource))) {
    const parents = citedEntities(rule.text, titles)
      .filter(cited => own.parents.includes(cited) && portOf.has(cited))
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

/** Group names and a short sample of their field names, both read from the ontology. */
function ontologyShape(tree: Record<string, unknown> | null): { groups: string[]; fields: string[] } {
  const groupsNode = tree?.groups;
  if (!groupsNode || typeof groupsNode !== 'object') return { groups: [], fields: [] };
  const groups: string[] = [];
  const fields: string[] = [];
  for (const [group, meta] of Object.entries(groupsNode as Record<string, unknown>)) {
    if (!group.startsWith('<')) groups.push(group);
    const groupFields = meta && typeof meta === 'object' ? (meta as { fields?: unknown }).fields : undefined;
    if (!groupFields || typeof groupFields !== 'object') continue;
    for (const name of Object.keys(groupFields as Record<string, unknown>)) {
      if (!name.startsWith('<') && !fields.includes(name) && fields.length < 8) fields.push(name);
    }
  }
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

/**
 * How the platform MDM stores and returns an entity today, for a usecase of an MDM entity. The ontology of the
 * module groups the fields (`details.identification.name`); the engine is FLAT (`details.name`), which the MDM
 * ontology states in knownDivergences.grouped-document. Without this the model guessed the groups and every read
 * of a patient failed (agendaClinica, 07/10). Verified against mdmFacade.ts and the in-memory engine.
 */
export function mdmContextSection(moduleName: string, ontologySource: string | null, facadeSource: string | null, platformRuleIds: readonly string[] = [], moduleSource: string | null = null): string {
  const shape = ontologyShape(ontologyTree(ontologySource));
  const groupText = shape.groups.length ? shape.groups.map(group => '`' + group + '`').join(', ') : 'the groups the MDM ontology names';
  const fieldText = shape.fields.length ? shape.fields.map(field => '`details.' + field + '`').join(', ') : '`details.<field>`';
  const lines = [
    'This entity is kept in the platform MDM, not in a table of the module. Read and write it through `ctx.mdm` as below.',
    '',
    '- The l4 ontology of this entity groups its fields (`details.<group>.<field>`, groups ' + groupText + ',',
    '  and `details.' + moduleName + '`). That grouping is the TARGET of the',
    '  platform; the engine stores and returns the document FLAT today (MDM ontology, knownDivergences.grouped-document):',
    '  - a field of a platform group is `details.<field>` (from the ontology: ' + fieldText + ');',
    '  - a group the ontology keeps as its own object stays an object; this module\'s own branch is `details.' + moduleName + '` (an object, may be absent).',
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
    '- Build the output in the grouped shape this usecase declares (the entity of the module), placing each flat field',
    '  into its group. Never expect the groups in what the engine returns. A field the engine does not have is absent,',
    '  not an error: do not require an optional field; a',
    '  missing optional object becomes an empty object or is left out, as the declared type allows. Read from the',
    '  input only what its interface declares.',
    '- The engine returns `null` for any field it does not have. `null` is the same as absent: test with `== null` (it catches `null` and `undefined`), leave the',
    '  field out of the output, and never throw because a field is `null`. An optional field left empty is normal;',
    '  treating a null optional field as invalid broke every read that had one.',
  ];
  lines.push(mdmPlatformApiSection(ontologySource, facadeSource, moduleSource));
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
  if (facadeSource) {
    const types = exportedTypeBlocks(facadeSource);
    if (types) parts.push(['`ctx.mdm` types (`' + MDM_FACADE_REF + '`):', fence('ts', types)].join('\n\n'));
  }
  return parts.join('\n\n');
}

export const M12_USECASE_TOOL_DESCRIPTION = 'Return the whole usecase TypeScript file, and the listed rules that do not apply to it';

/** The usecase gate over the answer: shape, imports, and every listed rule enforced or declared not applicable. */
export async function usecaseAnswerProblems(ctx: M12Context, unit: M12Unit, code: string, notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]> {
  const data = await loadUsecaseContext(ctx, unit);
  const ruleIds = rulesToEnforce(unit.definition);
  const waived = readNotApplicable(notApplicable, ruleIds);
  const declared = new Set(waived.items.map(item => item.ruleId));
  const entities = await entityNames(ctx);
  const derived = [...new Set(entities.flatMap(entity => entity.derived))];
  const parentRules = await parentRulesOf(ctx, unit, entities);
  const transition = await transitionOf(ctx, unit);
  return [
    ...waived.problems,
    ...usecaseGate(code, { header: data.header, functionName: data.functionName, project: ctx.run.project, moduleName: ctx.run.module, ruleIds: ruleIds.filter(ruleId => !declared.has(ruleId)), derivedPaths: derived, operation: String(unit.definition.data.operation ?? ''), parentRules, transition, ports: ctx.units.filter(item => item.definition.artifactType === 'repositoryPort').map(item => item.definition.artifactId) }),
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
