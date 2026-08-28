/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbHealthReport.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure accumulation of l4/trace/cb-health-report.json. Side-effect-free (no mls.stor / libStor import)
// so it stays unit-testable in the l2 test stub — same reason cbCli/cbScope/cbWorkspace were extracted.
// cbRepair.saveHealthReport owns the I/O and delegates the merge here.

// The task dump nulls the interaction of deterministic steps and the repair state is cleared on success,
// so the health report is the durable record of the run. It used to be OVERWRITTEN on every call, so
// only the last snapshot survived — the per-round repair decisions (which defRefs each g{n} forced
// stale, with which findings) were lost. Now the file keeps the LAST state at the top AND appends every
// snapshot to a bounded `rounds` array.
export const MAX_HEALTH_ROUNDS = 20;

/**
 * Merge a new report snapshot into the existing cb-health-report.json content.
 * - top level = the LAST state (the flattened report), backward-compatible with readers of the old shape;
 * - `rounds` = the accumulated snapshots (oldest first), capped at MAX_HEALTH_ROUNDS.
 * A snapshot never carries its own `rounds` key, so the array does not grow quadratically.
 */
export function buildHealthReportContent(existingRaw: string | null, report: Record<string, unknown>, now: string): string {
  const { rounds: _ignoredRounds, ...reportWithoutRounds } = report;
  const snapshot: Record<string, unknown> = { savedAt: now, ...reportWithoutRounds };
  let priorRounds: unknown[] = [];
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
      if (Array.isArray(parsed.rounds)) priorRounds = parsed.rounds;
    } catch {
      priorRounds = [];
    }
  }
  const rounds = [...priorRounds, snapshot].slice(-MAX_HEALTH_ROUNDS);
  // `ok` lives in `rounds` so a later mute snapshot does not resurrect a prior-run `degraded`.
  // The flattened top-level omits it — full coverage closes without `operations`/`operationsMissing`.
  const top: Record<string, unknown> = { ...snapshot, rounds };
  if (top.operations === 'ok') {
    delete top.operations;
    delete top.operationsMissing;
  }
  return `${JSON.stringify(top, null, 2)}\n`;
}

/**
 * The last validate-all of a run is often a CLEAN pass (post-seeds, findings 0). It used to write
 * `repairHistory: []` and `globalAttempts: 0` over the top of the file because repair state was
 * cleared after the previous success. The rounds array still held the repair-round snapshots.
 * Fold the longest history and the max attempts so the top-level health a post-mortem reads first
 * matches the steps that actually ran.
 */
export function foldRepairAudit(
  existingRaw: string | null,
  current: { repairHistory?: unknown; globalAttempts?: unknown },
): { repairHistory: string[]; globalAttempts: number } {
  const asHistory = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const asAttempts = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

  let repairHistory = asHistory(current.repairHistory);
  let globalAttempts = asAttempts(current.globalAttempts);
  if (!existingRaw) return { repairHistory, globalAttempts };
  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const consider = (history: unknown, attempts: unknown): void => {
      const priorHistory = asHistory(history);
      if (priorHistory.length > repairHistory.length) repairHistory = priorHistory;
      globalAttempts = Math.max(globalAttempts, asAttempts(attempts));
    };
    consider(parsed.repairHistory, parsed.globalAttempts);
    if (Array.isArray(parsed.rounds)) {
      for (const round of parsed.rounds) {
        if (!round || typeof round !== 'object' || Array.isArray(round)) continue;
        const rec = round as Record<string, unknown>;
        consider(rec.repairHistory, rec.globalAttempts);
      }
    }
  } catch {
    /* corrupt prior content: keep current */
  }
  return { repairHistory, globalAttempts };
}

/**
 * Most-recent snapshot that mentions `field` (`ok` or `degraded`) wins. Mute snapshots (validate-all
 * for seeds, gen-seeds for operations) fall through. `ok` returns `{}` so a prior-run `degraded`
 * still sitting in `rounds` is not resurrected.
 */
function foldLatestVerdict(
  existingRaw: string | null,
  current: Record<string, unknown>,
  field: string,
  fromDegraded: (rec: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  const consider = (rec: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined => {
    if (!rec) return undefined;
    if (rec[field] === 'ok') return {};
    if (rec[field] === 'degraded') return fromDegraded(rec);
    return undefined;
  };
  const currentFold = consider(current);
  if (currentFold !== undefined) return currentFold;
  if (!existingRaw) return {};
  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const prior = consider(parsed);
    if (prior !== undefined) return prior;
    if (Array.isArray(parsed.rounds)) {
      for (let i = parsed.rounds.length - 1; i >= 0; i--) {
        const round = parsed.rounds[i];
        if (!round || typeof round !== 'object' || Array.isArray(round)) continue;
        const folded = consider(round as Record<string, unknown>);
        if (folded !== undefined) return folded;
      }
    }
  } catch {
    /* keep current */
  }
  return {};
}

/**
 * Seeds verdicts are written by gen-seeds (`degraded` on give-up, `ok` on full convergence) and must
 * survive a later validate-all snapshot that does not mention seeds. The fold takes the MOST RECENT
 * snapshot that mentions seeds: `ok` clears the top-level fields (a prior-run `degraded` still sitting
 * in `rounds` is a ghost); `degraded` is copied through so `passed` at the top does not erase the give-up.
 */
export function foldSeedsDegraded(
  existingRaw: string | null,
  current: { seeds?: unknown; seedError?: unknown; seedSkipped?: unknown },
): { seeds?: 'degraded'; seedError?: string; seedSkipped?: unknown } {
  const asSkipped = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const rec = value as Record<string, unknown>;
    return Array.isArray(rec.tables) || Array.isArray(rec.mdmEntities) ? value : undefined;
  };
  return foldLatestVerdict(existingRaw, current as Record<string, unknown>, 'seeds', rec => {
    const out: { seeds?: 'degraded'; seedError?: string; seedSkipped?: unknown } = {};
    if (rec.seeds === 'degraded') out.seeds = 'degraded';
    if (typeof rec.seedError === 'string' && rec.seedError) out.seedError = rec.seedError;
    const skipped = asSkipped(rec.seedSkipped);
    if (skipped) out.seedSkipped = skipped;
    return out;
  }) as { seeds?: 'degraded'; seedError?: string; seedSkipped?: unknown };
}

export function foldOperationsCoverage(
  existingRaw: string | null,
  current: { operations?: unknown; operationsMissing?: unknown },
): { operations?: 'degraded'; operationsMissing?: unknown } {
  const asMissing = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const rec = value as Record<string, unknown>;
    return Array.isArray(rec.noUsecase) || Array.isArray(rec.noEndpoint) ? value : undefined;
  };
  return foldLatestVerdict(existingRaw, current as Record<string, unknown>, 'operations', rec => {
    const out: { operations?: 'degraded'; operationsMissing?: unknown } = {};
    if (rec.operations === 'degraded') out.operations = 'degraded';
    const missing = asMissing(rec.operationsMissing);
    if (missing) out.operationsMissing = missing;
    return out;
  }) as { operations?: 'degraded'; operationsMissing?: unknown };
}

export interface OperationsMissingReport {
  noUsecase: string[];
  noEndpoint: string[];
  declared: number;
  covered: number;
}

export type OperationsCoverageVerdict =
  | { operations: 'ok' }
  | { operations: 'degraded'; operationsMissing: OperationsMissingReport };

export function expectedRoutesByOperation(
  workspaces: ReadonlyArray<{
    bffCalls: ReadonlyArray<{ route: string; uses: ReadonlyArray<{ operationId: string }> }>;
  }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const workspace of workspaces) {
    for (const call of workspace.bffCalls) {
      if (!call.route) continue;
      for (const use of call.uses) {
        const id = use.operationId;
        if (!id) continue;
        const list = out[id] || (out[id] = []);
        if (!list.includes(call.route)) list.push(call.route);
      }
    }
  }
  return out;
}

/** Prefix every missing-route finding carries, so severity/tests can recognise the family. */
export const MISSING_CONTRACT_ROUTE_PREFIX = 'contract route without controller ->';

/**
 * ROUTE-level coverage: every bffCall the l4 workspaces declare must have a registered controller route.
 *
 * compareOperationsCoverage answers a WEAKER question — "does this operation have SOME endpoint?" — and
 * that is exactly the hole the 102047/todo run fell through: `listTask` is used by taskCatalogue AND
 * taskHub, taskCatalogue's route survived, so listTask counted as covered while the entire taskHub
 * controller was missing. Only the per-route check sees a lost workspace.
 */
export function collectMissingContractRouteFindings(
  workspaces: ReadonlyArray<{ workspaceId: string; bffCalls: ReadonlyArray<{ route: string }> }>,
  routeKeys: Iterable<string>,
): string[] {
  const registered = new Set(routeKeys);
  const seen = new Set<string>();
  const findings: string[] = [];
  for (const workspace of workspaces) {
    for (const call of workspace.bffCalls) {
      if (!call.route || registered.has(call.route) || seen.has(call.route)) continue;
      seen.add(call.route);
      findings.push(`${MISSING_CONTRACT_ROUTE_PREFIX} ${call.route} (workspace ${workspace.workspaceId}: the l4 contract declares this routine and no controller registers it; the app answers ROUTINE_NOT_FOUND)`);
    }
  }
  return findings;
}

function routeCoversOperation(routeKey: string, operationId: string): boolean {
  const last = (routeKey.split('.').pop() || '').toLowerCase();
  const op = operationId.toLowerCase();
  return last === op || last === `cmd${op}` || last === `qry${op}`;
}

function operationHasEndpoint(
  operationId: string,
  routes: Set<string>,
  expected: readonly string[] | undefined,
): boolean {
  if (expected && expected.length > 0) return expected.some(route => routes.has(route));
  for (const key of routes) {
    if (routeCoversOperation(key, operationId)) return true;
  }
  return false;
}

/**
 * One-way check: l4-declared operations that did not become a usecase and/or a route.
 * Extra usecases nobody calls are ignored on purpose.
 */
export function compareOperationsCoverage(input: {
  declared: readonly string[];
  usecaseNames: Iterable<string>;
  routeKeys: Iterable<string>;
  expectedRoutesByOperation?: Readonly<Record<string, readonly string[]>>;
}): OperationsCoverageVerdict {
  const declared = [...new Set(input.declared.filter(Boolean))];
  const usecases = new Set([...input.usecaseNames].map(name => name.toLowerCase()));
  const routes = new Set(input.routeKeys);
  const expected = input.expectedRoutesByOperation || {};
  const noUsecase: string[] = [];
  const noEndpoint: string[] = [];
  let covered = 0;
  for (const op of declared) {
    const hasUsecase = usecases.has(op.toLowerCase());
    const hasEndpoint = operationHasEndpoint(op, routes, expected[op]);
    if (!hasUsecase) noUsecase.push(op);
    else if (!hasEndpoint) noEndpoint.push(op);
    else covered += 1;
  }
  noUsecase.sort((a, b) => a.localeCompare(b));
  noEndpoint.sort((a, b) => a.localeCompare(b));
  if (noUsecase.length === 0 && noEndpoint.length === 0) return { operations: 'ok' };
  return {
    operations: 'degraded',
    operationsMissing: { noUsecase, noEndpoint, declared: declared.length, covered },
  };
}

export function operationsCoverageLogLine(verdict: OperationsCoverageVerdict): string {
  if (verdict.operations === 'ok') return 'operations: ok';
  const missing = verdict.operationsMissing;
  // English: this line lands in the step status the user reads in the studio, next to
  // `INTEGRITY FAILED` / `l1 defs=` — every neighbour is English and the product ships global.
  const parts = [`${missing.declared} declared`, `${missing.covered} covered`];
  if (missing.noUsecase.length) parts.push(`${missing.noUsecase.length} without usecase`);
  if (missing.noEndpoint.length) parts.push(`${missing.noEndpoint.length} without endpoint`);
  return `operations: ${parts.join(', ')}`;
}

/** Keep the highest models.peak seen in any snapshot — be5 closed with registry 104 but the leak is the peak. */
export function foldModelsPeak(
  existingRaw: string | null,
  current: { models?: unknown },
): { registry: number; pendingRelease: number; peak: number } | undefined {
  const asModels = (value: unknown): { registry: number; pendingRelease: number; peak: number } | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const rec = value as Record<string, unknown>;
    const num = (key: string): number => (typeof rec[key] === 'number' && Number.isFinite(rec[key]) ? rec[key] as number : 0);
    if (!('registry' in rec) && !('peak' in rec)) return undefined;
    return { registry: num('registry'), pendingRelease: num('pendingRelease'), peak: num('peak') };
  };
  let models = asModels(current.models);
  if (!existingRaw) return models;
  try {
    const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
    const consider = (value: unknown): void => {
      const prior = asModels(value);
      if (!prior) return;
      if (!models) models = { ...prior };
      else models = {
        registry: models.registry,
        pendingRelease: models.pendingRelease,
        peak: Math.max(models.peak, prior.peak, prior.registry),
      };
    };
    consider(parsed.models);
    if (Array.isArray(parsed.rounds)) {
      for (const round of parsed.rounds) {
        if (!round || typeof round !== 'object' || Array.isArray(round)) continue;
        consider((round as Record<string, unknown>).models);
      }
    }
  } catch {
    /* keep current */
  }
  return models;
}
