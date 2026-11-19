/// <mls fileReference="_102021_/l2/helpers/connections/catalogResolve.ts" enhancement="_blank"/>

// d1_208: where the catalog of a `connectionId` lives. Three places, in this order: the platform (`102034`, a file written by hand),
// a system this module declares in its L4 `externalSystems`, a system a sibling module of the project declares. A declared system
// has no catalog file: its declaration is generated (`l1/<module>/layer_1_external/connections/<systemId>.ts`).
// `catalogFilePath` (102020) stays as it is for the platform; every reader asks this resolver first.

/** What the L4 knows of a system outside the app. No address, method, format or type (they are born in the L1). */
export interface DeclaredSystem {
  id: string;
  title: string;
  description: string;
  settings: Array<{ id: string; title: string; description: string; secret: boolean }>;
  operations: Array<{ operationId: string; direction: 'call' | 'serve'; description: string }>;
}

export interface SiblingSystems {
  moduleName: string;
  systems: readonly DeclaredSystem[];
}

/** The systems the L4 of the module and the L4 of its siblings declare. Read by the caller, so this file reads nothing. */
export interface ConnectionScope {
  moduleName: string;
  own: readonly DeclaredSystem[];
  siblings: readonly SiblingSystems[];
}

export type ResolvedConnection =
  | { origin: 'platform'; connectionId: string }
  | { origin: 'own'; connectionId: string; moduleName: string; system: DeclaredSystem }
  | { origin: 'sibling'; connectionId: string; moduleName: string; system: DeclaredSystem }
  | { origin: 'unknown'; connectionId: string };

export const EMPTY_SCOPE: ConnectionScope = { moduleName: '', own: [], siblings: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `externalSystems` of an L4 integration artifact, each system with only the fields the L4 defines. Empty when absent. */
export function declaredSystemsOf(integration: unknown): DeclaredSystem[] {
  const list = isRecord(integration) && Array.isArray(integration.externalSystems) ? integration.externalSystems : [];
  const out: DeclaredSystem[] = [];
  for (const row of list) {
    if (!isRecord(row) || !text(row.id)) continue;
    const settings = (Array.isArray(row.settings) ? row.settings : []).filter(isRecord).filter(item => text(item.id)).map(item => ({
      id: text(item.id),
      title: text(item.title),
      description: text(item.description),
      secret: item.secret === true,
    }));
    const operations = (Array.isArray(row.operations) ? row.operations : []).filter(isRecord)
      .filter(item => text(item.operationId) && (item.direction === 'call' || item.direction === 'serve'))
      .map(item => ({ operationId: text(item.operationId), direction: item.direction as 'call' | 'serve', description: text(item.description) }));
    out.push({ id: text(row.id), title: text(row.title), description: text(row.description), settings, operations });
  }
  return out;
}

/**
 * The platform comes first (`platformHas`), as in the NS5 gate: a declared system never shadows a platform connection.
 * Then this module's system, then a sibling's. `unknown` leaves the reader on its own refusal.
 */
export function resolveConnection(connectionId: string, scope: ConnectionScope, platformHas: boolean): ResolvedConnection {
  if (platformHas) return { origin: 'platform', connectionId };
  const own = scope.own.find(system => system.id === connectionId);
  if (own) return { origin: 'own', connectionId, moduleName: scope.moduleName, system: own };
  for (const sibling of scope.siblings) {
    const system = sibling.systems.find(item => item.id === connectionId);
    if (system) return { origin: 'sibling', connectionId, moduleName: sibling.moduleName, system };
  }
  return { origin: 'unknown', connectionId };
}

/** `l1/<module>/layer_1_external/connections/<systemId>` — the folder and name the platform reads by the L4 systemId (contract §2.5). */
function declarationBase(moduleName: string, systemId: string): string {
  return `l1/${moduleName}/layer_1_external/connections/${systemId}`;
}

/** The generated declaration of a system, as a logical `l1/...` path. */
export function declarationDefPath(moduleName: string, systemId: string): string {
  return `${declarationBase(moduleName, systemId)}.defs.ts`;
}

export function declarationFilePath(moduleName: string, systemId: string): string {
  return `${declarationBase(moduleName, systemId)}.ts`;
}

/** Source ref of the generated declaration, `_<project>_/l1/...ts`, the form `ctx.read` takes. */
export function declarationRef(project: number, moduleName: string, systemId: string): string {
  return `_${project}_/${declarationFilePath(moduleName, systemId)}`;
}

/** Import specifier the generated code uses for the declaration (and the types it exports). */
export function declarationImportPath(project: number, moduleName: string, systemId: string): string {
  return `/_${project}_/${declarationBase(moduleName, systemId)}.js`;
}

/**
 * The distinct refusal of a system a sibling declares whose declaration is not generated yet. It names the module to generate first;
 * it is never the generic missing catalog.
 */
export function siblingDeclarationMissing(connectionId: string, moduleName: string): string {
  return `Connection ${connectionId} is a system declared by module ${moduleName}, and its declaration is not generated. Generate module ${moduleName} first (agentMaterializeL1), then this one.`;
}

/** The type file of the runtime (the declaration type and its validator): an input of every declaration. No import here, on purpose. */
export const DECLARATION_TYPES_REF = '_102034_/l1/server/layer_1_external/connections/external/types.ts';
export const DECLARATION_TYPES_IMPORT = '/_102034_/l1/server/layer_1_external/connections/external/types.js';

/** The project registry the NS5 keeps: the list of the modules of the project (`l5/config.json` lists none). */
export const REGISTRY_LOGICAL_PATH = 'l4/organization/registry.defs.ts';

export function integrationLogicalPath(moduleName: string): string {
  return `l4/${moduleName}/integration.defs.ts`;
}

/** The other modules of the project, read from its registry. Empty when the registry is absent or has no module list. */
export function siblingModuleNames(registry: unknown, moduleName: string): string[] {
  const list = isRecord(registry) && Array.isArray(registry.modules) ? registry.modules : [];
  const names = list.filter(isRecord).map(item => text(item.moduleName)).filter(name => name && name !== moduleName);
  return [...new Set(names)].sort();
}
