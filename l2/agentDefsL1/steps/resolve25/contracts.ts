/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/contracts.ts" enhancement="_blank"/>

import type { D1RequestGapKind } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

export const D1_RESOLVE_VERSION = '2026-10-04-d1-resolve-v1' as const;

/** One derivation gap as the worker sees it. `gapId` is the tool property; `path` is the answer key. */
export interface D1ResolveGap {
  gapId: string;
  path: string;
  kind: D1RequestGapKind;
  reason: string;
  /** Closed candidates from the derivation, `none` last. */
  candidates: string[];
}

/** One route with gaps: one worker. */
export interface D1ResolveUnit {
  unitId: string;
  route: string;
  pageId: string;
  gaps: D1ResolveGap[];
}

export interface D1ResolveWork {
  schemaVersion: typeof D1_RESOLVE_VERSION;
  project: number;
  moduleName: string;
  /** `d1SourceKey` of the sources input20 derived from (d1_62). */
  sourceKey: string;
  units: D1ResolveUnit[];
  repairs: number;
}

/** The last attempt of one unit. `answers` holds only the choices that are among the candidates. */
export interface D1ResolveAttempt {
  unitId: string;
  status: 'parsed' | 'repairable' | 'operational';
  trace: string;
  unitAttempts: number;
  planId: string;
  /** Model calls made for this unit so far (worker plus repair). */
  calls: number;
  answers: Record<string, string>;
}

export interface D1ResolveAnswer {
  path: string;
  kind: D1RequestGapKind;
  choice: string;
  /** Plan id of the call that gave the choice. Empty when the gap stayed `none` without an accepted answer. */
  call: string;
}

/** `pipeline/agentDefsL1/resolve25.json`. */
export interface D1ResolveReceipt {
  schemaVersion: typeof D1_RESOLVE_VERSION;
  project: number;
  moduleName: string;
  /** `d1SourceKey` of the sources input20 derived from (d1_62). */
  sourceKey: string;
  llmCalls: number;
  routes: Array<{ route: string; pageId: string; answers: D1ResolveAnswer[] }>;
}
