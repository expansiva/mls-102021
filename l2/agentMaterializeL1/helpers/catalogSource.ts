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
  resolveConnection,
  siblingDeclarationMissing,
  siblingModuleNames,
  type SiblingSystems,
} from '/_102021_/l2/helpers/connections/catalogResolve.js';

/** True for the import of the types of one platform connection catalog: the single path of `catalogImportPath` (d1_223: it is no longer under the platform `l1/`). */
export function isCatalogImport(specifier: string): boolean {
  const connectionId = /\/([^/]+)\.js$/u.exec(specifier)?.[1] ?? '';
  return connectionId !== '' && catalogImportPath(connectionId) === specifier;
}

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
  // The platform comes first, as in `resolveConnection`: then nothing else is read. After it the order (this module, a sibling) is the resolver's.
  if (platformSource !== null) return { ...platform, source: platformSource };
  const own = declaredSystemsOf(integrationOf(await read(`_${project}_/${integrationLogicalPath(moduleName)}`)));
  const siblings: SiblingSystems[] = [];
  let resolved = resolveConnection(connectionId, { moduleName, own, siblings }, false);
  if (resolved.origin === 'unknown') {
    const registry = integrationOf(await read(`_${project}_/${REGISTRY_LOGICAL_PATH}`));
    for (const sibling of siblingModuleNames(registry, moduleName)) {
      siblings.push({ moduleName: sibling, systems: declaredSystemsOf(integrationOf(await read(`_${project}_/${integrationLogicalPath(sibling)}`))) });
      resolved = resolveConnection(connectionId, { moduleName, own, siblings }, false);
      if (resolved.origin !== 'unknown') break;
    }
  }
  if (resolved.origin === 'own') {
    const ref = declarationRef(project, moduleName, connectionId);
    const source = await read(ref);
    return {
      connectionId, origin: 'own', ref, importPath: declarationImportPath(project, moduleName, connectionId), source,
      ...(source === null ? { problem: { code: 'DECLARATION_NOT_GENERATED', detail: `Connection ${connectionId} is a system this module declares, and its declaration ${ref} is not generated. Run the external15 phase first.` } } : {}),
    };
  }
  if (resolved.origin === 'sibling') {
    const ref = declarationRef(project, resolved.moduleName, connectionId);
    const source = await read(ref);
    return {
      connectionId, origin: 'sibling', ref, importPath: declarationImportPath(project, resolved.moduleName, connectionId), source,
      ...(source === null ? { problem: { code: 'SIBLING_DECLARATION_MISSING', detail: siblingDeclarationMissing(connectionId, resolved.moduleName) } } : {}),
    };
  }
  return platform;
}

/**
 * The declarations of sibling systems a generated file may import (d1_208 decision of the planner): the declaration of the system a
 * `connections[]` line of this module names, and of no other sibling. Any other file of a sibling stays refused by the import gates.
 */
export async function siblingDeclarationImports(read: CatalogRead, project: number, moduleName: string): Promise<string[]> {
  const root = integrationOf(await read(`_${project}_/${integrationLogicalPath(moduleName)}`));
  const rows = root !== null && typeof root === 'object' && Array.isArray((root as { connections?: unknown }).connections) ? (root as { connections: unknown[] }).connections : [];
  const ids = [...new Set(rows.map(row => (row !== null && typeof row === 'object' ? (row as { connectionId?: unknown }).connectionId : undefined)).filter((id): id is string => typeof id === 'string' && id !== ''))].sort();
  const imports: string[] = [];
  for (const connectionId of ids) {
    const found = await connectionCatalogSource(read, project, moduleName, connectionId);
    if (found.origin === 'sibling') imports.push(found.importPath);
  }
  return imports;
}

