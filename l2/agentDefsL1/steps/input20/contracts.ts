/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/contracts.ts" enhancement="_blank"/>

import type { D1ContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import { L1_OPERATIONS } from '/_102021_/l2/helpers/l1Defs/operations.js';

export const D1_INPUT_VERSION = '2026-10-01-d1-input-v2' as const;

/** P1 operation vocabulary. Same list as `L1_OPERATIONS`. */
export const D1_P1_OPERATIONS = L1_OPERATIONS;

export const D1_SOURCE_SCHEMAS = {
  module: '2026-09-10-ns5-module-v2',
  journey: '2026-09-10-ns5-journey-v1',
  ontology: '2026-09-17-ns5-ontology-v3.1',
  rules: '2026-09-16-ns5-rules-v2',
  workflows: '2026-09-17-ns5-workflows-v3',
  access: '2026-09-12-ns5-access-v3',
  integration: '2026-09-12-ns5-integration-v2',
  menu: '2026-09-20-p2-menu-v2.2',
  needs: '2026-09-21-p2-needs-v1',
  backend: '2026-09-21-p1-backend-v1.2',
  effort: '2026-09-21-p2-effort-v1.2',
  planner: '2026-09-20-p1-pipeline-v1',
} as const;

/** `backend.json.testSupport[]` (p1_12). Same enums as agentPlannerL1 plan20; D1 checks, never fills. */
export const D1_TEST_SUPPORT_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;
export const D1_TEST_SUPPORT_OWNERS = ['L1', 'runtime'] as const;

export const D1_PLANNER_FLOW = 'agentPlannerL1' as const;
export const D1_EFFORT_BACKEND_REF = 'pool/l2/web/backend.json' as const;

export const D1_ACTIVE_STATUSES = ['toCreate', 'toUpdate', 'done'] as const;
export type D1ActiveStatus = typeof D1_ACTIVE_STATUSES[number];
export type D1PlanStatus = D1ActiveStatus | 'toRemove';
export type D1FileAction = 'create' | 'update' | 'preserve' | 'recompose' | 'remove' | 'conflict';
export type D1ProblemSeverity = 'error' | 'review';

export interface D1InputProblem {
  severity: D1ProblemSeverity;
  code: string;
  path: string;
  message: string;
  ownerRef?: string;
}

export interface D1SourceDigest {
  path: string;
  sha256: string;
  bytes: number;
  schemaVersion: string;
  state: 'present' | 'missing' | 'invalid';
}

export interface D1PresentDef {
  path: string;
  sha256: string;
}

export interface D1InputArtifacts {
  sources: D1SourceDigest[];
  module: unknown;
  journeyIndex: unknown;
  journeys: Record<string, unknown>;
  ontologyIndex: unknown;
  entities: Record<string, unknown>;
  rules: unknown;
  workflows: unknown;
  access: unknown;
  integration: unknown;
  menu: unknown;
  needs: unknown;
  backend: unknown;
  effort: unknown;
  planner: unknown;
  /** Page id → contract AST. Null means the file was looked up and is absent. */
  contracts: Record<string, D1ContractAst | null>;
  /** Page id → contract source. Present when the file was read. */
  contractTexts?: Record<string, string>;
  presentDefs: D1PresentDef[];
  /**
   * Done write rows from the progress file of the step that wrote the def.
   * Not copied into the snapshot. Absent means this caller did not load them.
   */
  writerReceipts?: ReadonlyArray<{ defPath: string; desiredHash: string }>;
}

export interface D1PlannerRun {
  flowId: string;
  thread: string;
  round: number;
  schemaVersion: string;
}

export interface D1RequestOutput {
  key: string;
  entity: string;
  many: boolean;
  page?: string;
  pageSize?: string;
  hasMore?: string;
}

/** `field` filters `target`. `pages` names the list organism instead of a field. */
export interface D1RequestParam {
  name: string;
  target: string;
  field?: string;
  pages?: string;
}

export interface D1SelectedRequest {
  route: string;
  pageId: string;
  kind: 'qry' | 'cmd';
  writes: string;
  outputs: D1RequestOutput[];
  params: D1RequestParam[];
  uses: string[];
}

export interface D1SelectedUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
  /** L4 `transitionId`. Present only when `operation` is `transition`. */
  transitionRef?: string;
  status: D1ActiveStatus;
  existing: string;
  identity: string;
  routes: string[];
}

export interface D1SelectedPort {
  portId: string;
  entity: string;
  status: D1ActiveStatus;
}

export interface D1SelectedTable {
  tableId: string;
  entity: string;
  status: D1ActiveStatus;
}

export interface D1PlannedFile {
  id: string;
  artifactType: string;
  defPath: string;
  action: D1FileAction;
  identity: string;
  ownerRefs: string[];
  dependsOn: string[];
  /** Present only when this receipt inventoried the bytes at defPath. */
  contentHash?: string;
}

export interface D1RemovedItem {
  kind: string;
  id: string;
  defPath: string | null;
  inventoried: boolean;
  contentHash?: string;
}

export interface D1InputSnapshot {
  schemaVersion: typeof D1_INPUT_VERSION;
  project: number;
  moduleName: string;
  device: 'web';
  plannerRun: D1PlannerRun | null;
  sources: D1SourceDigest[];
  selection: {
    pages: Array<{ pageId: string; routes: string[] }>;
    requests: D1SelectedRequest[];
    usecases: D1SelectedUsecase[];
    ports: D1SelectedPort[];
    tables: D1SelectedTable[];
    entities: string[];
    outbound: string[];
  };
  files: D1PlannedFile[];
  removed: D1RemovedItem[];
  problems: D1InputProblem[];
  consumersReleased: boolean;
  snapshotHash: string;
}

export function inputPaths(moduleName: string): {
  module: string;
  journeyIndex: string;
  ontologyIndex: string;
  rules: string;
  workflows: string;
  access: string;
  integration: string;
  menu: string;
  needs: string;
  backend: string;
  effort: string;
  planner: string;
} {
  const root = `l4/${moduleName}`;
  return {
    module: `${root}/module.defs.ts`,
    journeyIndex: `${root}/journeys/index.defs.ts`,
    ontologyIndex: `${root}/ontology/index.defs.ts`,
    rules: `${root}/rules.defs.ts`,
    workflows: `${root}/workflows.defs.ts`,
    access: `${root}/access.defs.ts`,
    integration: `${root}/integration.defs.ts`,
    menu: `${root}/pool/l2/web/menu.json`,
    needs: `${root}/pool/l1/web/needs.json`,
    backend: `${root}/pool/l2/web/backend.json`,
    effort: `${root}/pool/l2/web/effort.json`,
    planner: `${root}/pool/l1/pipeline.json`,
  };
}

export function journeyPath(moduleName: string, journeyId: string): string {
  return `l4/${moduleName}/journeys/${journeyId}.defs.ts`;
}

export function entityPath(moduleName: string, entityId: string): string {
  return `l4/${moduleName}/ontology/${entityId}.defs.ts`;
}

export function contractPath(moduleName: string, pageId: string): string {
  return `l2/${moduleName}/web/contracts/${pageId}.defs.ts`;
}

export function isSafeToken(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(value);
}

export function lowerFirst(value: string): string {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}
