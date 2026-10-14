/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12MdmLinks.ts" enhancement="_blank"/>

// The links of a module that go through a platform MDM relationship type (`"via": "ReportsTo"` in the l4), and the
// compact keys the MDM stores them under on each record (`reportManagers` on the collaborator, `reports` on the
// manager). The model guessed `relationshipRefs['ReportsTo']` and no manager ever saw his team (reembolsoDespesas,
// 13/10): the keys are in the MDM ontology (`relationships[].compactKeys`), which the def depends on but the prompt
// did not carry. Everything here is read from the files of the module and of the platform: nothing is per module.

import { ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';

export const M12_MDM_ONTOLOGY_REF = '_102034_/l4/ontology/mdm.defs.ts';

export interface M12MdmLink {
  type: string;
  from: { entityId: string; key: string };
  to: { entityId: string; key: string };
}

function parseConst(source: string | null, pattern: RegExp): unknown {
  const match = source ? pattern.exec(source) : null;
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.warn(`not a JSON literal: ${String(error)}`);
    return null;
  }
}

/** Relationship type → its compact keys, from the platform MDM ontology (`relationships[].compactKeys`). */
export function mdmCompactKeys(mdmOntologySource: string | null): Map<string, { from: string; to: string }> {
  const out = new Map<string, { from: string; to: string }>();
  const value = parseConst(mdmOntologySource, /export const mdm = (\{[\s\S]*\})\s*as const/u) as { relationships?: unknown } | null;
  for (const item of Array.isArray(value?.relationships) ? value!.relationships as unknown[] : []) {
    const row = item as { type?: unknown; compactKeys?: { from?: unknown; to?: unknown } };
    const from = Array.isArray(row.compactKeys?.from) ? String(row.compactKeys!.from[0] ?? '') : '';
    const to = Array.isArray(row.compactKeys?.to) ? String(row.compactKeys!.to[0] ?? '') : '';
    if (typeof row.type === 'string' && from && to) out.set(row.type, { from, to });
  }
  return out;
}

/**
 * The module links through an MDM relationship type. In the l4, the relationship that carries `"direction": "to"`
 * is declared on the target end (GestorEquipe.colaboradores of ReportsTo); the one without it on the source end.
 */
export function mdmLinks(entityOntologies: ReadonlyArray<{ entityId: string; source: string | null }>, mdmOntologySource: string | null): M12MdmLink[] {
  const keys = mdmCompactKeys(mdmOntologySource);
  const out = new Map<string, M12MdmLink>();
  for (const { entityId, source } of entityOntologies) {
    const value = parseConst(source, /=\s*(\{[\s\S]*\})\s*as const/u) as { relationships?: Record<string, unknown> } | null;
    for (const meta of Object.values(value?.relationships ?? {})) {
      const rel = meta as { to?: unknown; via?: unknown; direction?: unknown };
      if (typeof rel.via !== 'string' || typeof rel.to !== 'string' || !keys.has(rel.via)) continue;
      const compact = keys.get(rel.via)!;
      const [source, target] = rel.direction === 'to' ? [rel.to, entityId] : [entityId, rel.to];
      const id = `${rel.via}:${source}->${target}`;
      if (!out.has(id)) out.set(id, { type: rel.via, from: { entityId: source, key: compact.from }, to: { entityId: target, key: compact.to } });
    }
  }
  return [...out.values()];
}

/** The prompt section for the MDM links of a module; '' when it has none. */
export function mdmLinksSection(links: readonly M12MdmLink[]): string {
  if (!links.length) return '';
  return [
    'Links between records of the platform MDM are kept as compact refs on each record, under the key the MDM',
    'ontology gives the relationship type (never under the type name): read `<record>.details.relationshipRefs.<key>`',
    '(an array of mdmIds; absent or empty when there is no link), or `result.related(\'<key>\')` on what `ctx.mdm.entity.get`',
    'returns. The links of this module:',
    ...links.map(link => `- ${link.type}: ${link.from.entityId} → ${link.to.entityId}. On a ${link.from.entityId}: \`relationshipRefs.${link.from.key}\` = ids of its ${link.to.entityId}. On a ${link.to.entityId}: \`relationshipRefs.${link.to.key}\` = ids of its ${link.from.entityId}.`),
    'An entity kept in the MDM has no repository port: read it with `ctx.mdm.entity.get({ mdmId })` (or its get usecase).',
  ].join('\n');
}

/** The MDM links section of the module of a run, read from its l4 ontologies and the platform MDM ontology. */
export async function moduleMdmLinksSection(ctx: M12Context): Promise<string> {
  const ontologies = await Promise.all(ctx.units
    .filter(unit => unit.definition.artifactType === 'domainEntity')
    .map(async unit => ({ entityId: String(unit.definition.data.entityId ?? unit.definition.artifactId), source: await ctx.read(ontologyRef(unit.definition, unit.outputRef)) })));
  return mdmLinksSection(mdmLinks(ontologies, await ctx.read(M12_MDM_ONTOLOGY_REF)));
}
