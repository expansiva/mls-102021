/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbMdmPolicy.ts" enhancement="_blank"/>

/**
 * Persistence-policy gate: the l4 says WHERE an entity lives, and this is the deterministic check that
 * the generated l1 obeys it. Pure (no platform imports) so it is unit-tested directly.
 *
 * Run 9 of buildFlowFsm is the case it exists for: Client, Project and InventoryItem declare
 * `storage.target: 'mdm'` and FieldWorker/PlatformUser declare `'external'`, and the run still
 * produced local tables — seeded ones, duplicating the organization's people. Nothing FAILED, because
 * a local table for master data is perfectly valid code; only the policy was violated. A finding is
 * the only thing that turns that class of defect from invisible into blocking.
 *
 * The gate reads what is ON DISK (artifact short names), never a plan: a plan that promised the right
 * thing and materialized the wrong one is exactly what has to be caught.
 */

export interface CbPolicyEntity {
  entityId: string;
  kind: string;          // as classified (external | mdm | core | …)
  storageTarget: string; // as DECLARED by the l4 — the message names it, so the finding is auditable
}

export interface CbPolicyArtifacts {
  /** lowercased shortNames of `layer_3_domain/entities/*.defs.ts` */
  domainEntities?: Iterable<string>;
  /** lowercased shortNames of `layer_2_application/ports/*.defs.ts` (`<entity>Repository`) */
  ports?: Iterable<string>;
  /** lowercased shortNames of `adapters/persistence/**` (table defs + adapters) */
  persistence?: Iterable<string>;
  /** entity ids (any case) that the seed plan writes LOCAL rows for */
  seededLocalEntities?: Iterable<string>;
}

const REASON: Record<string, string> = {
  mdm: 'master data is owned by 102034 and written through ctx.mdm (no local entity/port/adapter/table)',
  external: 'the identity lives outside this module; the FK keeps the external id (no local artifact, no seeds)',
};

const PERSISTENCE_SUFFIXES = new Set(['repository', 'repositoryadapter', 'adapter', 'table']);

function lowerSet(values: Iterable<string> | undefined): Set<string> {
  return new Set([...(values ?? [])].map(value => String(value).toLowerCase()));
}

/**
 * One finding per (entity, forbidden artifact). `storage.target` is quoted verbatim so the reader can
 * go straight to the l4 line that was ignored.
 */
export function collectPersistencePolicyIssues(
  entities: CbPolicyEntity[],
  artifacts: CbPolicyArtifacts,
): string[] {
  const domain = lowerSet(artifacts.domainEntities);
  const ports = lowerSet(artifacts.ports);
  const persistence = lowerSet(artifacts.persistence);
  const seeded = lowerSet(artifacts.seededLocalEntities);
  const issues: string[] = [];
  for (const entity of entities) {
    const target = entity.storageTarget === 'mdm' || entity.storageTarget === 'external'
      ? entity.storageTarget
      : entity.kind === 'mdm' || entity.kind === 'external' ? entity.kind : '';
    if (!target) continue;
    const id = entity.entityId;
    const lc = id.toLowerCase();
    const reason = REASON[target];
    const found: string[] = [];
    if (domain.has(lc)) found.push(`local domain entity ${id}.defs.ts`);
    if (ports.has(`${lc}repository`)) found.push(`local port ${id}Repository.defs.ts`);
    // The generated names are the entity in lowerCamel plus a role suffix (`client.defs.ts` is the table
    // def, `clientRepositoryAdapter.defs.ts` the adapter). Matching by prefix ALONE would make `Client`
    // claim `clientBillingSummary`, so the suffix comes from a closed list.
    for (const name of persistence) {
      if (name === lc || (name.startsWith(lc) && PERSISTENCE_SUFFIXES.has(name.slice(lc.length)))) {
        found.push(`local persistence artifact ${name}.defs.ts`);
      }
    }
    if (seeded.has(lc)) {
      found.push(target === 'mdm' ? 'local seed rows (master data belongs to mdmEntities)' : 'local seed rows');
    }
    for (const artifact of found) {
      issues.push(`persistence policy: entity '${id}' declares storage.target '${target}' -> ${artifact} forbidden; ${reason}`);
    }
  }
  return [...new Set(issues)];
}
