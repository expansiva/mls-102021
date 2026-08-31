/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbRules.ts" enhancement="_blank"/>

// L4 rule catalog: one reader, shared by gen-seeds / gen-domain / gen-usecase.
// The generators used to receive opaque rule ids and invent predicates (a required json field
// became "must contain images"). The catalog text is the only semantics they are allowed to honour.

import { parseDefsSource } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';

export interface L4RuleDefinition {
  ruleId: string;
  title: string;
  description: string;
  appliesTo: string[];
}

/** Heading of the domain/usecase prompt block. Absent from the prompt when the owner has no rules. */
export const L4_RULES_PROMPT_HEADING = '## L4 rules referenced (id + title + description)';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

/** Parse the `rules` array of one l4 defs object. ns4 names the id `id`; older files use `ruleId`. */
export function collectRuleDefinitionsFromParsed(parsed: unknown): L4RuleDefinition[] {
  if (!isRecord(parsed) || !Array.isArray(parsed.rules)) return [];
  const rules: L4RuleDefinition[] = [];
  for (const raw of parsed.rules) {
    if (!isRecord(raw)) continue;
    const ruleId = readString(raw.ruleId) || readString(raw.id);
    if (!ruleId) continue;
    rules.push({
      ruleId,
      title: readString(raw.title),
      description: readString(raw.description),
      appliesTo: readStringArray(raw.appliesTo),
    });
  }
  return rules;
}

/** Full L4 rule text (id + title + description + appliesTo) from every rule set def in the project. */
export async function readRuleDefinitions(project: number): Promise<L4RuleDefinition[]> {
  const rules: L4RuleDefinition[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    rules.push(...collectRuleDefinitionsFromParsed(parseDefsSource(String(await file.getContent()))));
  }
  return rules;
}

/**
 * Resolve applied ids against the catalog. Unknown ids stay in the list with empty text — same
 * fallback gen-seeds has always used, so a missing catalog row is visible instead of dropped.
 */
export function resolveAppliedRules(catalog: L4RuleDefinition[], ruleIds: string[]): L4RuleDefinition[] {
  const byId = new Map(catalog.map(rule => [rule.ruleId, rule]));
  return ruleIds.map(ruleId => byId.get(ruleId) ?? { ruleId, title: '', description: '', appliesTo: [] });
}

/** Unique rule ids declared on the given entities, in first-seen order. */
export function ruleIdsOfEntities(
  entities: ReadonlyArray<{ entityId: string; useRules?: string[] }>,
  entityIds: readonly string[],
): string[] {
  const byId = new Map(entities.map(entity => [entity.entityId, entity]));
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entityId of entityIds) {
    for (const ruleId of byId.get(entityId)?.useRules ?? []) {
      if (!ruleId || seen.has(ruleId)) continue;
      seen.add(ruleId);
      ids.push(ruleId);
    }
  }
  return ids;
}

/**
 * Prompt block for gen-domain / gen-usecase: only the referenced rules, as id + title + description.
 * Empty `ruleIds` → empty string (no section, even if the catalog is large).
 */
export function appliedRulesPromptSection(catalog: L4RuleDefinition[], ruleIds: string[]): string {
  if (!ruleIds.length) return '';
  const rules = resolveAppliedRules(catalog, ruleIds).map(rule => ({
    ruleId: rule.ruleId,
    title: rule.title,
    description: rule.description,
  }));
  return `\n${L4_RULES_PROMPT_HEADING}\nHonour only these rules. A reject predicate exists only when one of them (or a field constraint) requires it; product-prose inferences go in a comment, never as throw or return false.\n${JSON.stringify(rules, null, 2)}\n`;
}
