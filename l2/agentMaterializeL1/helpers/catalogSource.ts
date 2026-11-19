/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/catalogSource.ts" enhancement="_blank"/>

// d1_208 s3: where the source of the catalog of a connection is, for every reader of the materializer. The platform file first, as
// always; then the declaration this module generated for a system it declares; then the declaration a sibling module generated.
// The declaration has the shape the readers need: the operations with `kind`, `inputType` and `outputType`, and the types exported
// in the same file. A system whose declaration is not generated has a distinct refusal; it is never the generic missing catalog.

import { catalogFilePath, catalogImportPath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import {
  REGISTRY_LOGICAL_PATH,
  declarationImportPath,
  declarationRef,
  declaredSystemsOf,
  integrationLogicalPath,
  integrationOf,
  siblingDeclarationMissing,
  siblingModuleNames,
} from '/_102021_/l2/helpers/connections/catalogResolve.js';

export type CatalogRead = (ref: string) => Promise<string | null>;

export interface ConnectionCatalogSource {
  connectionId: string;
  origin: 'platform' | 'own' | 'sibling';
  /** What `read` takes: the platform file, or the generated declaration. */
  ref: string;
  /** What generated code imports the catalog types from. */
  importPath: string;
  /** The text of `ref`; null when it was not read. */
  source: string | null;
  /** Set when the system is declared but its declaration is not generated: the module to generate first. */
  problem?: { code: string; detail: string };
}

/** The project and the module of a ref of a generated file: `_<project>_/l1/<module>/...`. */
export function l1OwnerOfRef(ref: string): { project: number; moduleName: string } | null {
  const match = /^\/?_(\d+)_\/l1\/([^/]+)\//u.exec(ref);
  return match ? { project: Number(match[1]), moduleName: match[2] } : null;
}

export async function connectionCatalogSource(read: CatalogRead, project: number, moduleName: string, connectionId: string): Promise<ConnectionCatalogSource> {
  const platformRef = catalogFilePath(connectionId);
  const platform: ConnectionCatalogSource = { connectionId, origin: 'platform', ref: platformRef, importPath: catalogImportPath(connectionId), source: null };
  if (!platformRef) return platform;
  const platformSource = await read(platformRef);
  if (platformSource !== null) return { ...platform, source: platformSource };
  const own = declaredSystemsOf(integrationOf(await read(`_${project}_/${integrationLogicalPath(moduleName)}`))).find(system => system.id === connectionId);
  if (own) {
    const ref = declarationRef(project, moduleName, connectionId);
    const source = await read(ref);
    return {
      connectionId, origin: 'own', ref, importPath: declarationImportPath(project, moduleName, connectionId), source,
      ...(source === null ? { problem: { code: 'DECLARATION_NOT_GENERATED', detail: `Connection ${connectionId} is a system this module declares, and its declaration ${ref} is not generated. Run the external15 phase first.` } } : {}),
    };
  }
  const registry = integrationOf(await read(`_${project}_/${REGISTRY_LOGICAL_PATH}`));
  for (const sibling of siblingModuleNames(registry, moduleName)) {
    const declared = declaredSystemsOf(integrationOf(await read(`_${project}_/${integrationLogicalPath(sibling)}`))).find(system => system.id === connectionId);
    if (!declared) continue;
    const ref = declarationRef(project, sibling, connectionId);
    const source = await read(ref);
    return {
      connectionId, origin: 'sibling', ref, importPath: declarationImportPath(project, sibling, connectionId), source,
      ...(source === null ? { problem: { code: 'SIBLING_DECLARATION_MISSING', detail: siblingDeclarationMissing(connectionId, sibling) } } : {}),
    };
  }
  return platform;
}
