/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceActorSeed.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { ACTOR_SEED_AT, stableActorMdmId } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixture', 'tarefas');
const accessSource = fs.readFileSync(path.join(FIXTURE, 'access.defs.ts'), 'utf8');
const roleSource = fs.readFileSync(path.join(FIXTURE, 'ontology', 'MembroEquipe.defs.ts'), 'utf8');

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
  const read = async (ref: string) => {
    if (ref.endsWith('/l4/tarefas/access.defs.ts')) return accessSource;
    if (ref.endsWith('/ontology/MembroEquipe.defs.ts')) return roleSource;
    return null;
  };
  const emitted = await emitPersistence(
    'persistence.persistenceSeeds',
    seedsDefinition('tarefas'),
    '_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts',
    read,
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
