/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/contracts.ts" enhancement="_blank"/>

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import type {
  D1ControllerGrant,
  D1ControllerRelationship,
  D1ScopeGrantPlan,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

export const D1_SUPPORT_VERSION = '2026-09-22-d1-support-v1' as const;

/** Same trail as the earlier steps. This step does not copy the values either. */
export const ENUMERATION_SOURCE = 'domain30.enumerations' as const;

export const ENUMERATION_REASON = 'Scope and registry have no values slot. Enum values stay on the domain draft.' as const;

export interface D1SupportProblem {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
}

export interface D1SupportNormalization {
  code: string;
  path: string;
  detail: string;
}

export interface D1SupportEnumeration {
  entityId: string;
  path: string;
  values: string[];
  consumed: false;
  source: typeof ENUMERATION_SOURCE;
  reason: typeof ENUMERATION_REASON;
}

export interface D1SupportFile {
  artifactType: string;
  defPath: string;
  action: string;
  /** Hash inventoried on the input receipt. Empty when this run has no receipt. */
  contentHash: string;
  /** Hash of the bytes on disk now. Empty when the file is absent. */
  currentHash: string;
}

/** An adapter persistence40 already planned. A removed adapter is not live. */
export interface D1SupportAdapter {
  portId: string;
  entityId: string;
  tableId: string;
  artifactId: string;
  action: string;
  defPath: string;
}

export interface D1SupportJoinStep {
  relationshipId: string;
  from: string;
  to: string;
  field: string;
}

/** Join helper recorded as a def. This step does not write a TypeScript file for it. */
export interface D1SupportHelper {
  helperId: string;
  session: 'verified';
  steps: D1SupportJoinStep[];
  consumers: string[];
}

export interface D1SupportEdge {
  id: string;
  type: string;
  dependsOn: string[];
}

export interface D1ScopeResolution {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  disclosure: 'fieldsOnly' | 'fullRecord';
  allowedFields: string[];
  anchorEntity: string;
  /** The mode the access artifact declared. Never replaced by a permissive fallback. */
  scopeMode: string;
  session: 'verified';
  path: D1SupportJoinStep[];
  pending: string;
  helperId: string;
}

export interface D1RegistryAdapter {
  portId: string;
  adapterArtifactId: string;
  factory: string;
  defPath: string;
  dependsOn: string[];
}

export interface D1PublicationItem {
  artifactType: string;
  defPath: string;
  outputPath: string;
  registers: string;
}

export interface D1PublicationLater {
  artifactType: string;
  defPath: string;
  reason: string;
}

export interface D1SupportRequest {
  project: number;
  moduleName: string;
  grants: D1ControllerGrant[];
  relationships: D1ControllerRelationship[];
  /** Scope plans controllers60 already resolved. The anchor is not corrected here. */
  scopePlans: D1ScopeGrantPlan[];
  /** Grant ids cited by handlers. A missing id is a diagnosis, not a new grant. */
  citedGrantIds: string[];
  adapters: D1SupportAdapter[];
  files: D1SupportFile[];
  /** Helpers already on the draft. A helper stays while one live consumer remains. */
  existingHelpers: D1SupportHelper[];
  /** Edges already emitted by application defs. An adapter or registry edge is inverted. */
  applicationEdges: D1SupportEdge[];
  /** Form field names a contract offered as identity. They are not the session. */
  formFields: string[];
  enumerations: Array<{ entityId: string; path: string; values: string[] }>;
}

export interface D1SupportEmit {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

export interface D1SupportBuild {
  schemaVersion: typeof D1_SUPPORT_VERSION;
  project: number;
  moduleName: string;
  llmCalls: 0;
  ok: boolean;
  enumerations: D1SupportEnumeration[];
  resolutions: D1ScopeResolution[];
  helpers: D1SupportHelper[];
  removedHelpers: string[];
  registry: D1RegistryAdapter[];
  publication: {
    stillToRegister: D1PublicationItem[];
    later: D1PublicationLater[];
  };
  problems: D1SupportProblem[];
  normalizations: D1SupportNormalization[];
  emit: D1SupportEmit[];
}
