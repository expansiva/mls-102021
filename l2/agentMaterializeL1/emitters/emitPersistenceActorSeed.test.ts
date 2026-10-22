/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceActorSeed.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { ACTOR_SEED_AT, actorMdmSeedRows, stableActorMdmId } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixture', 'tarefas');
const accessSource = fs.readFileSync(path.join(FIXTURE, 'access.defs.ts'), 'utf8');
const roleSource = fs.readFileSync(path.join(FIXTURE, 'ontology', 'MembroEquipe.defs.ts'), 'utf8');
const persistenceSource = fs.readFileSync(path.resolve(HERE, '../../../../mls-102034/l1/mdm/persistence.ts'), 'utf8');
const ontologySource = fs.readFileSync(path.resolve(HERE, '../../../../mls-102034/l1/mdm/defs/ontology.ts'), 'utf8');
const MDM_TABLE_REF = '_102034_/l1/mdm/persistence.ts';
const MDM_ONTOLOGY_REF = '_102034_/l1/mdm/defs/ontology.ts';

function platformRead(table: string | null, ontology: string | null = ontologySource) {
  return async (ref: string) => {
    if (ref.endsWith('/l4/tarefas/access.defs.ts')) return accessSource;
    if (ref.endsWith('/ontology/MembroEquipe.defs.ts')) return roleSource;
    if (ref === MDM_TABLE_REF) return table;
    if (ref === MDM_ONTOLOGY_REF) return ontology;
    return null;
  };
}

function seedsDefinition(moduleName: string): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'persistenceSeeds',
    artifactId: 'seeds',
    moduleName,
    status: 'pending',
    dependencies: [],
    data: { seedId: 'seeds', phase: 'plan', scenarios: [], datasets: [] },
  };
}

test('tarefas l4 actors become one MDM person each, with the role tag, and a module without actors does not', async () => {
  const emitted = await emitPersistence(
    'persistence.persistenceSeeds',
    seedsDefinition('tarefas'),
    '_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts',
    platformRead(persistenceSource),
  );
  assert.ok(!('code' in emitted));
  if ('code' in emitted) return;
  const membro = await stableActorMdmId('tarefas', 'membroEquipe');
  const gestor = await stableActorMdmId('tarefas', 'gestor');
  assert.equal(membro, await stableActorMdmId('tarefas', 'membroEquipe'));
  assert.notEqual(membro, gestor);
  for (const actorId of ['membroEquipe', 'gestor']) {
    const tags = ['tarefas.Person', 'tarefas', 'actor', actorId, 'tarefas.MembroEquipe'];
    for (const tag of tags) assert.match(emitted.source, new RegExp(`"${tag}"`));
  }
  assert.match(emitted.source, /"seedFor":"mdmEntityIndex"/);
  assert.match(emitted.source, /"seedFor":"mdmDocumentCache"/);
  assert.match(emitted.source, /"subtype":"Person"/);
  assert.match(emitted.source, new RegExp(`"mdmId":"${membro}"`));
  assert.match(emitted.source, new RegExp(`"createdAt":"${ACTOR_SEED_AT}"`));
  for (const table of ['mdmEntityIndex', 'mdmDocumentCache']) {
    assert.match(emitted.source, new RegExp(`"seedFor":"${table}","purpose":"test"`));
  }
  assert.equal(emitted.source.includes('"purpose":"initial"'), false);
  assert.equal(/login/i.test(emitted.source), false);
  assert.equal((emitted.source.match(/"contacts":\[\]/g) ?? []).length, 2);
  const index = emitted.source.match(/"seedFor":"mdmEntityIndex"/g) ?? [];
  assert.equal(index.length, 1);
  assert.equal((emitted.source.match(/"actorId":"membroEquipe"/g) ?? []).length, 1);
  assert.equal((emitted.source.match(/"actorId":"gestor"/g) ?? []).length, 1);

  const emptyAccess = accessSource.replace(/"actors": \[[\s\S]*?\],/, '"actors": [],');
  const none = await emitPersistence(
    'persistence.persistenceSeeds',
    seedsDefinition('tarefas'),
    '_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts',
    async ref => (ref.endsWith('/access.defs.ts') ? emptyAccess : null),
  );
  assert.ok(!('code' in none));
  if ('code' in none) return;
  assert.equal(none.source.includes('mdmEntityIndex'), false);
  assert.equal(none.source.includes('mdmDocumentCache'), false);
});

test('an actor row takes its columns from the MDM table definition', async () => {
  const withBadge = persistenceSource.replace(
    "{ name: 'mdmId', postgresType: 'TEXT' },",
    "{ name: 'mdmId', postgresType: 'TEXT' },\n      { name: 'badgeCode', postgresType: 'TEXT', nullable: true },",
  );
  const rows = await actorMdmSeedRows({
    moduleName: 'tarefas',
    accessSource,
    roleSource: async () => roleSource,
    tableSource: withBadge,
    ontologySource,
  });
  const index = rows.find(item => item.seedFor === 'mdmEntityIndex');
  assert.ok(index);
  assert.equal(index.rows.length, 2);
  for (const row of index.rows) {
    assert.equal(Object.hasOwn(row, 'badgeCode'), true);
    assert.equal(row.badgeCode, null);
    assert.equal(row.countryCode, 'US');
    assert.equal(row.subtype, 'Person');
  }
  const live = await actorMdmSeedRows({
    moduleName: 'tarefas',
    accessSource,
    roleSource: async () => roleSource,
    tableSource: persistenceSource,
    ontologySource,
  });
  const liveIndex = live.find(item => item.seedFor === 'mdmEntityIndex');
  assert.ok(liveIndex);
  assert.equal(Object.hasOwn(liveIndex.rows[0], 'badgeCode'), false);
  assert.equal(liveIndex.rows[0].countryCode, 'US');
});

test('the emitter writes actor columns from the table text the read returns', async () => {
  const withBadge = persistenceSource.replace(
    "{ name: 'mdmId', postgresType: 'TEXT' },",
    "{ name: 'mdmId', postgresType: 'TEXT' },\n      { name: 'badgeCode', postgresType: 'TEXT', nullable: true },",
  );
  const emitted = await emitPersistence(
    'persistence.persistenceSeeds',
    seedsDefinition('tarefas'),
    '_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts',
    platformRead(withBadge),
  );
  assert.ok(!('code' in emitted));
  if ('code' in emitted) return;
  assert.match(emitted.source, /"badgeCode":null/);
  assert.match(emitted.source, /"countryCode":"US"/);
});

test('a read that does not return the MDM table fails with the file name', async () => {
  await assert.rejects(
    () => emitPersistence(
      'persistence.persistenceSeeds',
      seedsDefinition('tarefas'),
      '_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts',
      platformRead(null),
    ),
    new RegExp(MDM_TABLE_REF.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
});
