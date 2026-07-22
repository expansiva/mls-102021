/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbScope.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure single-module scoping for a backend scan. A run targets exactly ONE module so each task stays
// small (a project may hold several modules). Type-only imports from cbShared (erased at build) keep
// this side-effect-free and unit-testable — the l2 test stub crashes on cbShared's libModel import.

import type { CbOwner, CbEntity, CbRelationship, CbWorkspace, CbActor } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';

export interface CbScopeInput {
  owners: CbOwner[];
  entities: CbEntity[];
  relationships: CbRelationship[];
  workspaces: CbWorkspace[];
  actors: CbActor[];
  allModuleNames: string[];
  /** Explicit target module (CLI arg or longMemory). Empty = auto: first sorted module with owners. */
  requestedModule: string;
}

export interface CbScopeResult {
  moduleName: string;
  owners: CbOwner[];
  entities: CbEntity[];
  relationships: CbRelationship[];
  workspaces: CbWorkspace[];
  actors: CbActor[];
  warning: string | null;
}

/** Resolve the target module and filter every collection to it. The target is the explicit requested
 * module, else the first (sorted) module that has owners in the caller's requested statuses, else the
 * first module overall. A requested-but-absent module yields empty owners plus a warning (so the run
 * finishes cleanly with "no work" instead of silently spanning modules). Relationships are kept only
 * when BOTH endpoints are in-scope entities, so no seeded/generated artifact dangles across modules. */
export function scopeBackendScan(input: CbScopeInput): CbScopeResult {
  const pendingModules = [...new Set(input.owners.map(o => o.moduleName).filter(Boolean))].sort();
  const requested = input.requestedModule.trim();
  const moduleName = requested || pendingModules[0] || input.allModuleNames[0] || '';
  if (!moduleName) {
    return {
      moduleName: '',
      owners: input.owners, entities: input.entities, relationships: input.relationships,
      workspaces: input.workspaces, actors: input.actors, warning: null,
    };
  }
  const entities = input.entities.filter(e => e.moduleName === moduleName);
  const inScope = new Set(entities.map(e => e.entityId));
  const warning = (requested && !input.allModuleNames.includes(requested))
    ? `requested module '${requested}' not found in project modules [${input.allModuleNames.join(', ') || 'none'}]`
    : null;
  return {
    moduleName,
    owners: input.owners.filter(o => o.moduleName === moduleName),
    entities,
    relationships: input.relationships.filter(r => inScope.has(r.fromEntity) && inScope.has(r.toEntity)),
    workspaces: input.workspaces.filter(w => w.moduleName === moduleName),
    actors: input.actors.filter(a => a.moduleName === moduleName),
    warning,
  };
}
