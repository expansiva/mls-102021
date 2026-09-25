/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/contracts.ts" enhancement="_blank"/>

import type { D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

export const D1_USECASE_VERSION = '2026-09-21-d1-usecases-v1' as const;

/** Same trail as persistence40. This step does not copy the values either. */
export const ENUMERATION_SOURCE = 'domain30.enumerations' as const;

export const ENUMERATION_REASON = 'Usecase projection has no values slot. Enum values stay on the domain draft.' as const;

export const D1_WORKER_KINDS = ['port', 'rule', 'mdm', 'transition', 'effect', 'transaction', 'context'] as const;

/**
 * Facade methods a plan may name. `read` and `attach` are not methods:
 * a point read, a collection read and a platform-field update are different calls.
 * The tool offers only the methods the operation's binding names. This list stays
 * the facade, so a manipulated reply can still be recognized and refused.
 */
export const D1_MDM_CALLS = [
  'get',
  'findByDocument',
  'findByContact',
  'listByType',
  'relatedOfMany',
  'create',
  'attachRole',
  'update',
  'inactivate',
  'reactivate',
  'link',
  'invite',
] as const;

export type D1MdmCall = (typeof D1_MDM_CALLS)[number];

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
  /** Field paths the ontology names. Empty when that transition declares none. */
  payload?: string[];
  description?: string;
}

export interface D1UsecaseEntity {
  entityId: string;
  storageTarget: string;
  defPath: string;
  /** Empty when the ontology names none. The step does not invent one. */
  namespace: string;
  fields: D1UsecaseField[];
  transitions: D1UsecaseTransition[];
  rules: Array<{ ruleId: string; owner: 'module' | 'platform'; source?: string }>;
  /** Ontology unique keys. Empty when the entity draft did not carry them. */
  uniqueKeys?: string[][];
  enumerations: Array<{ path: string; values: string[] }>;
  /** Capability ids the ontology declares. Absent when this step was not given the body. */
  capabilities?: string[];
  /** Non-derived platform field paths. The MDM binding maps each one to a facade patch key. */
  platformFields?: string[];
}

export interface D1PortSignature {
  name: string;
  params: string[];
  returns: string;
}

export interface D1UsecasePort {
  portId: string;
  entityId: string;
  defPath: string;
  methods: string[];
  signatures?: D1PortSignature[];
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
  kind?: string;
  to?: string;
  description?: string;
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
  /** Facade method the model named. Not trusted until the gate matches it to a capability. */
  call: string;
  entity: string;
  /** Capability this step claims to execute. */
  capability: string;
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

/** A source the snapshot approved, or a file that was missing or had changed. */
export interface D1SourceFinding {
  code: 'SOURCE_ABSENT' | 'SOURCE_CHANGED' | 'RULE_TEXT_ABSENT' | 'CONTRACT_UNPARSED';
  path: string;
  message: string;
}

export interface D1SourceHash {
  path: string;
  sha256: string;
}

export interface D1SourceText {
  path: string;
  text: string;
}

/**
 * One applicability row. `enforcement` is the status of this obligation.
 * `local` runs in the usecase. `delegated` would name a structured method; the catalog has none.
 * `pending` is a gap and is not a step. An empty `ruleId` is the storage unique-key row, not a rule.
 */
export interface D1RulePlanRow {
  ruleId: string;
  origin: string;
  consumer: string;
  enforcement: 'local' | 'delegated' | 'pending';
  gap: string;
}

/** One rule the operation is subject to. The text is the source, not a summary. */
export interface D1RuleText {
  ruleId: string;
  owner: 'module' | 'platform';
  source: string;
  text: string;
}

export interface D1ContractPath {
  path: string;
  type: string;
  optional: boolean;
}

export interface D1AccessGrant {
  grantId: string;
  actorRef: string;
  scope: string;
  anchorEntity: string;
  scopeDetail: string;
  disclosure: string;
  disclosureDetail: string;
  allowedFields: string[];
}

export interface D1RouteContext {
  route: string;
  page: string;
  contractPath: string;
  inputSymbol: string;
  outputSymbol: string;
  inputFields: D1ContractPath[];
  outputFields: D1ContractPath[];
  /** Set when this route's contract does not bind the route. Not a second type. */
  unbound: string;
  access: D1AccessGrant[];
}

export interface D1CapabilityText {
  name: string;
  text: string;
}

export interface D1JourneyContext {
  journeyId: string;
  path: string;
  actorRef: string;
  goal: string;
  steps: Array<{ stepId: string; kind: string; transitionRef: string; description: string }>;
}

/**
 * Business context for one usecase. Contract symbols stay a reading of the L2
 * source. This is not a DTO the gate trusts instead of that source.
 */
export interface D1UsecaseContext {
  usecaseId: string;
  lifecycle: boolean;
  transition: {
    transitionId: string;
    from: string[];
    to: string;
    by: string[];
    ruleRefs: string[];
    payload: string[];
    description: string;
  } | null;
  capabilities: D1CapabilityText[];
  effectiveFields: string[];
  routes: D1RouteContext[];
  /** Rules this operation enforces. Pending obligations are not in this list. */
  rules: D1RuleText[];
  rulePlan: D1RulePlanRow[];
  /** Texts for pending rows. Not offered to the worker as steps. */
  pendingRules: D1RuleText[];
  portId: string;
  portMethods: D1PortSignature[];
  effects: D1OutboundEvent[];
  journeys: D1JourneyContext[];
  findings: D1SourceFinding[];
  sources: D1SourceHash[];
}

/** The human prompt that was handed to the worker, plus the hashes it was built from. */
export interface D1PromptEvidence {
  usecaseId: string;
  bytes: number;
  sha256: string;
  snapshotHash: string;
  sourceHashes: D1SourceHash[];
  text: string;
}

export interface D1UsecaseRequest {
  project: number;
  moduleName: string;
  usecases: D1UsecaseSelection[];
  routes: D1UsecaseRoute[];
  ports: D1UsecasePort[];
  entities: D1UsecaseEntity[];
  /** Ids only. The gate uses this catalog to validate a returned id. */
  moduleRules: string[];
  outbound: D1OutboundEvent[];
  contracts: D1ContractSource[];
  contexts?: D1UsecaseContext[];
  sourceFindings?: D1SourceFinding[];
  sourceHashes?: D1SourceHash[];
  /** Raw dependency texts. The fidelity reader uses these, not the draft. */
  files?: D1SourceText[];
  plans: D1UsecasePlanInput[];
  llmCalls: number;
}

/** One value the facade method takes. A patch key the facade does not accept is not represented. */
export interface D1MdmArgument {
  name: string;
  role: 'selector' | 'parameter' | 'patch';
  /** Set when a shared call's patch is owned by one capability. */
  capability?: string;
  /** Ontology or contract path the value is read from. */
  path?: string;
  /** Constant the facade receives when the value is not a field (`role` tag, or `ctx`). */
  value?: string;
}

/** One facade invocation. Several capabilities may share it when one patch and one version cover them. */
export interface D1MdmPlannedCall {
  method: D1MdmCall;
  target: 'entity' | 'collection' | 'identity';
  shape: 'point' | 'collection' | 'write';
  capabilities: string[];
  /** True when the capability is a choice (inactivate or reactivate), not a sequence. */
  alternative: boolean;
  arguments: D1MdmArgument[];
  result: string[];
}

/** A declared capability the facade does not implement. Not a successful call. */
export interface D1MdmGap {
  capability: string;
  /** MDM_UNBOUND: no facade method. MDM_PATCH_UNBOUND: a field the facade cannot patch. */
  code: 'MDM_UNBOUND' | 'MDM_PATCH_UNBOUND';
  evidence: string;
}

export interface D1UsecaseMdm {
  namespace: string;
  /** Canonical tag `<namespace>.<entityId>`. */
  role: string;
  /**
   * True only when every selected capability is one facade invocation.
   * A sequence of calls is not atomic: the facade does not wrap them.
   */
  atomic: boolean;
  calls: D1MdmPlannedCall[];
  gaps: D1MdmGap[];
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
