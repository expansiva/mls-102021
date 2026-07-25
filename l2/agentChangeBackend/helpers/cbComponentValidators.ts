/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { isClientBoundarySource } from '/_102029_/l2/clientBoundarySources.js';

// Shared component-inspection helpers for the generated l1 .ts / .defs.ts artifacts. These pure
// functions were duplicated (near-identically) in agentCbMaterialize.ts and agentCbValidateAll.ts;
// a fix on one side kept drifting from the other. Extracted here on 2026-07-11 as the SINGLE source
// (todo/modernizeChangeBackend.md step 3). Behavior is preserved exactly — they parse generated code
// and defs to check BFF boundary/route coherence and rule coverage. No step-specific knowledge.

// Self-contained (like cbMdmGuards/cbSeedsCore): inlines the three trivial primitives instead of
// importing cbShared, so this module + its unit test stay free of the heavy runtime graph. The
// implementations mirror cbShared.isRecord/readString/readStringArray exactly.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

/** Module-local l1 imports of a generated .ts: `from '/_<project>_/l1/<folder>/<name>.js'`. Returns
 * the tsSet key (`${folder}::${shortName}`) so the caller can check the target was actually generated.
 * Cross-project imports (e.g. /_102034_/ platform) and non-l1 imports are ignored on purpose. */
export function collectL1Imports(content: string, project: number): { key: string; target: string }[] {
  const out: { key: string; target: string }[] = [];
  const re = /from\s+['"]\/_(\d+)_\/l1\/([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (Number(match[1]) !== project) continue;
    const path = match[2].replace(/\.(?:d\.ts|ts|js)$/u, '');
    const lastSlash = path.lastIndexOf('/');
    const folder = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
    const shortName = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
    out.push({ key: `${folder}::${shortName.toLowerCase()}`, target: `_${project}_/l1/${path}` });
  }
  return out;
}

/** Generated l1 code must import ONLY via the '/_<project>_/...' alias. A relative import sometimes
 * even resolves under tsc, but it breaks the studio path convention — and it is the typical way the
 * model tries to silence a not-yet-materialized alias import (TS2792 hint, run task2/102049: six
 * controllers rewritten to '../../../../...' during repair). Rejected deterministically here. */
export function collectRelativeImportIssues(code: string): string[] {
  const issues: string[] = [];
  const re = /\b(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    issues.push(`relative import forbidden -> '${match[1]}'; import via the '/_<project>_/l1/...' alias exactly as in the context files (keep the alias even if the target module is not materialized yet)`);
  }
  return issues;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function fieldNameFromRef(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parts = raw.split('.');
  return parts[parts.length - 1] || raw;
}

export function requiredBoundaryFields(inputContract: unknown): Set<string> {
  const fields = new Set<string>();
  if (!Array.isArray(inputContract)) return fields;
  for (const input of inputContract) {
    if (!isRecord(input) || input.required !== true) continue;
    const source = String(input.source ?? '');
    if (!isClientBoundarySource(source)) continue;
    const inputId = fieldNameFromRef(input.inputId);
    const fieldRef = fieldNameFromRef(input.fieldRef);
    if (inputId) fields.add(inputId);
    if (fieldRef) fields.add(fieldRef);
  }
  return fields;
}

export function collectRequiredChecksByHandler(content: string): Map<string, Set<string>> {
  const checks = new Map<string, Set<string>>();
  const handlerRe = /export\s+const\s+([A-Za-z0-9_$]+)\s*:\s*BffHandler\s*=\s*async[\s\S]*?=>\s*\{([\s\S]*?)\n\};/g;
  let handlerMatch: RegExpExecArray | null;
  while ((handlerMatch = handlerRe.exec(content)) !== null) {
    const fields = new Set<string>();
    const body = handlerMatch[2];
    const errorRe = /new\s+AppError\(([\s\S]*?)\);/g;
    let errorMatch: RegExpExecArray | null;
    while ((errorMatch = errorRe.exec(body)) !== null) {
      const call = errorMatch[1];
      if (!/\b(required|obrigat[oó]ri[oa]|required field|campo obrigat[oó]ri[oa])\b/i.test(call)) continue;
      // Accept dotted paths ('movement.movementType') and compare by the LAST segment — a dotted
      // field must not evade the boundary check (lesson task2/102049: adjustStockLevel).
      const fieldMatch = call.match(/field\s*:\s*['"]([A-Za-z0-9_$.]+)['"]/);
      if (fieldMatch) fields.add(fieldMatch[1].split('.').pop() as string);
    }
    checks.set(handlerMatch[1], fields);
  }
  return checks;
}

export function collectExportedHandlers(content: string): Set<string> {
  const handlers = new Set<string>();
  const re = /export\s+const\s+([A-Za-z0-9_$]+)\s*:\s*BffHandler\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) handlers.add(match[1]);
  return handlers;
}

export function collectRouteHandlers(content: string): Map<string, string> {
  const routes = new Map<string, string>();
  const re = /\{\s*key\s*:\s*['"]([^'"]+)['"]\s*,\s*handler\s*:\s*([A-Za-z0-9_$]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) routes.set(match[1], match[2]);
  return routes;
}

export function normalizeRuleId(rule: string): string {
  return rule.split(':')[0].trim();
}

export function collectUsecaseRules(data: unknown): string[] {
  if (!isRecord(data)) return [];
  const rules = new Set(readStringArray(data.rulesApplied).map(normalizeRuleId).filter(Boolean));
  const functions = Array.isArray((data as { functions?: unknown }).functions) ? (data as { functions: unknown[] }).functions : [];
  for (const fn of functions) {
    if (!isRecord(fn)) continue;
    for (const rule of readStringArray(fn.rulesApplied).map(normalizeRuleId).filter(Boolean)) rules.add(rule);
  }
  return [...rules].filter(Boolean);
}

// ── repository method misuse (usecase materialization gate) ─────────────────────
// A usecase resolves repositories with `resolveRepository<IXRepository>(...)` and then calls methods
// on them. When the generated code calls a method the port does NOT declare, materialization produces
// broken TypeScript (TS2339). Append-only ledgers expose `append`, not `save` — and the LLM keeps
// guessing `save`/`create` (run14: createStockAdjustment burned its whole repair budget on exactly
// this because the finding never told it the port's real methods). These pure checks run on the FIRST
// materialize pass so the finding is precise (the allowed methods) and the repair converges.

/** Method names declared on a repository port interface, read from the generated port `.ts`/`.d.ts`.
 * Walks the interface body brace-matched; matches member signatures `name(...)` / `name<...>(...)`. */
export function extractInterfaceMethods(portSource: string, interfaceName: string): Set<string> {
  const methods = new Set<string>();
  const header = new RegExp(`\\binterface\\s+${escapeRegExp(interfaceName)}\\b`);
  const at = portSource.search(header);
  if (at < 0) return methods;
  const open = portSource.indexOf('{', at);
  if (open < 0) return methods;
  let depth = 0, end = -1;
  for (let i = open; i < portSource.length; i++) {
    const ch = portSource[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return methods;
  const body = portSource.slice(open + 1, end);
  const re = /(?:^|\n)\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>]*>)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) methods.add(m[1]);
  return methods;
}

/** Repository method calls in a usecase that are NOT declared on the bound port interface. Binds each
 * `const v = resolveRepository<IXRepository>(...)` variable to its interface, then checks every
 * `v.method(` call. Interfaces absent from `methodsByInterface` (port source unresolved) are skipped,
 * so this never false-positives. The finding lists the port's real methods for a deterministic repair. */
export function collectRepositoryMethodMisuse(code: string, methodsByInterface: Map<string, Set<string>>): string[] {
  const binding = new Map<string, string>();
  const bindRe = /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:await\s+)?resolveRepository\s*<\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*>/g;
  let b: RegExpExecArray | null;
  while ((b = bindRe.exec(code)) !== null) binding.set(b[1], b[2]);
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const [varName, iface] of binding) {
    const methods = methodsByInterface.get(iface);
    if (!methods || methods.size === 0) continue; // unresolved interface -> do not guess
    const callRe = new RegExp(`\\b${escapeRegExp(varName)}\\.([A-Za-z_$][A-Za-z0-9_$]*)\\s*\\(`, 'g');
    let c: RegExpExecArray | null;
    while ((c = callRe.exec(code)) !== null) {
      const method = c[1];
      if (methods.has(method)) continue;
      const dedupe = `${iface}.${method}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      issues.push(`repository method misuse -> ${varName}.${method}() is not declared on ${iface}; use one of: ${[...methods].sort().join(', ')}`);
    }
  }
  return issues;
}

/**
 * The MDM facade's `entity.related(key)` takes a TYPED CompactRelationshipRefKey. Models invent a key
 * and force it past the type with a string-literal cast — `entity.related(key as 'o')`,
 * `x.relatedIds(rel as "OffersProduct")` (todo/changeBackend erro4). The isolated in-loop compile missed
 * it (the platform type was not loaded), so it only surfaced in the project `tsc`. A cast to a string
 * literal inside a related()/relatedIds() call is never legitimate — a real key is a typed constant,
 * never something you cast a literal into. Flag it as a repair finding: the linked id must be read from a
 * DECLARED entity field (e.g. `menuCategoryId`), not a guessed relationship key.
 */
export function collectInventedRelationshipKeyIssues(code: string): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(/\.related(?:Ids)?\s*\([^)]*\bas\s+(['"])([^'"]+)\1/gu)) {
    const key = match[2];
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(`invented relationship key -> entity.related(... as '${key}'); a CompactRelationshipRefKey is never a literal cast — read the linked id from a declared entity field instead of guessing a key`);
  }
  return issues;
}

// ── T2: whole-project compile — flaky double-check + cascade dedup (pure decisions) ──────────────

/** Double-check (vs H1): keep only the compiler errors that reproduced in BOTH passes. A finding present
 * in the first compile but not the recompile was a transient (Monaco model lag / imports not yet
 * settled) and must not force a full LLM re-generation of a file that was already correct. */
export function stableCompilerErrors(first: string[], second: string[]): string[] {
  const seen = new Set(second);
  return first.filter(e => seen.has(e));
}

/** Cascade dedup (vs H2): among the files flagged by the whole-project compile, a file that IMPORTS
 * another flagged file is reporting DERIVED errors from that broken import — repair only the ROOT this
 * round and DEFER the importer. Pure over (flagged keys, importsOf); the caller resolves imports (I/O).
 * `importsOf(key)` returns the l1 import keys of that file (same `${folder}::${shortName}` space). */
export function selectCompilerRepairRoots(
  flaggedKeys: Iterable<string>,
  importsOf: (key: string) => string[],
): { roots: string[]; cascades: string[] } {
  const flagged = new Set(flaggedKeys);
  const roots: string[] = [];
  const cascades: string[] = [];
  for (const key of flagged) {
    const importsAnotherFlagged = importsOf(key).some(k => k !== key && flagged.has(k));
    (importsAnotherFlagged ? cascades : roots).push(key);
  }
  return { roots, cascades };
}

// ── l4 v2: workspace-controller coherence (B7) ──────────────────────────────────
// The v2 controller is emitted DETERMINISTICALLY (no .defs.ts). "Rotas esperadas = bffCalls do
// workspace": every bffCall must have an exported handler `<ws><Bff>Handler`, registered in `routes`
// by its `<bffId>Route` const. Pure so validate-all's check is unit-tested (bffCall sem handler / rota
// órfã fixtures) without importing the heavy runtime graph.
function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
export interface V2WorkspaceForCheck { workspaceId: string; bffCalls: Array<{ bffId: string }>; }
export function collectV2ControllerCoherenceIssues(
  workspaces: V2WorkspaceForCheck[],
  controllerSources: Map<string, string>, // workspaceId (lowercased) -> generated controller .ts
): string[] {
  const issues: string[] = [];
  for (const ws of workspaces) {
    if (!ws.bffCalls.length) continue;
    const src = controllerSources.get(ws.workspaceId.toLowerCase());
    if (!src) { issues.push(`v2 controller ${ws.workspaceId} -> .ts not generated for the workspace`); continue; }
    const exported = collectExportedHandlers(src);
    for (const bff of ws.bffCalls) {
      const handlerName = `${ws.workspaceId}${capitalizeFirst(bff.bffId)}Handler`;
      if (!exported.has(handlerName)) issues.push(`v2 controller ${ws.workspaceId} -> bffCall ${bff.bffId} has no handler ${handlerName}`);
      else if (!new RegExp(`handler:\\s*${escapeRegExp(handlerName)}\\b`).test(src)) issues.push(`v2 controller ${ws.workspaceId} -> bffCall ${bff.bffId} handler not registered in routes`);
      if (!new RegExp(`\\b${escapeRegExp(bff.bffId)}Route\\b`).test(src)) issues.push(`v2 controller ${ws.workspaceId} -> bffCall ${bff.bffId} route const ${bff.bffId}Route missing (rota órfã)`);
    }
  }
  return issues;
}
