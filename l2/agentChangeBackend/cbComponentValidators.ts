/// <mls fileReference="_102021_/l2/agentChangeBackend/cbComponentValidators.ts" enhancement="_102027_/l2/enhancementAgent"/>

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
