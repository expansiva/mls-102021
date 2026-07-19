"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbMdmGuards_js_1 = require("/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js");
(0, node_test_1.default)('collectRawMdmAccessIssues allows facade and local module runtime access', function () {
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)("\n    const entity = await ctx.mdm.entity.get({ mdmId });\n    const items = await ctx.mdm.collection.getMany({ mdmIds });\n    const table = await ctx.data.moduleData.getTable('orders');\n    await ctx.data.runInTransaction(async (tx) => repositories.save(order, tx));\n  ");
    strict_1.default.deepEqual(issues, []);
});
(0, node_test_1.default)('collectRawMdmAccessIssues blocks raw MDM runtime access', function () {
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)("\n    await ctx.data.mdmDocument.put({ record });\n    await ctx.data.mdmEntityIndex.findMany({ where: { subtype: 'Product' } });\n    await ctx.data.mdmRelationship.insert({ record: rel });\n    await tx.mdmDocument.delete({ mdmId });\n    await trx.mdmEntityIndex.update({ where, patch });\n    await runtime.mdmProspectRelationship.findMany();\n    const byBracket = await ctx.data['mdmProspectIndex'].findMany();\n    const { mdmDocument } = ctx.data;\n    await mdmDocument.get({ mdmId });\n  ");
    strict_1.default.equal(issues.length, 8);
    strict_1.default.match(issues.join('\n'), /ctx\.data\.mdmDocument/);
    strict_1.default.match(issues.join('\n'), /tx\.mdmDocument/);
    strict_1.default.match(issues.join('\n'), /mdmProspectIndex/);
});
(0, node_test_1.default)('collectRawMdmAccessIssues blocks timestamp reads on the MDM document', function () {
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)("\n    const existing = await ctx.mdm.entity.get({ mdmId: input.stockItemId });\n    const createdAt = existing.document.createdAt;\n    const updatedAt = existing.document.updatedAt;\n    const indexedAt = existing.index.createdAt;\n  ");
    strict_1.default.equal(issues.length, 2);
    strict_1.default.match(issues.join('\n'), /result\.index\.createdAt/);
    strict_1.default.match(issues.join('\n'), /result\.index\.updatedAt/);
});
(0, node_test_1.default)('collectRawMdmAccessIssues ignores module-owned document objects without ctx.mdm', function () {
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)("\n    const record = await repositories.load(id);\n    const createdAt = record.document.createdAt;\n  ");
    strict_1.default.deepEqual(issues, []);
});
(0, node_test_1.default)('collectRawMdmAccessIssues blocks singular MDM reads inside loops', function () {
    var issues = (0, cbMdmGuards_js_1.collectRawMdmAccessIssues)("\n    for (const mdmId of input.mdmIds) {\n      const entity = await ctx.mdm.entity.get({ mdmId });\n      rows.push(entity);\n    }\n    const names = await Promise.all(input.ids.map(async (mdmId) => {\n      const entity = await ctx.mdm.entity.get({ mdmId });\n      return entity?.details.name;\n    }));\n  ");
    strict_1.default.equal(issues.length, 2);
    strict_1.default.match(issues.join('\n'), /MDM N\+1 access forbidden/);
    strict_1.default.match(issues.join('\n'), /getMany or hydrateMany/);
});
