/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { isClientBoundarySource } from '/_102029_/l2/clientBoundarySources.js';

// Shared component-inspection helpers for the generated l1 .ts / .defs.ts artifacts. These pure
// functions were duplicated (near-identically) in agentCbMaterialize.ts and agentCbValidateAll.ts;
// a fix on one side kept drifting from the other. Extracted here on 2026-07-11 as the SINGLE source
// step 3). Behavior is preserved exactly — they parse generated code
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
const STRUCTURED_IO_TYPES = new Set(['json', 'object', 'array']);
const SCALAR_IO_TYPES = new Set(['string', 'number', 'boolean', 'uuid', 'text', 'date', 'datetime']);

function ioTypeFamily(type: string): 'structured' | 'scalar' | 'other' {
  const normalized = type.trim().toLowerCase();
  if (STRUCTURED_IO_TYPES.has(normalized)) return 'structured';
  if (SCALAR_IO_TYPES.has(normalized)) return 'scalar';
  return 'other';
}

/**
 * Same field (name + ofEntity) on input and output must have the same form. be5: weeklySchedule
 * input `json` × output `string` — list shows a blob, create/update reject the string the list emits.
 * Gate the DEFS, not the generated .ts (aliases like WeeklySchedule vs string are unresolvable).
 */
export function collectIoShapeSymmetryIssues(fn: {
  functionName?: string;
  input?: unknown;
  output?: unknown;
}): string[] {
  const issues: string[] = [];
  const fnName = typeof fn.functionName === 'string' && fn.functionName ? fn.functionName : '<function>';
  const inputs = Array.isArray(fn.input) ? fn.input.filter(isRecord) : [];
  const outputs = Array.isArray(fn.output) ? fn.output.filter(isRecord) : [];
  for (const input of inputs) {
    const name = readString(input.name);
    const ofEntity = readString(input.ofEntity);
    const inType = readString(input.type) || 'unknown';
    if (!name || !ofEntity) continue;
    const output = outputs.find(item => readString(item.name) === name && readString(item.ofEntity) === ofEntity);
    if (output) {
      const outType = readString(output.type) || 'unknown';
      const inFam = ioTypeFamily(inType);
      const outFam = ioTypeFamily(outType);
      if (inFam !== 'other' && outFam !== 'other' && inFam !== outFam) {
        issues.push(`io shape mismatch -> ${fnName} ${ofEntity}.${name}: input type '${inType}' vs output type '${outType}' — a structured field must have the same form on read and write`);
      }
    }
    if (STRUCTURED_IO_TYPES.has(inType.toLowerCase())) {
      const item = isRecord(input.item) ? input.item : undefined;
      const fields = item && Array.isArray(item.fields) ? item.fields : [];
      if (fields.length === 0) {
        issues.push(`json field '${name}' on ${fnName} declares no item.fields — the materializer invents a type and seeds cannot fill the structure`);
      }
    }
  }
  return issues;
}

/** Ontology type named by `Entity.field` (empty when the ref does not resolve). */
export function ontologyTypeForFieldRef(
  fieldRef: string,
  entities: Array<{ entityId: string; fields?: unknown[] }>,
): string {
  const dot = fieldRef.indexOf('.');
  if (dot <= 0) return '';
  const entityId = fieldRef.slice(0, dot);
  const fieldId = fieldRef.slice(dot + 1);
  const fields = entities.find(entity => entity.entityId === entityId)?.fields ?? [];
  for (const item of fields) {
    if (!isRecord(item)) continue;
    if (readString(item.fieldId) !== fieldId) continue;
    return readString(item.type);
  }
  return '';
}

/**
 * When l4 flattened a structured ontology field (json → string) onto outputShape, rewrite the
 * output type to the ontology type so W2 can pass. Caller records a systemDecision per change.
 */
export function alignOutputShapeToOntology<S extends { kind: string; fields: Array<{ name: string; type: string; required: boolean; fieldRef?: string }> }>(
  shape: S,
  entities: Array<{ entityId: string; fields?: unknown[] }>,
): { shape: S; aligned: Array<{ fieldRef: string; from: string; to: string }> } {
  const aligned: Array<{ fieldRef: string; from: string; to: string }> = [];
  const fields = shape.fields.map((field) => {
    const ont = ontologyTypeForFieldRef(field.fieldRef ?? '', entities);
    if (!ont) return field;
    const fromFam = ioTypeFamily(field.type);
    const toFam = ioTypeFamily(ont);
    if (fromFam === 'other' || toFam === 'other' || fromFam === toFam) return field;
    aligned.push({ fieldRef: field.fieldRef || field.name, from: field.type, to: ont });
    return { ...field, type: ont };
  });
  return { shape: { ...shape, fields }, aligned };
}

/** Drop bffCalls whose required usecase was never materialized (abandoned owner — no controller pair). */
export function bffCallsWithMaterializedUsecase<T extends { uses: Array<{ operationId: string; optional?: boolean }> }>(
  calls: T[],
  usecaseIds: ReadonlySet<string>,
): { kept: T[]; skipped: string[] } {
  const skipped: string[] = [];
  const kept: T[] = [];
  for (const call of calls) {
    const missing = call.uses.filter(use => !use.optional && !usecaseIds.has(use.operationId)).map(use => use.operationId);
    if (missing.length) skipped.push(...missing);
    else kept.push(call);
  }
  return { kept, skipped: [...new Set(skipped)] };
}

/** l4 contract defs a generated controller lists in `dependsFiles`. Empty/unreadable content used to
 * be dropped from the materialize prompt with only a console.warn, so controllers shipped without
 * their wire contract (ctx422 / versionRef 0). */
export function collectL4ContractDependsRefs(defsSource: string): string[] {
  const refs: string[] = [];
  for (const match of defsSource.matchAll(/['"`](_\d+_\/l4\/[^'"`]+\/contracts\/[^'"`]+)['"`]/gu)) {
    if (match[1]) refs.push(match[1]);
  }
  return [...new Set(refs)];
}

export function collectUnreadL4ContractFindings(defsSource: string, readable: (ref: string) => boolean): string[] {
  return collectL4ContractDependsRefs(defsSource)
    .filter(ref => !readable(ref))
    .map(ref => `l4 contract unreadable -> ${ref} (empty or missing; materialize would omit it from the prompt)`);
}

/** Generated defs shortName must not contain extra dots (convention after nomes_sem_ponto). */
export function collectDottedShortNameFindings(files: { shortName: string }[]): string[] {
  return files
    .filter(file => file.shortName.includes('.'))
    .map(file => `filename out of standard: '${file.shortName}' — shortName must not contain dots`);
}

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
 * A repository re-bound through a CAST to invent a method it does not have.
 *
 * The delete usecases of the buildFlowFsm run all did this:
 * `const deletedClient = clients as unknown as { delete(id: string): Promise<void> }; await
 * deletedClient.delete(...)`. The port declares no `delete`, so at runtime the property is `undefined`,
 * the call throws a TypeError, and the client sees `INTERNAL_ERROR: Unexpected error` — 7 of the 22
 * failures of the production suite, all of them unreadable. `collectRepositoryMethodMisuse` cannot see
 * it: it tracks bindings made by `resolveRepository<I…>`, and the cast creates a NEW name it never
 * heard of. The cast IS the escape from that gate.
 *
 * There is no legitimate version of this: if the port has no `delete`, the entity is not deletable, and
 * the usecase has to SAY so — the one generated file that did (`ProjectCoordinationAssignment
 * repository does not support deletion`, a readable CONFLICT) is the shape the other seven owe.
 */
/**
 * A delete operation whose port has no `delete` compiles, then 409s
 * `"<Entity> repository does not support deletion"` (petShop `cmdDeleteScheduleBlock`).
 * Either the port declares `delete`, or the operation should not exist. Ports that could not be
 * loaded are skipped (empty map) so this never false-positives. Called from validate-all against
 * the PORT source (finding routed to the port defRef); not from the usecase materialize worker.
 * `inactivate*` is a status update (`getById` → `save`), not a port method — do not match it here.
 */
export function collectDeleteOperationPortGaps(
  usecaseId: string,
  methodsByInterface: Map<string, Set<string>>,
): string[] {
  if (!/^delete[A-Z]/u.test(usecaseId)) return [];
  const issues: string[] = [];
  for (const [iface, methods] of methodsByInterface) {
    if (methods.has('delete')) continue;
    const declared = [...methods].sort().join(', ') || '(none)';
    issues.push(
      `delete operation '${usecaseId}' requires ${iface}.delete(...); the port declares ${declared} — add delete to the port or do not emit a delete operation`,
    );
  }
  return issues;
}

export function collectRepositoryCastIssues(code: string): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  const repositories = new Set<string>();
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?resolveRepository\s*</gu)) {
    repositories.add(match[1]);
  }
  if (!repositories.size) return issues;
  // `<name> as unknown as { … }` / `as any` / `as { … }` over a resolved repository.
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s+as\s+(?:unknown\s+as\s+)?([^;\n]+)/gu)) {
    const [, alias, source, casted] = match;
    if (!repositories.has(source)) continue;
    const method = /\{\s*([A-Za-z_$][\w$]*)\s*[(<]/u.exec(casted)?.[1] || 'a method';
    if (seen.has(alias)) continue;
    seen.add(alias);
    issues.push(`repository cast forbidden -> \`${alias} = ${source} as ${casted.trim().slice(0, 60)}\`; casting a repository to give it \`${method}\` produces \`undefined is not a function\` at runtime (the client sees INTERNAL_ERROR: Unexpected error). If the port does not declare it, the entity does not support that operation — throw a readable AppError('CONFLICT', '<Entity> repository does not support <operation>') instead`);
  }
  return issues;
}

/**
 * The MDM facade's `entity.related(key)` takes a TYPED CompactRelationshipRefKey. Models invent a key
 * and force it past the type with a string-literal cast — `entity.related(key as 'o')`,
 * `x.relatedIds(rel as "OffersProduct")` erro4). The isolated in-loop compile missed
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
  familiesOf?: (key: string) => string[],
): { roots: string[]; cascades: string[] } {
  const flagged = new Set(flaggedKeys);
  const roots: string[] = [];
  const cascades: string[] = [];
  for (const key of flagged) {
    const importedFlagged = importsOf(key).filter(k => k !== key && flagged.has(k));
    if (!importedFlagged.length) {
      roots.push(key);
      continue;
    }
    // A file that imports a broken sibling is a cascade ONLY when every error family it reports
    // also lives on those siblings. Two families in the same file (be5: `'pet' is possibly 'null'`
    // and `'service' is possibly 'null'`) must stay a root — otherwise g2 repairs the import and
    // never re-checks the leftover family.
    if (familiesOf) {
      const imported = new Set(importedFlagged.flatMap(k => familiesOf(k)));
      const hasOwnFamily = familiesOf(key).some(family => !imported.has(family));
      if (hasOwnFamily) {
        roots.push(key);
        continue;
      }
    }
    cascades.push(key);
  }
  return { roots, cascades };
}

/** TS code + quoted identifier, so `'pet' is possibly 'null'` and `'service' is possibly 'null'` are distinct. */
export function compilerErrorFamily(error: string): string {
  const code = error.match(/TS\d+/u)?.[0] ?? 'TS';
  const ident = error.match(/'([^']+)'/u)?.[1];
  return ident ? `${code}:${ident}` : `${code}:${error.trim().slice(0, 80)}`;
}

/**
 * After a repair, keep the UNION of both compiles — never drop a family as "flaky". g1 found two
 * families in createServiceAppointment, the repair fixed `pet`, g2's double-check then discarded
 * `service` as non-reproducing and health closed `passed` with a real tsc error still on disk.
 */
export function compilerErrorsAfterRepair(first: string[], second: string[]): string[] {
  return [...new Set([...first, ...second])];
}

/**
 * TS2339 on `never` names the symptom, not the cause: TS cannot see assignments inside a callback
 * and narrows the outer variable to its initializer. Append one sentence; never replace the diagnostic.
 */
export function annotateCompilerError(error: string): string {
  if (/\bTS2339\b/.test(error) && /type 'never'/.test(error)) {
    return `${error} possible cause: a value assigned only inside a callback (e.g. \`ctx.data.runInTransaction\`) — TS narrows the outer variable to its initializer; return the value from the callback instead`;
  }
  return error;
}

/** Health may close `passed` only when every previous family was re-checked on this pass. */
export function compilerFindingsBlockingPassed(input: {
  currentByFile: Map<string, string[]>;
  previousFamiliesByFile?: Map<string, string[]>;
}): string[] {
  const findings: string[] = [];
  for (const [file, errors] of input.currentByFile) {
    for (const error of errors) findings.push(`compiler -> ${file}: ${annotateCompilerError(error)}`);
  }
  for (const [file, previous] of input.previousFamiliesByFile ?? []) {
    if (input.currentByFile.has(file)) continue;
    if (!previous.length) continue;
    findings.push(`compiler -> ${file}: previous compile had ${previous.length} error family(ies) and this pass did not re-check the file`);
  }
  return findings;
}

const PORTUGUESE_APP_ERROR = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(Nenhum|nenhum|não|obrigatór|usuário|identificado)\b/u;

/** User-facing AppError messages must be English (or i18n). Cheap scan of generated usecases. */
export function collectNonEnglishAppErrorMessages(code: string): string[] {
  const issues: string[] = [];
  for (const match of code.matchAll(/new\s+AppError\(\s*(['"])[^'"]+\1\s*,\s*(['"`])([\s\S]*?)\2/gu)) {
    const message = match[3].replace(/\s+/gu, ' ').trim();
    if (PORTUGUESE_APP_ERROR.test(message)) {
      issues.push(`user-facing AppError message is not English: "${message.slice(0, 96)}"`);
    }
  }
  return issues;
}

// ── T12: persisted-event port ownership ─────────────────────────────────────────
// A persisted event needs a local repository port, and the usecase that writes it must DECLARE that
// port (it lands in dependsFiles -> the materialize prompt shows the model the port interface + entity
// shape). The original filter only matched the event's `ownerEntity` (the related CORE entity), which
// misses two real cases — both hit createStockAdjustment in erro4 AND erro5:
//   1. the event IS the owner's own aggregate (l4 `entity: "StockAdjustment"`, kind:"event"): it is not
//      an aggregate root, so it already fell out of detPorts/aggPorts, and matching on ownerEntity
//      never looks at the event's own id;
//   2. `ownerEntity` is EMPTY or MDM: deriveEventTargets only accepts a related entity of kind "core",
//      and StockAdjustment relates solely to StockItem (kind:"mdm") -> ownerEntity === '' -> no match.
// The fix: an event whose OWN id the owner references (entity/reads/writes) is owned by this usecase.
// Deliberately narrow — it does NOT add every module event (that would regress T5's context savings).
export interface EventForPortCheck { entityId: string; ownerEntity: string; }
export function eventPortBelongsToOwner(
  event: EventForPortCheck,
  ownerRefs: readonly string[],
  mutated: ReadonlySet<string>,
): boolean {
  // (1) the event itself is referenced by the owner — the aggregate the operation creates/emits.
  if (ownerRefs.includes(event.entityId) || mutated.has(event.entityId)) return true;
  // (2) legacy path: the event belongs to a core entity the owner touches. Empty ownerEntity never
  // matches (it would otherwise pair with an empty ownerRefs entry and pull in unrelated events).
  return !!event.ownerEntity && (ownerRefs.includes(event.ownerEntity) || mutated.has(event.ownerEntity));
}

/**
 * T12 item 4 — POST-condition on the saved usecase defs: the owner's PRINCIPAL aggregate (l4
 * `entity`) must appear in `data.ports` whenever it has a local port (an aggregate root or a persisted
 * event). MDM entities are excluded (read by id via 102034, never a port).
 *
 * This is checked on the SAVED defs by the judge — not on the model's raw output — because the ports
 * are derived deterministically by the agent AFTER the model answers. So a violation here means the
 * DERIVATION missed a case (the erro4/erro5 createStockAdjustment bug), not that the model misbehaved:
 * it routes to a cheap phase-1 defs repair instead of 3 LLM repair attempts during materialization.
 * Returns [] when the owner's entity legitimately has no port.
 */
export function missingPrincipalPortIssues(
  owner: { id: string; entity: string },
  declaredPorts: readonly string[],
  localPortIds: ReadonlySet<string>,  // aggregate roots ∪ persisted event ids
  mdmIds: ReadonlySet<string>,
): string[] {
  const entity = owner.entity;
  if (!entity || mdmIds.has(entity) || !localPortIds.has(entity)) return [];
  if (declaredPorts.includes(entity)) return [];
  return [`usecase ${owner.id}: principal aggregate '${entity}' has a local port but is missing from data.ports (materialize never sees I${entity}Repository nor the ${entity} shape; see T12)`];
}

/**
 * T12 item 3 — SAFETY BELT for the materialize worker. Independently of how the defs were derived, the
 * worker's prompt must show the model every port the usecase will actually resolve. Returns the port
 * entity ids that the defs `data` references (top-level `ports` + `functions[].ports`) but whose
 * `.d.ts` pair is NOT already in `dependsFiles` — the worker then loads those pairs into the context.
 *
 * Narrow by construction (only ids the defs itself names, never the whole module) so T5's context
 * savings hold. Immunizes against future derivation gaps without regenerating old defs.
 */
export function portsMissingFromDependsFiles(
  data: unknown,
  dependsFiles: readonly string[],
): string[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as { ports?: unknown; functions?: unknown };
  const referenced = new Set<string>();
  const collect = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    for (const id of value) if (typeof id === 'string' && id) referenced.add(id);
  };
  collect(record.ports);
  if (Array.isArray(record.functions)) {
    for (const fn of record.functions) if (fn && typeof fn === 'object') collect((fn as { ports?: unknown }).ports);
  }
  // dependsFiles carry mls paths ending in `<lowerFirstEntity>Repository.d.ts` / `<lowerFirstEntity>.d.ts`.
  const declared = dependsFiles.join('\n').toLowerCase();
  return [...referenced].filter(id => !declared.includes(`/${id.charAt(0).toLowerCase()}${id.slice(1)}repository.d.ts`.toLowerCase()));
}

// ── T10: ownership-check sanity guard ───────────────────────────────────────────
// The orphan-defs check answers "is this defs owned by a current operation/workspace?" using the ids
// derived from the scan. If the scan yields ZERO expected ids while the module DOES have generated defs,
// the check's PRECONDITION failed (erro5: the gen-http `done` flip emptied the ['toCreate','inProgress']
// scan, so all 20 usecases of the run were reported as orphans, `allMapped` went false and the global
// repair round that would have fixed the 2 REAL findings never fired). A check whose input is missing
// must DEGRADE to a warning — never fail the run with "manual reconciliation required" for files the
// run just generated. Pure so both the empty-scan and the genuine-orphan paths are unit-tested.
export function ownershipCheckIsInconclusive(expectedIdCount: number, generatedDefsCount: number): boolean {
  return expectedIdCount === 0 && generatedDefsCount > 0;
}

/** The warning emitted in place of the (suppressed) orphan findings. */
export function ownershipInconclusiveWarning(generatedDefsCount: number): string {
  return `ownership check inconclusive -> scan returned 0 operations/workspaces but the module has ${generatedDefsCount} generated defs; orphan check skipped (see T10)`;
}

export interface DefsFileForOwnership { folder: string; shortName: string; real: string; }

/**
 * The ORPHAN-DEFS check, pure. A usecase defs is owned by an operation; a v2 controller defs is owned by
 * an operation OR a workspace. Callers pass the id sets built from an ALL_STATUSES scan (A1) — ownership
 * does not depend on pending status.
 *
 * Gated PER CHECK, not on the sum: usecase ownership comes ONLY from `expectedOperationIds` (which the
 * scan filters by owner status), while controller ownership also accepts `expectedWorkspaceIds` — and
 * scan.workspaces is NOT status-filtered. Summing them would leave the usecase guard dead on a v2 module
 * (0 operations + N workspaces != 0), i.e. exactly the erro5 case this guard exists for.
 */
export function collectOrphanDefsFindings(
  defsFiles: readonly DefsFileForOwnership[],
  expectedOperationIds: ReadonlySet<string>,
  expectedWorkspaceIds: ReadonlySet<string>,
): { findings: string[]; warnings: string[] } {
  const usecaseDefs = defsFiles.filter(d => d.folder.endsWith('/layer_2_application/usecases'));
  const controllerDefs = defsFiles.filter(d => d.folder.endsWith('/adapters/http/controllers'));
  const findings: string[] = [];
  const warnings: string[] = [];

  if (ownershipCheckIsInconclusive(expectedOperationIds.size, usecaseDefs.length)) {
    warnings.push(ownershipInconclusiveWarning(usecaseDefs.length));
  } else {
    for (const d of usecaseDefs) {
      if (!expectedOperationIds.has(d.shortName)) {
        findings.push(`orphan generated defs -> ${d.folder}/${d.real}.defs.ts is not owned by a current operation (manual reconciliation required)`);
      }
    }
  }
  if (ownershipCheckIsInconclusive(expectedOperationIds.size + expectedWorkspaceIds.size, controllerDefs.length)) {
    warnings.push(ownershipInconclusiveWarning(controllerDefs.length));
  } else {
    for (const d of controllerDefs) {
      if (!expectedOperationIds.has(d.shortName) && !expectedWorkspaceIds.has(d.shortName)) {
        findings.push(`orphan generated defs -> ${d.folder}/${d.real}.defs.ts is not owned by a current operation/workspace (manual reconciliation required)`);
      }
    }
  }
  return { findings, warnings };
}

export interface OwnerForRouteCheck { kind: string; id: string; bffName?: string; pageId?: string; commandName?: string; }
export interface ControllerForRouteCheck { id: string; routes: ReadonlyArray<{ key: string }>; }

/**
 * V1-only canonical bffName route check, pure (v2 controllers are per-WORKSPACE and covered by
 * collectV2ControllerCoherenceIssues). Every operation owner that HAS a controller must expose its
 * canonical route. Works off an ALL_STATUSES scan (A1) so a `done` owner is still checked — with the old
 * pending-filtered scan this check silently passed on every post-gen-http run.
 */
export function collectMissingCanonicalRouteIssues(
  owners: readonly OwnerForRouteCheck[],
  controllers: readonly ControllerForRouteCheck[],
  moduleName: string,
  lowerFirstFn: (value: string) => string,
): string[] {
  const issues: string[] = [];
  for (const owner of owners) {
    if (owner.kind !== 'operation' || !owner.id) continue;
    const controllerId = lowerFirstFn(owner.id).toLowerCase();
    const controller = controllers.find(c => c.id === controllerId);
    if (!controller) continue;
    const expectedRoute = owner.bffName || `${moduleName}.${owner.pageId || owner.id}.${owner.commandName || owner.id}`;
    if (!controller.routes.some(route => route.key === expectedRoute)) {
      issues.push(`controller ${controller.id} -> missing canonical bffName route ${expectedRoute}`);
    }
  }
  return issues;
}

// ── details defaulting (adapter materialization gate) ───────────────────────────
// A `details` JSONB envelope can be NULL, '{}' or missing keys (seeds, older rows, partial writes) and
// `JSON.parse('{}')` does NOT throw. An adapter that defaults only inside `catch` therefore returns an
// object whose required fields are `undefined` at runtime, and `as {Entity}Details` makes the compiler
// accept it — that is how a plain read became a 500 (`metric.toFixed(2)` on undefined). The correct
// shape (see skills/repositoryAdapter.md) parses into a `Partial<...>` and spread-merges over complete
// defaults. Both checks below are textual and entity-agnostic: nothing here names a module or entity.

/** Top-level `function name(...) {...}` / `const name = (...) => {...}` blocks, brace-matched. */
export function extractFunctionBlocks(code: string): Array<{ name: string; body: string }> {
  const blocks: Array<{ name: string; body: string }> = [];
  const re = /(?:function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)[^{;]*\{|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::[^=]+?)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*(?::[^=]+?)?=>\s*\{)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const open = code.indexOf('{', match.index + match[0].length - 1);
    if (open < 0) continue;
    let depth = 0, end = -1;
    for (let i = open; i < code.length; i++) {
      const ch = code[i];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    blocks.push({ name: match[1] || match[2] || '<anonymous>', body: code.slice(open + 1, end) });
  }
  return blocks;
}

/** Number of object-literal spread elements (`...x`) in a body — the merge signature. */
function spreadCount(body: string): number {
  return (body.match(/\.\.\.[A-Za-z_$]/g) ?? []).length;
}

/** Findings for adapters that parse a `details` envelope without merging over defaults. A candidate is
 * any function that calls `JSON.parse` on an expression mentioning `details` (so `ctx.mdm` reads of
 * `entity.details.<module>`, which never JSON.parse, are not candidates). */
export function collectDetailsDefaultingIssues(code: string): string[] {
  const issues: string[] = [];
  for (const { name, body } of extractFunctionBlocks(code)) {
    if (!/JSON\.parse\(\s*[^)]*\bdetails\b/.test(body)) continue;
    // 1) RUNTIME defect: no spread-merge over defaults. The required shape produces at least two
    //    spreads in one literal (`{ ...detailsDefaults(row), ...parsed }`).
    if (spreadCount(body) < 2) {
      issues.push(`details defaulting -> ${name}() parses the details envelope without merging over complete defaults; a NULL/'{}'/partial envelope leaves required fields undefined at runtime (JSON.parse('{}') does not throw). Build a defaults object covering EVERY details field and return { ...defaults, ...parsed }`);
    }
    // 2) TYPE defect: casting the parse result to the full interface hides the same hole from tsc.
    const lyingCast = body.match(/\bas\s+(?!Partial\b)([A-Za-z0-9_$]*Details)\b/);
    if (lyingCast) {
      issues.push(`details cast -> ${name}() casts the JSON.parse result to '${lyingCast[1]}'; the stored envelope may be incomplete, so type it as 'Partial<${lyingCast[1]}>' and merge it over defaults instead`);
    }
  }
  return [...new Set(issues)];
}

/** JSONB column names declared on a table def (.ts with postgresType, or planner .defs.ts with type). */
export function jsonbColumnsFromTableSource(source: string): { tableName: string; columns: string[] } | null {
  const tableName = /tableName:\s*'([^']+)'/.exec(source)?.[1]
    || /"tableName"\s*:\s*"([^"]+)"/.exec(source)?.[1]
    || '';
  const columns = new Set<string>();
  const ts = /name:\s*'([^']+)'[\s\S]{0,120}?postgresType:\s*'JSONB'/gi;
  let match: RegExpExecArray | null;
  while ((match = ts.exec(source)) !== null) columns.add(match[1]);
  const defs = /"name"\s*:\s*"([^"]+)"[\s\S]{0,120}?"type"\s*:\s*"jsonb"/gi;
  while ((match = defs.exec(source)) !== null) columns.add(match[1]);
  if (!columns.size) return tableName ? { tableName, columns: [] } : null;
  return { tableName, columns: [...columns] };
}

/**
 * `JSON.parse(row.<col>)` on a JSONB column: pg already returns an object, parse throws, mute catch
 * empties the domain. Finding is textual; the legitimate parse is `typeof row.col === 'string' ? JSON.parse(row.col) : (row.col ?? {})`.
 */
export function collectJsonbRowParseFindings(adapterSource: string, jsonbColumns: ReadonlySet<string>, label: string): string[] {
  if (!jsonbColumns.size) return [];
  const findings: string[] = [];
  const re = /JSON\.parse\(\s*row\.([A-Za-z_][\w]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(adapterSource)) !== null) {
    const column = match[1];
    if (!jsonbColumns.has(column)) continue;
    const around = adapterSource.slice(Math.max(0, match.index - 96), match.index + match[0].length);
    if (new RegExp(`typeof\\s+row\\.${column}\\s*===\\s*['"]string['"]`).test(around)) continue;
    findings.push(
      `jsonb parse -> ${label} JSON.parse(row.${column}) on a JSONB column; pg already returns an object and JSON.parse throws into a silent catch (blank fields on read). Accept object or string: typeof row.${column} === 'string' ? JSON.parse(row.${column}) : (row.${column} ?? {})`,
    );
  }
  return [...new Set(findings)];
}

const DETAILS_MAPPING_FNS = new Set(['toRow', 'toDomain', 'parseDetails', 'detailsDefaults']);

function sliceBraceInner(code: string, openIdx: number): string | null {
  if (openIdx < 0 || code[openIdx] !== '{') return null;
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    const ch = code[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return code.slice(openIdx + 1, i);
    }
  }
  return null;
}

function firstLevelIdentKeys(inner: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth = Math.max(0, depth - 1); i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < inner.length && inner[i] !== quote) {
        if (inner[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (depth !== 0) { i++; continue; }
    if (ch === '.' && inner[i + 1] === '.' && inner[i + 2] === '.') { i += 3; continue; }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < inner.length && /[\w$]/.test(inner[j])) j++;
      const ident = inner.slice(i, j);
      let k = j;
      while (k < inner.length && /\s/.test(inner[k])) k++;
      if (inner[k] === ':') keys.push(ident);
      i = j;
      continue;
    }
    i++;
  }
  return keys;
}

/** l4 `fields[].fieldId` — the vocabulary of JSONB `details` keys (and of domain fields). */
export function fieldIdsFromL4Fields(fields: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(fields)) return ids;
  for (const item of fields) {
    if (!isRecord(item)) continue;
    const id = readString(item.fieldId);
    if (id) ids.add(id);
  }
  return ids;
}

function extractDetailsInterfaceKeys(code: string): string[] {
  const keys: string[] = [];
  const re = /interface\s+[A-Za-z0-9_$]*Details\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const open = code.indexOf('{', match.index);
    const inner = sliceBraceInner(code, open);
    if (inner) keys.push(...firstLevelIdentKeys(inner));
  }
  return keys;
}

function extractDetailsAccessKeys(body: string): string[] {
  const keys: string[] = [];
  const dot = /\b(?:d|parsed|details)\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const bracket = /\b(?:d|parsed|details)\[['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]\]/g;
  let match: RegExpExecArray | null;
  while ((match = dot.exec(body)) !== null) keys.push(match[1]);
  while ((match = bracket.exec(body)) !== null) keys.push(match[1]);
  return keys;
}

/**
 * Adapter `parseDetails`/`toDomain`/`toRow` that addresses `details.<chave>` with a key that is not
 * an l4 fieldId. Seeds write fieldId (camelCase); a snake_case key inside the JSONB envelope is
 * unread data (blank column, value still in the row). Inverse: toRow/detailsDefaults writing a key
 * outside the same vocabulary. Empty fieldIds skips (nothing to compare).
 */
export function collectDetailsKeyIssues(
  adapterSource: string,
  fieldIds: ReadonlySet<string>,
  label: string,
): string[] {
  if (!fieldIds.size) return [];
  const used = new Set<string>();
  for (const key of extractDetailsInterfaceKeys(adapterSource)) used.add(key);
  for (const { name, body } of extractFunctionBlocks(adapterSource)) {
    if (!DETAILS_MAPPING_FNS.has(name)) continue;
    for (const key of extractDetailsAccessKeys(body)) used.add(key);
    if (name === 'toRow' || name === 'detailsDefaults') {
      const assign = /\bdetails\s*(?::\s*[A-Za-z0-9_$]+)?\s*=\s*\{/.exec(body);
      if (assign) {
        const open = body.indexOf('{', assign.index + assign[0].length - 1);
        const inner = sliceBraceInner(body, open);
        if (inner) for (const key of firstLevelIdentKeys(inner)) used.add(key);
      }
    }
    if (name === 'detailsDefaults') {
      const ret = /return\s*\{/.exec(body);
      if (ret) {
        const open = body.indexOf('{', ret.index);
        const inner = sliceBraceInner(body, open);
        if (inner) for (const key of firstLevelIdentKeys(inner)) used.add(key);
      }
    }
  }
  const issues: string[] = [];
  for (const key of [...used].sort()) {
    if (fieldIds.has(key)) continue;
    issues.push(
      `details key -> ${label} JSONB key '${key}' is not an l4 fieldId (details keys are the fieldId verbatim, never snake_case). Seeds write fieldId; the adapter must read and write the same key`,
    );
  }
  return issues;
}

/** Collection fields of a generated domain entity, as `valueObjectName -> the entity's field name`
 * (e.g. `OrderItem -> items` for `items: OrderItem[]`).
 *
 * WHY this indirection exists: the TableDefinition declares embedded child collections by ENTITY ID
 * (`childCollections: ['OrderItem']`), but the domain-entity materializer names the field itself
 * (`items: OrderItem[]`) and the adapter reads THAT name (`d.items`). Seeding the envelope under the
 * entity id would write `details.OrderItem` while the adapter reads `details.items` — the row looks
 * seeded and the collection still arrives empty. Since seeds are generated AFTER materialization, the
 * real field name is readable from the generated entity source instead of guessed from a convention. */
export function extractCollectionFieldNames(entitySource: string): Map<string, string> {
  const byValueObject = new Map<string, string>();
  // Member boundary is a newline OR `{`/`;`/`,` so a single-line interface is matched too. Deliberately
  // NOT `(` — a function parameter is not an entity field.
  const re = /(?:^|[\n{;,])\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:\s*(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\[\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(entitySource)) !== null) {
    const [, fieldName, typeName] = match;
    if (!byValueObject.has(typeName)) byValueObject.set(typeName, fieldName);
  }
  return byValueObject;
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
