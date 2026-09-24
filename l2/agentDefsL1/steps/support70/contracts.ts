/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/contracts.ts" enhancement="_blank"/>

import type { D1_MEASURED_PUBLISH, D1Definition } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import type { D1PipelineItem } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import type {
  D1ControllerGrant,
  D1ControllerRelationship,
  D1ScopeGrantPlan,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

export const D1_SUPPORT_VERSION = '2026-09-22-d1-support-v1' as const;

/** Same trail as the earlier steps. Uncited values stay on the domain draft. */
export const ENUMERATION_SOURCE = 'domain30.enumerations' as const;

export const ENUMERATION_REASON = 'Scope and registry have no values slot. Enum values stay on the domain draft.' as const;

export const ENUMERATION_CONSUMED_REASON = 'Seed scenarios cite every value of this enum. The values are not copied into rows.' as const;

/** A covered consumer names this field. The union is not runtime enforcement. */
export const ENUMERATION_PROVED_REASON = 'A covered consumer names this entity and path. A type union is not runtime enforcement. Values stay on the domain draft.' as const;

export type D1EnumOwner = 'platform' | 'module' | 'unresolved';

export type D1EnumWriter = 'platform' | 'module' | 'derived' | 'unresolved';

export type D1EnumRestriction = 'inherited' | 'subset' | 'own' | 'invalid' | 'unresolved';

export type D1EnumPurpose = 'seedScenario' | 'routeContract' | 'usecaseDef' | 'domainDef';

/** One proved use. A homonymous literal on another entity or path is not this use. */
export interface D1EnumUse {
  purpose: D1EnumPurpose;
  consumer: string;
  entityId: string;
  path: string;
  values: string[];
  /** False when the field is derived, a role binding, or the literal is only on an output. */
  editable: boolean;
}

/** Catalog owner, writer and restriction. They are not one badge. */
export interface D1EnumOrigin {
  owner: D1EnumOwner;
  writer: D1EnumWriter;
  derived: boolean;
  restriction: D1EnumRestriction;
  catalogValues: string[];
  catalogSource: string;
  roleBinding: boolean;
}

/** A seed scenario that names one entity and one field. Not a global set of literals. */
export interface D1SeedCitation {
  entityId: string;
  path: string;
  scenarioId: string;
  values: string[];
}

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
  /** True when `uses` is non-empty. Not runtime enforcement. */
  consumed: boolean;
  source: typeof ENUMERATION_SOURCE;
  reason: typeof ENUMERATION_REASON | typeof ENUMERATION_CONSUMED_REASON | typeof ENUMERATION_PROVED_REASON;
  origin: D1EnumOrigin;
  uses: D1EnumUse[];
  limits: string;
}

export type D1EnumRow = D1SupportEnumeration;

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

/** Local table the seed plan may describe. An MDM table is refused. */
export interface D1SeedTable {
  tableId: string;
  entityId: string;
  action: string;
  defPath: string;
  uniqueKeys: string[][];
}

export interface D1SeedTransition {
  transitionId: string;
  to: string;
  ruleRefs: string[];
}

/** Model facts the seed plan may cite. It does not invent rows from them. */
export interface D1SeedModel {
  entityId: string;
  storageTarget: string;
  kind: 'role' | 'entity';
  namespace: string;
  fields: Array<{ name: string; type: string }>;
  states: string[];
  initialState: string;
  uniqueKeys: string[][];
  transitions: D1SeedTransition[];
  /** Empty when the model does not declare the note field. */
  noteField: string;
}

export interface D1SeedEffect {
  entityId: string;
  effect: string;
  transitionRef: string;
}

export interface D1SeedJourney {
  journeyId: string;
  entities: string[];
  effects: D1SeedEffect[];
}

/** A role or actor tag. It is not the MDM entity id. */
export interface D1SeedRoleTag {
  tag: string;
  entityId: string;
}

export interface D1SeedRef {
  field: string;
  relationshipId: string;
  entityId: string;
}

export interface D1SeedDataset {
  datasetId: string;
  tableId: string;
  owners: string[];
}

export interface D1SeedDependency {
  entityId: string;
  kind: 'mdm' | 'module';
  seeded: false;
}

export interface D1SeedMaintenance {
  action: 'reseed' | 'reset' | 'removeOwner';
  ownerId: string;
}

/** Plan versus rows. This step never sets materialized or a row count above zero. */
export interface D1SeedReport {
  phase: 'plan' | 'absent';
  materialized: false;
  rowCount: 0;
  datasets: D1SeedDataset[];
  dependencies: D1SeedDependency[];
}

/** One outbound event from the integration artifact. `mechanism` is empty when the artifact names none. */
export interface D1EffectEvent {
  eventId: string;
  on: string;
  mechanism: string;
  /** True only when the transition object declares `payload`. */
  payloadDeclared: boolean;
}

/** A process, inbound item or plugin. Operations are not routes. */
export interface D1EffectOperation {
  id: string;
  kind: 'process' | 'inbound' | 'plugin';
  operations: string[];
  mechanism: string;
  consumer: string;
  /** A scheduled trigger is preserved as a review. This step does not write a scheduler. */
  scheduled: boolean;
}

/** The measured publish API as evidence. Naming it does not bind or execute an effect. */
export interface D1EffectReport {
  phase: 'plan' | 'absent';
  executed: false;
  capability: {
    symbol: typeof D1_MEASURED_PUBLISH.symbol;
    path: typeof D1_MEASURED_PUBLISH.path;
    owner: typeof D1_MEASURED_PUBLISH.owner;
    payload: typeof D1_MEASURED_PUBLISH.payload;
    delivery: typeof D1_MEASURED_PUBLISH.delivery;
    transaction: typeof D1_MEASURED_PUBLISH.transaction;
    requestContextPublish: false;
    bound: boolean;
  };
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
  /** Local tables persistence40 planned. A role table is not a seed target. */
  tables: D1SeedTable[];
  models: D1SeedModel[];
  journeys: D1SeedJourney[];
  /** Journey ids the index names and this step could not read. */
  missingJourneys: string[];
  roleTags: D1SeedRoleTag[];
  /** Extra refs a caller proposed. A ref without a column relationship is refused. */
  seedRefs: D1SeedRef[];
  /**
   * Ontology, catalog and serialized defs already opened for this run.
   * Absent on a fixture that only classifies seed citations.
   */
  enumSnapshot?: {
    sources: Record<string, string>;
    definitions: string[];
    contracts: Array<{ path: string; text: string }>;
    tables: Array<{ tableId: string; entityId: string }>;
  };
  /** Datasets already shared. Dropping one owner does not drop the dataset. */
  existingDatasets: D1SeedDataset[];
  maintenance: D1SeedMaintenance | null;
  /** Outbound rows of the integration artifact. */
  outbound: D1EffectEvent[];
  /** Event ids input20 selected. A selected id missing here is an omission. */
  selectedEventIds: string[];
  /** Usecase ids the plan selected. An event consumer must be one of these. */
  usecaseIds: string[];
  /** Processes, inbound and plugins. A workflow does not become an endpoint. */
  operations: D1EffectOperation[];
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
  /** Separates the seed plan from rows. Rows are not written here. */
  seedPlan: D1SeedReport;
  /** Effect plan. `executed` stays false. An empty mechanism stays unbound. */
  effectPlan: D1EffectReport;
  problems: D1SupportProblem[];
  normalizations: D1SupportNormalization[];
  emit: D1SupportEmit[];
}
