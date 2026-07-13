/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRawMdmAccessIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js';

test('collectRawMdmAccessIssues allows facade and local module runtime access', () => {
  const issues = collectRawMdmAccessIssues(`
    const entity = await ctx.mdm.entity.get({ mdmId });
    const items = await ctx.mdm.collection.getMany({ mdmIds });
    const table = await ctx.data.moduleData.getTable('orders');
    await ctx.data.runInTransaction(async (tx) => repositories.save(order, tx));
  `);

  assert.deepEqual(issues, []);
});

test('collectRawMdmAccessIssues blocks raw MDM runtime access', () => {
  const issues = collectRawMdmAccessIssues(`
    await ctx.data.mdmDocument.put({ record });
    await ctx.data.mdmEntityIndex.findMany({ where: { subtype: 'Product' } });
    await ctx.data.mdmRelationship.insert({ record: rel });
    await tx.mdmDocument.delete({ mdmId });
    await trx.mdmEntityIndex.update({ where, patch });
    await runtime.mdmProspectRelationship.findMany();
    const byBracket = await ctx.data['mdmProspectIndex'].findMany();
    const { mdmDocument } = ctx.data;
    await mdmDocument.get({ mdmId });
  `);

  assert.equal(issues.length, 8);
  assert.match(issues.join('\n'), /ctx\.data\.mdmDocument/);
  assert.match(issues.join('\n'), /tx\.mdmDocument/);
  assert.match(issues.join('\n'), /mdmProspectIndex/);
});

test('collectRawMdmAccessIssues blocks singular MDM reads inside loops', () => {
  const issues = collectRawMdmAccessIssues(`
    for (const mdmId of input.mdmIds) {
      const entity = await ctx.mdm.entity.get({ mdmId });
      rows.push(entity);
    }
    const names = await Promise.all(input.ids.map(async (mdmId) => {
      const entity = await ctx.mdm.entity.get({ mdmId });
      return entity?.details.name;
    }));
  `);

  assert.equal(issues.length, 2);
  assert.match(issues.join('\n'), /MDM N\+1 access forbidden/);
  assert.match(issues.join('\n'), /getMany or hydrateMany/);
});
