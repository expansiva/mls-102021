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
const singularMdmGetInBlockLoop = /\b(?:for|while)\s*\([^)]*\)\s*\{[\s\S]{0,1600}?\bctx\.mdm\.entity\.get\s*\(/g;
const singularMdmGetInArrayLoop = /\.\s*(?:map|forEach)\s*\(\s*(?:async\s*)?[\s\S]{0,900}?\bctx\.mdm\.entity\.get\s*\(/g;

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
  for (const match of code.matchAll(singularMdmGetInBlockLoop)) {
    const msg = `MDM N+1 access forbidden -> ${match[0].replace(/\s+/g, ' ').slice(0, 180)}; use ctx.mdm.collection.getMany or hydrateMany before the loop`;
    if (!seen.has(msg)) {
      seen.add(msg);
      issues.push(msg);
    }
  }
  for (const match of code.matchAll(singularMdmGetInArrayLoop)) {
    const msg = `MDM N+1 access forbidden -> ${match[0].replace(/\s+/g, ' ').slice(0, 180)}; use ctx.mdm.collection.getMany or hydrateMany before the loop`;
    if (!seen.has(msg)) {
      seen.add(msg);
      issues.push(msg);
    }
  }
  return issues;
}
