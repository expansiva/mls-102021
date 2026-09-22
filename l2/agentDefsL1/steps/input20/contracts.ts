/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/contracts.ts" enhancement="_blank"/>

import type { D1ContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

export const D1_INPUT_VERSION = '2026-09-21-d1-input-v1' as const;

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
  backend: '2026-09-21-p1-backend-v1.1',
  effort: '2026-09-21-p2-effort-v1.1',
  planner: '2026-09-20-p1-pipeline-v1',
} as const;

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
  presentDefs: D1PresentDef[];
}

export interface D1PlannerRun {
  flowId: string;
  thread: string;
  round: number;
  schemaVersion: string;
}

export interface D1SelectedRoute {
  route: string;
  page: string;
  kind: string;
  usecaseRef: string;
  status: D1ActiveStatus;
}

export interface D1SelectedUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
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
    routes: D1SelectedRoute[];
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
    planner: `l1/${moduleName}/pipeline/pipeline.json`,
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
