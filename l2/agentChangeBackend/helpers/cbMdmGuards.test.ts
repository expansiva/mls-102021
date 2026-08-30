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

test('collectRawMdmAccessIssues blocks timestamp reads on the MDM document', () => {
  const issues = collectRawMdmAccessIssues(`
    const existing = await ctx.mdm.entity.get({ mdmId: input.stockItemId });
    const createdAt = existing.document.createdAt;
    const updatedAt = existing.document.updatedAt;
    const indexedAt = existing.index.createdAt;
  `);

  assert.equal(issues.length, 2);
  assert.match(issues.join('\n'), /result\.index\.createdAt/);
  assert.match(issues.join('\n'), /result\.index\.updatedAt/);
});

test('collectRawMdmAccessIssues ignores module-owned document objects without ctx.mdm', () => {
  const issues = collectRawMdmAccessIssues(`
    const record = await repositories.load(id);
    const createdAt = record.document.createdAt;
  `);

  assert.deepEqual(issues, []);
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

test('collectRawMdmAccessIssues does not treat pure arithmetic loops as N+1', () => {
  // Fixture is the for-loop isValidCpf that the 30/08 listaAssinatura run flagged,
  // followed by a legitimate get outside the loop (copied inline — do not read mls-102047).
  const issues = collectRawMdmAccessIssues(`
    function isValidCpf(cpf) {
      const digits = cpf.replace(/\\D/g, '');
      if (digits.length !== 11 || /^([0-9])\\1{10}$/.test(digits)) {
        return false;
      }
      let firstSum = 0;
      for (let index = 0; index < 9; index += 1) {
        firstSum += Number(digits[index]) * (10 - index);
      }
      const firstCheck = (firstSum * 10) % 11 % 10;
      if (firstCheck !== Number(digits[9])) {
        return false;
      }
      let secondSum = 0;
      for (let index = 0; index < 10; index += 1) {
        secondSum += Number(digits[index]) * (11 - index);
      }
      const secondCheck = (secondSum * 10) % 11 % 10;
      return secondCheck === Number(digits[10]);
    }
    export async function registerSignature(ctx, input) {
      if (!isValidCpf(input.cpf)) return null;
      const petition = await ctx.mdm.entity.get({ mdmId: input.petitionId });
      return petition;
    }
  `);

  assert.equal(issues.filter((msg) => msg.includes('MDM N+1')).length, 0);
});

test('collectRawMdmAccessIssues flags get nested inside an if in a loop', () => {
  const issues = collectRawMdmAccessIssues(`
    for (const mdmId of input.mdmIds) {
      if (mdmId) {
        const entity = await ctx.mdm.entity.get({ mdmId });
        rows.push(entity);
      }
    }
  `);

  assert.equal(issues.length, 1);
  assert.match(issues[0], /MDM N\+1 access forbidden/);
});
