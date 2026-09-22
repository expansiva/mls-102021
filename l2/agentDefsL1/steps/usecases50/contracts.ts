/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/contracts.ts" enhancement="_blank"/>

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

export const D1_USECASE_VERSION = '2026-09-21-d1-usecases-v1' as const;

/** Same trail as persistence40. This step does not copy the values either. */
export const ENUMERATION_SOURCE = 'domain30.enumerations' as const;

export const ENUMERATION_REASON = 'Usecase projection has no values slot. Enum values stay on the domain draft.' as const;

export const D1_WORKER_KINDS = ['port', 'rule', 'mdm', 'transition', 'effect', 'transaction', 'context'] as const;

export const D1_MDM_CALLS = ['read', 'attach', 'create'] as const;

export const D1_WRITE_CALLS = ['create', 'update', 'transition', 'delete'] as const;

export interface D1UsecaseProblem {
  severity: 'error' | 'review';
  code: string;
  path: string;
  message: string;
}

export interface D1UsecaseNormalization {
  code: string;
  path: string;
  detail: string;
}

/** Domain enum values cited by path and not copied onto a usecase. */
export interface D1UsecaseEnumeration {
  entityId: string;
  path: string;
  values: string[];
  consumed: false;
  source: typeof ENUMERATION_SOURCE;
  reason: typeof ENUMERATION_REASON;
}

export interface D1UsecaseField {
  name: string;
  type: string;
  derived: boolean;
}

export interface D1UsecaseTransition {
  transitionId: string;
  from: string[];
  to: string;
  by: string[];
  ruleRefs: string[];
}

export interface D1UsecaseEntity {
  entityId: string;
  storageTarget: string;
  defPath: string;
  /** Empty when the ontology names none. The step does not invent one. */
  namespace: string;
  fields: D1UsecaseField[];
  transitions: D1UsecaseTransition[];
  rules: Array<{ ruleId: string; owner: 'module' | 'platform' }>;
  enumerations: Array<{ path: string; values: string[] }>;
}

export interface D1UsecasePort {
  portId: string;
  entityId: string;
  defPath: string;
  methods: string[];
}

export interface D1UsecaseRoute {
  route: string;
  page: string;
  kind: string;
  usecaseRef: string;
}

export interface D1UsecaseSelection {
  usecaseId: string;
  entity: string;
  operation: string;
  routes: string[];
  defPath: string;
}

export interface D1OutboundEvent {
  eventId: string;
  on: string;
}

export interface D1ContractSource {
  pageId: string;
  path: string;
  source: string;
}

export interface D1WorkerPort {
  kind: 'port';
  call: string;
  port: string;
}

export interface D1WorkerRule {
  kind: 'rule';
  ruleId: string;
}

export interface D1WorkerMdm {
  kind: 'mdm';
  namespace: string;
  call: string;
  entity: string;
}

export interface D1WorkerTransition {
  kind: 'transition';
  transitionId: string;
  payload: string[];
}

export interface D1WorkerEffect {
  kind: 'effect';
  eventId: string;
}

export interface D1WorkerTransaction {
  kind: 'transaction';
  boundary: string;
}

export interface D1WorkerContext {
  kind: 'context';
  source: string;
}

export type D1WorkerStep =
  | D1WorkerPort
  | D1WorkerRule
  | D1WorkerMdm
  | D1WorkerTransition
  | D1WorkerEffect
  | D1WorkerTransaction
  | D1WorkerContext;

/** One model reply, already parsed. Operational means the reply never arrived. */
export interface D1UsecasePlanInput {
  usecaseId: string;
  steps: D1WorkerStep[];
  operational?: boolean;
  trace?: string;
}

export interface D1UsecaseRequest {
  project: number;
  moduleName: string;
  usecases: D1UsecaseSelection[];
  routes: D1UsecaseRoute[];
  ports: D1UsecasePort[];
  entities: D1UsecaseEntity[];
  moduleRules: string[];
  outbound: D1OutboundEvent[];
  contracts: D1ContractSource[];
  plans: D1UsecasePlanInput[];
  llmCalls: number;
}

export interface D1UsecaseMdm {
  namespace: string;
  call: string;
}

export interface D1UsecaseItem {
  usecaseId: string;
  entityId: string;
  operation: string;
  defPath: string;
  routes: string[];
  trustedContext: 'ctx';
  mdm: D1UsecaseMdm | null;
  transactionBoundary: 'local' | null;
  steps: D1WorkerStep[];
  definition: D1Definition | null;
}

export interface D1UsecaseEmit {
  definition: D1Definition;
  pipeline: D1PipelineItem[];
}

export interface D1UsecaseBuild {
  schemaVersion: typeof D1_USECASE_VERSION;
  project: number;
  moduleName: string;
  llmCalls: number;
  ok: boolean;
  enumerations: D1UsecaseEnumeration[];
  usecases: D1UsecaseItem[];
  problems: D1UsecaseProblem[];
  normalizations: D1UsecaseNormalization[];
  emit: D1UsecaseEmit[];
}
