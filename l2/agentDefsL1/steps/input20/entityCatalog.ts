/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/entityCatalog.ts" enhancement="_blank"/>

// d1_220: where the catalog of an `external` entity is. The entity names its connection by `connectionId` and nothing else; the resolver of
// the platform (`resolveConnection`, d1_208 / d2_187) says whose system it is: the platform (a catalog file written by hand), a system of
// a sibling module (its generated declaration), or a system of this module (its declaration is generated before the L2 by `/declarations`; without it, a distinct refusal).
// This file reads nothing itself: each step passes the `read` of its own host.

import { catalogFilePath, externalConnectionId } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import {
  REGISTRY_LOGICAL_PATH,
  declarationObjectOf,
  declarationRef,
  declaredSystemsOf,
  integrationLogicalPath,
  integrationOf,
  resolveConnection,
  siblingDeclarationMissing,
  siblingModuleNames,
  type ConnectionScope,
} from '/_102021_/l2/helpers/connections/catalogResolve.js';

/** What the reader takes: `_<project>_/l…` (a qualified ref), or a logical path of this project (`l4/<module>/…`). */
export type EntityCatalogRead = (ref: string) => Promise<string | null>;

export interface EntityCatalogProblem {
  code: 'SIBLING_DECLARATION_MISSING' | 'OWN_DECLARATION_NOT_GENERATED';
  detail: string;
}

export interface EntityCatalogs {
  /** `connectionId` → the source every reader opens (the platform file or the declaration a sibling generated). */
  refs: Record<string, string>;
  /** `connectionId` → the distinct refusal. The `ref` is still there, so no reader falls back to the platform path. */
  problems: Record<string, EntityCatalogProblem>;
}

export const NO_ENTITY_CATALOGS: EntityCatalogs = { refs: {}, problems: {} };

/** The distinct refusal of a system this module declares whose declaration is not generated: it names the two commands, and asks nothing of the design. */
export function ownDeclarationMissing(connectionId: string, moduleName: string, project: number): string {
  return `Connection ${connectionId} is a system this module declares, and its declaration is not generated. Run @@agentDefsL1 ${moduleName} /declarations, then @@agentMaterializeL1 {"target":"_${project}_/l1/${moduleName}/layer_1_external/connections/${connectionId}.defs.ts"}.`;
}

/** Ids of the connections the `external` entities name. Sorted, once each. */
export function externalConnectionIds(entities: Iterable<unknown>): string[] {
  const ids = new Set<string>();
  for (const entity of entities) {
    if ((entity as { kind?: unknown } | null)?.kind !== 'external') continue;
    const id = externalConnectionId(entity);
    if (id) ids.add(id);
  }
  return [...ids].sort();
}

/** The systems the L4 of this module and of its siblings declare. Called only when a connection is not on the platform. */
async function connectionScope(project: number, moduleName: string, read: EntityCatalogRead): Promise<ConnectionScope> {
  const qualified = (logical: string): string => `_${project}_/${logical}`;
  const registry = integrationOf(await read(qualified(REGISTRY_LOGICAL_PATH)));
  const siblings = [];
  for (const sibling of siblingModuleNames(registry, moduleName)) {
    siblings.push({ moduleName: sibling, systems: declaredSystemsOf(integrationOf(await read(qualified(integrationLogicalPath(sibling))))) });
  }
  const own = declaredSystemsOf(integrationOf(await read(qualified(integrationLogicalPath(moduleName)))));
  return { moduleName, own, siblings };
}

/**
 * One answer per `connectionId` of an `external` entity. The platform first (`resolveConnection`): a module that names platform
 * connections only never reads a sibling file. An id nobody declares keeps the platform path, as before.
 */
export async function resolveEntityCatalogs(
  project: number,
  moduleName: string,
  entities: Iterable<unknown>,
  read: EntityCatalogRead,
): Promise<EntityCatalogs> {
  const refs: Record<string, string> = {};
  const problems: Record<string, EntityCatalogProblem> = {};
  const pending: string[] = [];
  for (const connectionId of externalConnectionIds(entities)) {
    const platformRef = catalogFilePath(connectionId);
    refs[connectionId] = platformRef;
    if (platformRef && (await read(platformRef)) === null) pending.push(connectionId);
  }
  if (!pending.length) return { refs, problems };
  const scope = await connectionScope(project, moduleName, read);
  for (const connectionId of pending) {
    const resolved = resolveConnection(connectionId, scope, false);
    if (resolved.origin === 'own') {
      const ref = declarationRef(project, moduleName, connectionId);
      refs[connectionId] = `/${ref}`;
      if ((await read(ref)) === null) problems[connectionId] = { code: 'OWN_DECLARATION_NOT_GENERATED', detail: ownDeclarationMissing(connectionId, moduleName, project) };
    } else if (resolved.origin === 'sibling') {
      const ref = declarationRef(project, resolved.moduleName, connectionId);
      refs[connectionId] = `/${ref}`;
      if ((await read(ref)) === null) problems[connectionId] = { code: 'SIBLING_DECLARATION_MISSING', detail: siblingDeclarationMissing(connectionId, resolved.moduleName) };
    }
  }
  return { refs, problems };
}

/** The object of a catalog text: `export const x = {…}` (the platform, an MDM catalog) or `const x = {…}; export default x` (a generated declaration). Null when it is neither. */
export function parseCatalogSource(text: string): unknown | null {
  return parseD1Source(text, 'defs') ?? declarationObjectOf(text);
}
