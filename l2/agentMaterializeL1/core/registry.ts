/// <mls fileReference="_102021_/l2/agentMaterializeL1/core/registry.ts" enhancement="_blank"/>

/**
 * Closed handler registry. This file is the only integrator: m1_03, m1_06 and m1_07
 * deliver a MaterializeHandler; wiring it stays here. A type with no named entry is
 * blocked by the planner. Nothing in this module writes a file.
 */

import { isM1ArtifactType, type M1ArtifactType } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';

export const M1_HANDLER_STAGES = ['structure', 'implement'] as const;
export type M1HandlerStage = typeof M1_HANDLER_STAGES[number];

/** Platform capabilities a handler may ask the context resolver to load. MDM catalog is not one of them. */
export const M1_CONTEXT_CAPABILITIES = [
  'requestContext',
  'dataRuntime',
  'tableDefinition',
  'repositoryRegistry',
  'mdmFacade',
] as const;
export type M1ContextCapability = typeof M1_CONTEXT_CAPABILITIES[number];

export interface MaterializeHandler {
  readonly id: string;
  readonly artifactType: M1ArtifactType;
  readonly stage: M1HandlerStage;
  /** False means the recipe is local. Simulate never calls a model for this handler. */
  readonly needsLlm: boolean;
  readonly capabilities: readonly M1ContextCapability[];
}

const STRUCTURE: Record<M1ArtifactType, MaterializeHandler> = {
  domainEntity: handler('structure.domainEntity', 'domainEntity', 'structure', []),
  valueObject: handler('structure.valueObject', 'valueObject', 'structure', []),
  repositoryPort: handler('structure.repositoryPort', 'repositoryPort', 'structure', []),
  table: handler('persistence.table', 'table', 'structure', ['tableDefinition']),
  repositoryAdapter: handler('persistence.repositoryAdapter', 'repositoryAdapter', 'structure', [
    'requestContext', 'dataRuntime', 'tableDefinition', 'repositoryRegistry',
  ]),
  usecase: handler('structure.usecase', 'usecase', 'structure', ['requestContext', 'repositoryRegistry']),
  httpController: handler('structure.httpController', 'httpController', 'structure', ['requestContext']),
  accessScope: handler('structure.accessScope', 'accessScope', 'structure', ['requestContext']),
  authorityMap: handler('structure.authorityMap', 'authorityMap', 'structure', ['requestContext']),
  repositoryRegistration: handler('persistence.repositoryRegistration', 'repositoryRegistration', 'structure', [
    'requestContext', 'repositoryRegistry',
  ]),
  persistenceSeeds: handler('persistence.persistenceSeeds', 'persistenceSeeds', 'structure', ['tableDefinition']),
  integrationOutbound: handler('persistence.integrationOutbound', 'integrationOutbound', 'structure', []),
};

/** Implement recipes. A type missing here has no fallback onto the structure scaffolder. */
export const M1_IMPLEMENT_HANDLERS: Partial<Record<M1ArtifactType, MaterializeHandler>> = {
  domainEntity: handler('implement.domainEntity', 'domainEntity', 'implement', []),
  repositoryPort: handler('implement.repositoryPort', 'repositoryPort', 'implement', []),
  usecase: handler('implement.usecase', 'usecase', 'implement', ['requestContext', 'repositoryRegistry']),
  accessScope: handler('implement.accessScope', 'accessScope', 'implement', ['requestContext']),
  authorityMap: handler('implement.authorityMap', 'authorityMap', 'implement', ['requestContext']),
};

export const M1_STRUCTURE_HANDLERS: Readonly<Record<M1ArtifactType, MaterializeHandler>> = STRUCTURE;

export function handlerFor(type: string, stage: M1HandlerStage = 'structure'): MaterializeHandler | null {
  if (!isM1ArtifactType(type)) return null;
  if (stage === 'implement') return M1_IMPLEMENT_HANDLERS[type] ?? null;
  return STRUCTURE[type];
}

export function registeredHandlerIds(stage: M1HandlerStage = 'structure'): string[] {
  if (stage === 'implement') {
    return Object.values(M1_IMPLEMENT_HANDLERS).map(item => item.id).sort();
  }
  return Object.values(STRUCTURE).map(item => item.id).sort();
}

function handler(
  id: string,
  artifactType: M1ArtifactType,
  stage: M1HandlerStage,
  capabilities: readonly M1ContextCapability[],
): MaterializeHandler {
  return { id, artifactType, stage, needsLlm: false, capabilities };
}
