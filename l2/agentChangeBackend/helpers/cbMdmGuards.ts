/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

const RAW_MDM_PRIMITIVE_HINTS: Record<string, string> = {
  mdmDocument: 'ctx.mdm.entity.get/create/update/delete or ctx.mdm.collection.getMany/hydrateMany',
  mdmEntityIndex: 'ctx.mdm.collection.listByType/getMany/hydrateMany',
  mdmProspectIndex: 'ctx.mdm.prospect.create/get/listByType/update/promoteToEntity',
  mdmRelationship: 'ctx.mdm.entity.link/unlink or ctx.mdm.collection.relatedOfMany',
  mdmProspectRelationship: 'ctx.mdm.prospect APIs; do not use raw prospect relationships',
};

const rawMdmPrimitiveNames = Object.keys(RAW_MDM_PRIMITIVE_HINTS).join('|');
const directDotAccess = new RegExp(
  `\\b[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)?\\.(${rawMdmPrimitiveNames})\\b`,
  'g',
);
const directBracketAccess = new RegExp(
  `\\b[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)?\\s*\\[\\s*['"](${rawMdmPrimitiveNames})['"]\\s*\\]`,
  'g',
);
const destructuredCtxDataAccess = new RegExp(
  `\\{[^}]*\\b(${rawMdmPrimitiveNames})\\b[^}]*\\}\\s*=\\s*(?:ctx|this\\.ctx)\\.data\\b`,
  'g',
);
const MDM_ENTITY_GET = 'ctx.mdm.entity.get(';
const blockLoopHead = /\b(?:for|while)\s*\(/g;
const arrayLoopHead = /\.\s*(?:map|forEach)\s*\(/g;

/**
 * N+1 is `ctx.mdm.entity.get(` inside a for/while body or a map/forEach callback.
 * Brace/paren matching skips quotes, line comments and block comments. Template
 * literals are treated as opaque until the next unescaped backtick (`${...}`
 * interpolations are not parsed), so a get inside an interpolation is not seen.
 */
function skipIgnored(code: string, i: number): number {
  const c = code[i];
  if (c === '/' && code[i + 1] === '/') {
    const nl = code.indexOf('\n', i + 2);
    return nl === -1 ? code.length : nl + 1;
  }
  if (c === '/' && code[i + 1] === '*') {
    const end = code.indexOf('*/', i + 2);
    return end === -1 ? code.length : end + 2;
  }
  if (c === "'" || c === '"' || c === '`') {
    i += 1;
    while (i < code.length) {
      if (code[i] === '\\') { i += 2; continue; }
      if (code[i] === c) return i + 1;
      i += 1;
    }
    return code.length;
  }
  return i;
}

function matchingClose(code: string, openIndex: number, openCh: string, closeCh: string): number {
  let depth = 0;
  for (let i = openIndex; i < code.length; ) {
    const skipped = skipIgnored(code, i);
    if (skipped !== i) { i = skipped; continue; }
    const ch = code[i];
    if (ch === openCh) depth += 1;
    else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

function indexOfMdmGet(code: string, start: number, end: number): number {
  for (let i = start; i < end; ) {
    const skipped = skipIgnored(code, i);
    if (skipped !== i) { i = skipped; continue; }
    if (code.startsWith(MDM_ENTITY_GET, i)) return i;
    i += 1;
  }
  return -1;
}

function skipWs(code: string, i: number): number {
  while (i < code.length && /\s/.test(code[i])) i += 1;
  return i;
}

function nPlusOneSnippet(code: string, from: number, getAt: number): string {
  return code.slice(from, getAt + MDM_ENTITY_GET.length).replace(/\s+/g, ' ').slice(0, 180);
}

function collectSingularMdmGetsInLoops(code: string): string[] {
  const snippets: string[] = [];
  blockLoopHead.lastIndex = 0;
  arrayLoopHead.lastIndex = 0;
  for (const match of code.matchAll(blockLoopHead)) {
    const headStart = match.index ?? 0;
    const openParen = headStart + match[0].length - 1;
    const closeParen = matchingClose(code, openParen, '(', ')');
    if (closeParen < 0) continue;
    const bodyOpen = skipWs(code, closeParen + 1);
    if (code[bodyOpen] !== '{') continue;
    const bodyClose = matchingClose(code, bodyOpen, '{', '}');
    if (bodyClose < 0) continue;
    const getAt = indexOfMdmGet(code, bodyOpen + 1, bodyClose);
    if (getAt >= 0) snippets.push(nPlusOneSnippet(code, headStart, getAt));
  }
  for (const match of code.matchAll(arrayLoopHead)) {
    const headStart = match.index ?? 0;
    const openParen = headStart + match[0].length - 1;
    const closeParen = matchingClose(code, openParen, '(', ')');
    if (closeParen < 0) continue;
    const getAt = indexOfMdmGet(code, openParen + 1, closeParen);
    if (getAt >= 0) snippets.push(nPlusOneSnippet(code, headStart, getAt));
  }
  return snippets;
}

// MdmDocumentRecord is { mdmId, version, details } — it has NO timestamps. Reading
// result.document.createdAt/updatedAt is a TS2339 against the 102034 contract; timestamps live on
// the MDM index (result.index.createdAt/updatedAt). Only checked when the file uses ctx.mdm, so a
// module-owned `document` object elsewhere is not a false positive.
const mdmDocumentTimestampAccess = /\b[A-Za-z_$][\w$]*\.document\.(createdAt|updatedAt)\b/g;

function pushIssue(issues: string[], seen: Set<string>, access: string, primitive: string): void {
  const hint = RAW_MDM_PRIMITIVE_HINTS[primitive] || 'ctx.mdm';
  const msg = `raw MDM runtime access forbidden -> ${access}; use ${hint} so document, index and relationshipRefs stay consistent`;
  if (!seen.has(msg)) {
    seen.add(msg);
    issues.push(msg);
  }
}

export function collectRawMdmAccessIssues(code: string): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const match of code.matchAll(directDotAccess)) {
    pushIssue(issues, seen, match[0], match[1]);
  }
  for (const match of code.matchAll(directBracketAccess)) {
    pushIssue(issues, seen, match[0], match[1]);
  }
  for (const match of code.matchAll(destructuredCtxDataAccess)) {
    pushIssue(issues, seen, match[0], match[1]);
  }
  for (const snippet of collectSingularMdmGetsInLoops(code)) {
    const msg = `MDM N+1 access forbidden -> ${snippet}; use ctx.mdm.collection.getMany or hydrateMany before the loop`;
    if (!seen.has(msg)) {
      seen.add(msg);
      issues.push(msg);
    }
  }
  if (code.includes('ctx.mdm.')) {
    for (const match of code.matchAll(mdmDocumentTimestampAccess)) {
      const msg = `MDM document timestamp forbidden -> ${match[0]}; MdmDocumentRecord has only mdmId/version/details — read ${match[1]} from the MDM index (result.index.${match[1]})`;
      if (!seen.has(msg)) {
        seen.add(msg);
        issues.push(msg);
      }
    }
  }
  return issues;
}

// ── the cadastral pair: a lifecycle usecase may NEVER delete ──────────────────

/**
 * A lifecycle operation (`mdm.lifecycle: 'inactivate' | 'reactivate'`) exists precisely BECAUSE master
 * data is never removed: it preserves the record and its references, and only flips the MDM index
 * status. So the one thing its usecase must not do is destroy anything — the original bug of the class
 * is `mls102046_client`, a local table standing in for the MDM index.
 *
 * Scoped by construction: the caller only has an `mdm.lifecycle` for an entity whose l4 declares
 * `storage.target: 'mdm'`, so a module-owned entity's own delete usecase never reaches here.
 *
 * Anchored on WRITE verbs only. A lifecycle usecase legitimately READS through ports (loading the
 * record, validating a rule), so flagging any port reference would reject correct code; what is illegal
 * is destroying or locally persisting the record.
 */
const MDM_DELETE_CALL = /\bctx\.mdm\.entity\.delete\s*\(/g;
const LOCAL_DESTRUCTIVE_WRITE = /\b(?:[A-Za-z_$][\w$]*)?[Rr]epository\s*\.\s*(delete|remove|destroy|save|insert|update)\s*\(/g;
const LOCAL_TABLE_WRITE = /\bctx\.data\.[A-Za-z_$][\w$]*\s*\.\s*(delete|deleteMany|remove|create|update|upsert)\s*\(/g;

export function collectMdmLifecycleIssues(code: string, lifecycle: string | undefined): string[] {
  if (lifecycle !== 'inactivate' && lifecycle !== 'reactivate') return [];
  const expected = lifecycle === 'inactivate' ? 'ctx.mdm.entity.inactivate' : 'ctx.mdm.entity.reactivate';
  const issues: string[] = [];
  const seen = new Set<string>();
  const push = (msg: string): void => { if (!seen.has(msg)) { seen.add(msg); issues.push(msg); } };
  for (const match of code.matchAll(MDM_DELETE_CALL)) {
    push(`mdm lifecycle '${lifecycle}' must not delete -> ${match[0].trim()}; master data is deactivated, never removed: use ${expected}`);
  }
  for (const match of code.matchAll(LOCAL_DESTRUCTIVE_WRITE)) {
    push(`mdm lifecycle '${lifecycle}' must not write a local port -> ${match[0].trim()}; the record lives in the MDM index: use ${expected}`);
  }
  for (const match of code.matchAll(LOCAL_TABLE_WRITE)) {
    push(`mdm lifecycle '${lifecycle}' must not write a local table -> ${match[0].trim()}; the record lives in the MDM index: use ${expected}`);
  }
  // Doing nothing is also wrong: a usecase that calls neither half of the pair silently no-ops the
  // action on screen. Only checked when nothing else was found, so the message names one defect.
  if (issues.length === 0 && !code.includes(expected)) {
    push(`mdm lifecycle '${lifecycle}' does not call ${expected}; the generated usecase has no effect on the MDM index`);
  }
  return issues;
}
