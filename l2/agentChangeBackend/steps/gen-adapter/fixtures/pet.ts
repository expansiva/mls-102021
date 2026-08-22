/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/fixtures/pet.ts" enhancement="_blank"/>

// Real petShop table def: details is JSONB. Pair of petRepositoryAdapter.ts.
// Shape is local: l2 is DOM-only and must not import l1/server of 102034.

export const petTableDef = {
  moduleId: 'petShop',
  repositoryName: 'petShopPet',
  tableName: 'pet',
  purpose: 'cadastro',
  description: 'Stores pets.',
  backupHot: false,
  storageProfile: 'postgres',
  writeMode: 'sync',
  columns: [
    {
      name: 'pet_id',
      postgresType: 'UUID',
      description: 'Primary key and pet identifier.',
    },
    {
      name: 'details',
      postgresType: 'JSONB',
      description: 'Pet details including name.',
    },
  ],
  primaryKey: ['pet_id'],
  indexes: [
    {
      name: 'pet_pkey',
      columns: ['pet_id'],
      unique: true,
    },
  ],
  version: 1,
};
