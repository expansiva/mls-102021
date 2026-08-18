/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbDefsSource.ts" enhancement="_blank"/>

/**
 * Pure readers of the l4/l5 defs dialects, with no platform imports, so they can be tested directly.
 * Two generators write the artifacts this agent reads: ns/ns3 emitted `} as const;`, and ns4 emits
 * `} as const satisfies <Artifact>;` over a typed import.
 */

export type CbEntityKind = 'core' | 'supporting' | 'event' | 'metric' | 'mdm' | 'external';
// The kinds a l4 ontology may DECLARE. `external` is never declared: it is derived from
// `storage.target`, so keeping it out of this list also keeps a typo'd `kind: "external"` falling back
// to `core` instead of silently erasing an entity's persistence.
const ENTITY_KINDS: readonly CbEntityKind[] = ['core', 'supporting', 'event', 'metric', 'mdm'];

/**
 * MDM WRITE PATH — off until the general rebuild (todo/changeBackend/ajustes_mdm_write_path.md).
 *
 * The l4 already declares the intention this switch honours (`storage.target: mdm | external |
 * moduleDatabase`, `storage.mdmType`, v6 vocabulary), so reading it is not a new-vocabulary migration:
 * it would change the classification of the module Wagner is testing (run 9 of buildFlowFsm, where
 * Client/Project/InventoryItem carry `target: mdm` and FieldWorker/PlatformUser carry `target:
 * external`) the moment the next generation runs. That is exactly what the ⏸️ of the spec forbids.
 *
 * Flipping this to `true` moves four things at once, which is why it is one constant and not four:
 *   1. `classifyEntityKind` stops mapping `mdm + moduleOwned` to `core` and starts honouring
 *      `storage.target` — so an MDM entity gets no local domain entity, port, adapter or table, and an
 *      `external` one gets none of those and no seeds either;
 *   2. the seed planner routes those entities to `mdmEntities` (102034 registry) instead of
 *      `localTables`, and drops `external` entities from the plan entirely;
 *   3. the usecase item carries `mdmWrites` (mdmType + subtype + idField), so create/update/delete of
 *      master data is generated against `ctx.mdm` — the surface skills/applicationUsecase.md already
 *      documents — instead of a local port;
 *   4. validate-all blocks on a local persistence/port/domain artifact for an MDM entity instead of
 *      only warning about it (`collectPersistencePolicyIssues`).
 *
 * The order of the general rebuild is in the spec: ns4 vocabulary first (`party`, `platformUserId`),
 * then this flag, then `/rebuild all`.
 */
export const MDM_WRITE_PATH_ENABLED = false;

/** What `storage` declares about an entity: where it lives, and under which master-data type. */
export interface CbEntityStorage {
  target: string;     // 'mdm' | 'external' | 'moduleDatabase' | '' when the l4 predates the field
  scope: string;      // 'organization' | 'platform' | 'module'
  mdmType: string;    // canonical `<moduleId>.<Entity>` — the key ctx.mdm.collection.listByType reads
  idField: string;    // the module-side id field; for an MDM entity it CARRIES the mdmId (see seeds)
}

export function readEntityStorage(parsed: Record<string, unknown>): CbEntityStorage {
  const raw = parsed.storage;
  const storage = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
  return {
    target: str(storage.target),
    scope: str(storage.scope),
    mdmType: str(storage.mdmType),
    idField: str(storage.idField),
  };
}

/**
 * The kind this agent generates from, deciding between the two vocabularies AND the two policies.
 *
 * With the write path OFF the answer is exactly what it has always been (`entityKindOf`), so a run of
 * the current module is byte-identical. With it ON, `storage.target` — the field that actually carries
 * the l4 intention — wins over the pair kind/ownership: `mdm` means master data owned by 102034 (the
 * module writes it THROUGH the facade), and `external` means an identity that lives outside this
 * product (a platform user), which must never become a local table and must never be seeded.
 */
/**
 * What a caller knows about an entity. `storage` is PARTIAL because only `readEntityStorage` produces the
 * complete block — a caller that has just `{ target }` (a fixture, a scan of an older l4) asks the same
 * question and must not have to invent the other three fields.
 */
export interface CbEntityClassification {
  kind: string;
  ownership?: string;
  storage?: Partial<CbEntityStorage>;
}

/** A declaration that contradicts itself, for the scan to announce instead of resolving in silence. */
export function contradictoryStorageDeclaration(
  input: CbEntityClassification,
): string {
  const target = input.storage?.target || '';
  const ownership = input.ownership || '';
  if (target === 'mdm' && ownership === 'external') {
    return `declares storage.target 'mdm' with ownership 'external' (undefined by the policy) — read as 'external', so it gets no MDM record`;
  }
  if (target === 'external' && input.kind === 'mdm') {
    return "declares kind 'mdm' with storage.target 'external' — read as 'external', so it gets no MDM record";
  }
  return '';
}

export function classifyEntityKind(
  input: CbEntityClassification,
  mdmWritePath: boolean = MDM_WRITE_PATH_ENABLED,
): CbEntityKind {
  const ownership = input.ownership || '';
  if (!mdmWritePath) return entityKindOf(input.kind, ownership);
  const target = input.storage?.target || '';
  if (target === 'external' || ownership === 'external') return 'external';
  // `target: mdm` + `ownership: external` is undefined by the policy — the same hole `core + external`
  // was (ajustesMDM.md item 2). It cannot reach here (external wins above), which is why the CALLER is
  // told to announce it instead of the entity silently leaving MDM.

  if (target === 'mdm') return 'mdm';
  if (input.kind === 'projection') return 'metric';
  return ENTITY_KINDS.includes(input.kind as CbEntityKind) ? input.kind as CbEntityKind : 'core';
}

/** The cut points of the exported value, in the order they should be tried. */
function valueBounds(content: string): Array<[number, number]> {
  const start = content.indexOf('= ');
  if (start === -1) return [];
  const first = content.indexOf(' as const', start);
  const last = content.lastIndexOf(' as const');
  // The first cut wins for a file that appends a second export (saveDefs writes `pipeline` after the
  // value); the last is the fallback for a value that happens to contain the words.
  const ends = first === last ? [first] : [first, last];
  return ends.filter(end => end > start).map(end => [start + 2, end] as [number, number]);
}

export function parseDefsSource(content: string): unknown {
  for (const [from, to] of valueBounds(content)) {
    try {
      return JSON.parse(content.slice(from, to));
    } catch { /* try the other cut */ }
  }
  return null;
}

/**
 * Replace only the value of a defs file, keeping everything the generator wrote around it — the
 * header, the `import type`, the `satisfies` and the trailing exports. The todo files belong to the
 * generator that emitted them; this agent only flips a status inside them.
 */
export function replaceDefsValue(content: string, value: unknown): string | null {
  for (const [from, to] of valueBounds(content)) {
    try {
      JSON.parse(content.slice(from, to));
    } catch { continue; }
    return `${content.slice(0, from)}${JSON.stringify(value, null, 2)}${content.slice(to)}`;
  }
  return null;
}

/**
 * The handler vocabulary is `query | command`, but `operation.kind` speaks the generator's dialect:
 * ns/ns3 said create|update|query|view, ns4 says list|getById|create|update|delete|transition|
 * commandInput. Only reads are queries; everything else writes.
 */
export function handlerKindOf(opKind: string): 'query' | 'command' {
  return ['query', 'view', 'list', 'getById'].includes(opKind) ? 'query' : 'command';
}

/**
 * ns4 classifies a read-model as `projection`, which is what `metric` already meant here: not an
 * aggregate root by itself, but still backed by a table and seeds WHEN an operation reads it (that
 * is how a dashboard answers at runtime). Casting it silently would land on `core` and give a
 * projection nobody queries a table of its own.
 *
 * `mdm` means two different things in the two vocabularies, and the difference is the OWNERSHIP:
 * here it has always meant "master data read by id through 102034 — no local table, no port, never
 * written locally", while ns4 writes `mdm` + `ownership: moduleOwned` for master data THIS MODULE
 * owns and publishes, and compiles create/update/delete over it. Read as external, those operations
 * have nowhere to live: run 8 of buildFlowFsm generated 4 stub usecases (`functions: []`) for
 * Client/InventoryItem/Project and the final gate failed with 12 "export not found". Owned master
 * data is a local aggregate — table, port, CRUD, seeds — which is exactly `core`.
 */
export function entityKindOf(kind: string, ownership = ''): CbEntityKind {
  if (kind === 'projection') return 'metric';
  if (kind === 'mdm' && ownership === 'moduleOwned') return 'core';
  return ENTITY_KINDS.includes(kind as CbEntityKind) ? kind as CbEntityKind : 'core';
}

/** A ns4 workflow: the lifecycle of one entity, with states and transitions and no operations. */
export function isEntityLifecycle(parsed: Record<string, unknown>): boolean {
  return typeof parsed.entityRef === 'string' && !!parsed.entityRef.trim()
    && Array.isArray(parsed.states) && Array.isArray(parsed.transitions);
}

/**
 * The module a `TS2792 Cannot find module '<path>'` names, or '' for any other diagnostic.
 *
 * A generated file that imports a platform contract of another project (`/_102034_/l1/...`) compiles
 * against a Monaco model this agent borrows for the compile. When the borrow silently fails the
 * diagnostic is indistinguishable from a real broken import — and the seed run of 2026-08-16 died on
 * one, after two earlier waves had compiled the very same file. Recognizing the shape is what lets
 * the caller ask "does this file actually exist?" instead of blaming the plan.
 */
export function phantomModulePathOf(diagnostic: string): string {
  if (!/TS2792/.test(diagnostic)) return '';
  const match = /Cannot find module ['"]([^'"]+)['"]/.exec(diagnostic);
  const path = match?.[1] || '';
  return /^\/_\d+_\/l\d+\//.test(path) ? path : '';
}

/** `/_102034_/l1/server/.../contracts.js` -> the file coordinates of its source. */
export function mlsImportPathParts(path: string): { project: number; level: number; folder: string; shortName: string } | null {
  const match = /^\/_(\d+)_\/l(\d+)\/(.+)$/.exec(path);
  if (!match) return null;
  const rest = match[3].replace(/\.js$/, '');
  const cut = rest.lastIndexOf('/');
  if (cut <= 0) return null;
  return { project: Number(match[1]), level: Number(match[2]), folder: rest.slice(0, cut), shortName: rest.slice(cut + 1) };
}

/**
 * The cross-project module a resolution diagnostic names, whatever the compiler called it
 * (TS2792 "cannot find module … did you mean to set moduleResolution", TS2307 "cannot find module").
 *
 * Used where the file under compile is written by THIS agent from a fixed template — the seeds. There
 * the import is not a claim the LLM made (it only plans data rows), so a module that does not resolve
 * is an environment fact, and asking `mls.stor.files` whether the target exists measures the wrong
 * thing: it measures whether the session indexed the other project, not whether the plan is wrong.
 */
export function aliasModuleResolutionPathOf(diagnostic: string): string {
  if (!/TS(?:2792|2307)/.test(diagnostic)) return '';
  const match = /Cannot find module ['"]([^'"]+)['"]/.exec(diagnostic);
  const path = match?.[1] || '';
  return /^\/_\d+_\/l\d+\//.test(path) ? path : '';
}

/**
 * Monaco's "model already exists" — raised by `addModels` for a file whose model IS loaded, under a
 * registry key this agent's guard does not compute. The goal of the call (a usable model) is already
 * met, so the caller treats it as success; reading it as a failure logged the same warning forever
 * and left the import unborrowed.
 */
export function isModelAlreadyExistsError(message: string): boolean {
  return /model already exists/iu.test(message);
}
