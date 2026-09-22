/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/contracts.ts" enhancement="_blank"/>

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

export const D1_DOMAIN_VERSION = '2026-09-21-d1-domain-v1' as const;

export const D1_DOMAIN_ACTIONS = ['create', 'update', 'recompose', 'preserve', 'remove', 'conflict'] as const;
export type D1DomainAction = typeof D1_DOMAIN_ACTIONS[number];

export type D1RulePlacement = 'invariant' | 'application' | 'platform';

export interface D1DomainFile {
  artifactType: string;
  identity: string;
  defPath: string;
  action: string;
}

export interface D1DomainTableRef {
  tableId: string;
  entity: string;
}

/** The slice of the input20 inventory this step reads. Matching is by exact id. */
export interface D1DomainSelection {
  entities: string[];
  files: D1DomainFile[];
  tables: D1DomainTableRef[];
}

export interface D1DomainProblem {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
}

export interface D1Normalization {
  code: string;
  path: string;
  detail: string;
}

export interface D1PlacedRule {
  ruleId: string;
  owner: 'module' | 'platform';
  /** Module artifact, or the catalog path the entity source names. Spelling is the citation. */
  source: string;
  placement: D1RulePlacement;
}

export interface D1Enumeration {
  path: string;
  values: string[];
}

export interface D1DomainEntityPlan {
  entityId: string;
  action: string;
  defPath: string;
  storageTarget: string;
  emitsLocalPersistence: false;
  derivedInitial: string | null;
  uniqueKeys: string[][];
  enumerations: D1Enumeration[];
  rules: D1PlacedRule[];
  definition: D1Definition | null;
}

export interface D1DomainValuePlan {
  valueObjectId: string;
  defPath: string;
  referencedBy: string[];
  definition: D1Definition | null;
}

export interface D1DomainEmit {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

export interface D1DomainBuild {
  schemaVersion: typeof D1_DOMAIN_VERSION;
  project: number;
  moduleName: string;
  llmCalls: 0;
  ok: boolean;
  entities: D1DomainEntityPlan[];
  valueObjects: D1DomainValuePlan[];
  problems: D1DomainProblem[];
  normalizations: D1Normalization[];
  preserved: string[];
  removed: string[];
  emit: D1DomainEmit[];
}
