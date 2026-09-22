/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/contracts.ts" enhancement="_blank"/>

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

export const D1_CONTROLLER_VERSION = '2026-09-22-d1-controllers-v1' as const;

/** Same trail as domain30 and usecases50. This step does not copy the values either. */
export const ENUMERATION_SOURCE = 'domain30.enumerations' as const;

export const ENUMERATION_REASON = 'Controller projection has no values slot. Enum values stay on the domain draft.' as const;

export const HANDLER_STEPS = ['transport', 'session', 'authorize', 'call', 'project', 'bff'] as const;

export interface D1ControllerProblem {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
}

export interface D1ControllerNormalization {
  code: string;
  path: string;
  detail: string;
}

export interface D1ControllerEnumeration {
  entityId: string;
  path: string;
  values: string[];
  consumed: false;
  source: typeof ENUMERATION_SOURCE;
  reason: typeof ENUMERATION_REASON;
}

export interface D1ControllerPage {
  pageId: string;
  actors: string[];
  defPath: string;
}

export interface D1ControllerRoute {
  route: string;
  page: string;
  kind: string;
  usecaseRef: string;
  status: string;
}

export interface D1ControllerUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
  functionName: string;
  defPath: string;
}

export interface D1ControllerGrant {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  disclosure: 'fieldsOnly' | 'fullRecord';
  allowedFields: string[];
  anchorEntity: string;
  scopeMode: string;
}

export interface D1ControllerRelationship {
  relationshipId: string;
  from: string;
  to: string;
  /** Copied from the relationship. Empty when the relationship declares none. */
  field: string;
  required: boolean;
}

export interface D1ContractSource {
  pageId: string;
  path: string;
  source: string;
}

export interface D1ExistingHandler {
  route: string;
  kind: 'query' | 'command';
  usecaseId: string;
  grantIds: string[];
}

/** A controller file already on disk. Parsed, never evaluated. */
export interface D1ExistingController {
  pageId: string;
  routes: string[];
  handlers: D1ExistingHandler[];
  unreadable: boolean;
}

export interface D1EnumerationRef {
  entityId: string;
  path: string;
  values: string[];
}

export interface D1ControllerRequest {
  project: number;
  moduleName: string;
  pages: D1ControllerPage[];
  routes: D1ControllerRoute[];
  usecases: D1ControllerUsecase[];
  grants: D1ControllerGrant[];
  relationships: D1ControllerRelationship[];
  contracts: D1ContractSource[];
  existing: D1ExistingController[];
  enumerations: D1EnumerationRef[];
  accessRead: boolean;
  actorsRead: boolean;
}

export interface D1ScopeRelationship {
  relationshipId: string;
  from: string;
  to: string;
  field: string;
}

/** Scope plan support70 will emit. The anchor is the one the access artifact declared. */
export interface D1ScopeGrantPlan {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  disclosure: 'fieldsOnly' | 'fullRecord';
  allowedFields: string[];
  anchorEntity: string;
  relationships: D1ScopeRelationship[];
  pending: string;
  emittedBy: 'support70';
}

export interface D1HandlerProjection {
  shape: 'array' | 'object' | 'unresolved';
  fields: string[];
  envelope: 'passthrough';
}

export interface D1HandlerBinding {
  route: string;
  pageId: string;
  kind: 'query' | 'command';
  usecaseId: string;
  functionName: string;
  contractPath: string;
  inputSymbol: string;
  outputSymbol: string;
  status: string;
  preserved: boolean;
  grantIds: string[];
  projection: D1HandlerProjection;
  session: 'verified';
  steps: typeof HANDLER_STEPS;
  scopePlan: D1ScopeGrantPlan[];
}

export interface D1ControllerItem {
  pageId: string;
  defPath: string;
  handlers: D1HandlerBinding[];
  staleRoutes: string[];
  definition: D1Definition | null;
}

export interface D1ControllerEmit {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

export interface D1ControllerBuild {
  schemaVersion: typeof D1_CONTROLLER_VERSION;
  project: number;
  moduleName: string;
  llmCalls: 0;
  ok: boolean;
  measuredRoutes: number;
  measuredPages: number;
  enumerations: D1ControllerEnumeration[];
  controllers: D1ControllerItem[];
  problems: D1ControllerProblem[];
  normalizations: D1ControllerNormalization[];
  emit: D1ControllerEmit[];
}
