/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/arrivalUpsert.ts" enhancement="_blank"/>

// d1_232: the route of an arrival that creates and updates one entity (an upsert) finds the record by its key first. The line is read by the one
// reader of the NS5; the key comes from the ontology entity, by the same function the plan used (it refused an entity with no key).

import { upsertKeyOf, isUpsert, type ArrivalUpsert } from '/_102021_/l2/helpers/l1Defs/arrivalUpsert.js';
import { ns5ArrivalEffects } from '/_102035_/l2/solution/arrivalEffects.js';

export interface RouteUpsert extends ArrivalUpsert {
  route: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The ontology entity of an L4 file, as the record the file declares; `null` when it is not a JSON record. */
export function ontologyEntityOf(source: string | null): unknown {
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(source) : null;
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** The upserts of one arrival line: the entities it creates and updates, each with the key the plan found. An entity with no key is left out (the plan refused it). */
export async function routeUpsertsOf(
  route: string,
  line: Record<string, unknown> | null,
  kind: 'inbound' | 'serve',
  readEntity: (entityId: string) => Promise<string | null>,
): Promise<RouteUpsert[]> {
  if (!line) return [];
  const out: RouteUpsert[] = [];
  for (const entry of ns5ArrivalEffects(line, kind)) {
    if (!entry.entityId || !isUpsert(entry)) continue;
    const key = upsertKeyOf(ontologyEntityOf(await readEntity(entry.entityId)));
    if (key) out.push({ route, entityId: entry.entityId, ...key });
  }
  return out;
}

/** The part of the prompt that says how an upsert route finds the record. */
export function upsertSection(items: readonly RouteUpsert[]): string {
  return [
    ...items.map(item => `- ${item.route}: ${item.entityId} is created or updated, found by ${item.keyKind === 'id' ? `its id (\`${item.key[0]}\`)` : `its unique key (${item.key.map(field => `\`${field}\``).join(', ')})`}`),
    '',
    'The arrival says it creates and updates the entity: look the record up first through the entity port (`resolveRepository`), with `get` by the id or with `list` and a filter on the key fields, and ignore a record that does not have the key. When the record is there, call the update usecase with what you found; when it is not, call the create usecase. The route calls both usecases listed above. Never create through the update usecase and never take its not-found error as the sign that the record is missing.',
  ].join('\n');
}
