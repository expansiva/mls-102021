"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectRawMdmAccessIssues = collectRawMdmAccessIssues;
var RAW_MDM_PRIMITIVE_HINTS = {
    mdmDocument: 'ctx.mdm.entity.get/create/update/delete or ctx.mdm.collection.getMany/hydrateMany',
    mdmEntityIndex: 'ctx.mdm.collection.listByType/getMany/hydrateMany',
    mdmProspectIndex: 'ctx.mdm.prospect.create/get/listByType/update/promoteToEntity',
    mdmRelationship: 'ctx.mdm.entity.link/unlink or ctx.mdm.collection.relatedOfMany',
    mdmProspectRelationship: 'ctx.mdm.prospect APIs; do not use raw prospect relationships',
};
var rawMdmPrimitiveNames = Object.keys(RAW_MDM_PRIMITIVE_HINTS).join('|');
var directDotAccess = new RegExp("\\b[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)?\\.(".concat(rawMdmPrimitiveNames, ")\\b"), 'g');
var directBracketAccess = new RegExp("\\b[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)?\\s*\\[\\s*['\"](".concat(rawMdmPrimitiveNames, ")['\"]\\s*\\]"), 'g');
var destructuredCtxDataAccess = new RegExp("\\{[^}]*\\b(".concat(rawMdmPrimitiveNames, ")\\b[^}]*\\}\\s*=\\s*(?:ctx|this\\.ctx)\\.data\\b"), 'g');
var singularMdmGetInBlockLoop = /\b(?:for|while)\s*\([^)]*\)\s*\{[\s\S]{0,1600}?\bctx\.mdm\.entity\.get\s*\(/g;
var singularMdmGetInArrayLoop = /\.\s*(?:map|forEach)\s*\(\s*(?:async\s*)?[\s\S]{0,900}?\bctx\.mdm\.entity\.get\s*\(/g;
// MdmDocumentRecord is { mdmId, version, details } — it has NO timestamps. Reading
// result.document.createdAt/updatedAt is a TS2339 against the 102034 contract; timestamps live on
// the MDM index (result.index.createdAt/updatedAt). Only checked when the file uses ctx.mdm, so a
// module-owned `document` object elsewhere is not a false positive.
var mdmDocumentTimestampAccess = /\b[A-Za-z_$][\w$]*\.document\.(createdAt|updatedAt)\b/g;
function pushIssue(issues, seen, access, primitive) {
    var hint = RAW_MDM_PRIMITIVE_HINTS[primitive] || 'ctx.mdm';
    var msg = "raw MDM runtime access forbidden -> ".concat(access, "; use ").concat(hint, " so document, index and relationshipRefs stay consistent");
    if (!seen.has(msg)) {
        seen.add(msg);
        issues.push(msg);
    }
}
function collectRawMdmAccessIssues(code) {
    var issues = [];
    var seen = new Set();
    for (var _i = 0, _a = code.matchAll(directDotAccess); _i < _a.length; _i++) {
        var match = _a[_i];
        pushIssue(issues, seen, match[0], match[1]);
    }
    for (var _b = 0, _c = code.matchAll(directBracketAccess); _b < _c.length; _b++) {
        var match = _c[_b];
        pushIssue(issues, seen, match[0], match[1]);
    }
    for (var _d = 0, _e = code.matchAll(destructuredCtxDataAccess); _d < _e.length; _d++) {
        var match = _e[_d];
        pushIssue(issues, seen, match[0], match[1]);
    }
    for (var _f = 0, _g = code.matchAll(singularMdmGetInBlockLoop); _f < _g.length; _f++) {
        var match = _g[_f];
        var msg = "MDM N+1 access forbidden -> ".concat(match[0].replace(/\s+/g, ' ').slice(0, 180), "; use ctx.mdm.collection.getMany or hydrateMany before the loop");
        if (!seen.has(msg)) {
            seen.add(msg);
            issues.push(msg);
        }
    }
    for (var _h = 0, _j = code.matchAll(singularMdmGetInArrayLoop); _h < _j.length; _h++) {
        var match = _j[_h];
        var msg = "MDM N+1 access forbidden -> ".concat(match[0].replace(/\s+/g, ' ').slice(0, 180), "; use ctx.mdm.collection.getMany or hydrateMany before the loop");
        if (!seen.has(msg)) {
            seen.add(msg);
            issues.push(msg);
        }
    }
    if (code.includes('ctx.mdm.')) {
        for (var _k = 0, _l = code.matchAll(mdmDocumentTimestampAccess); _k < _l.length; _k++) {
            var match = _l[_k];
            var msg = "MDM document timestamp forbidden -> ".concat(match[0], "; MdmDocumentRecord has only mdmId/version/details \u2014 read ").concat(match[1], " from the MDM index (result.index.").concat(match[1], ")");
            if (!seen.has(msg)) {
                seen.add(msg);
                issues.push(msg);
            }
        }
    }
    return issues;
}
