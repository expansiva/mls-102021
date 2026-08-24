/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFindingSeverity.ts" enhancement="_blank"/>

// Validate-all severity: BLOCKING fails the run; DEGRADABLE is a warning and the run continues
// to finalize (health `passed-degraded`). Default is blocking — degradable is an explicit, short list.
// Gates themselves are not relaxed: the finding is still recorded. What changes is what happens AFTER.

export type FindingSeverity = 'blocking' | 'degradable';

export function partitionFindings(findings: string[]): { blocking: string[]; degradable: string[] } {
  const blocking: string[] = [];
  const degradable: string[] = [];
  for (const finding of findings) {
    if (findingSeverity(finding) === 'degradable') degradable.push(finding);
    else blocking.push(finding);
  }
  return { blocking, degradable };
}

export function findingSeverity(finding: string): FindingSeverity {
  if (isDegradableFinding(finding)) return 'degradable';
  return 'blocking';
}

/** Opt-in list. Anything not matched stays blocking (compile, missing export, empty PK, composition root). */
function isDegradableFinding(finding: string): boolean {
  return isSeedFinding(finding) || isOmittablePolicyFinding(finding);
}

/** Seeds are test data: empty tables are a valid, visible app. Includes compiler errors ON seeds.ts. */
export function isSeedFinding(finding: string): boolean {
  if (/\bseeds\.ts\b/i.test(finding)) return true;
  if (/\blocal seed rows\b/i.test(finding)) return true;
  if (/SEEDS-ENVIRONMENT-FAILURE/i.test(finding)) return true;
  if (/^SEED\s/i.test(finding)) return true;
  if (/seed wave \d+\s+skipped/i.test(finding)) return true;
  if (/seeded EMPTY by design/i.test(finding)) return true;
  if (/\bseedCoverage\b/i.test(finding)) return true;
  return false;
}

/**
 * Persistence-policy findings about artifacts that can be omitted from publication (adapter/port/domain
 * /seed rows). A leaked TABLE is structural (migrate would create it) and stays blocking.
 */
export function isOmittablePolicyFinding(finding: string): boolean {
  if (!finding.startsWith('persistence policy:')) return false;
  if (/\blocal seed rows\b/i.test(finding)) return true;
  if (/\blocal domain entity\b/i.test(finding)) return true;
  if (/\blocal port\b/i.test(finding)) return true;
  if (/repositoryadapter\.defs\.ts/i.test(finding)) return true;
  return false;
}
