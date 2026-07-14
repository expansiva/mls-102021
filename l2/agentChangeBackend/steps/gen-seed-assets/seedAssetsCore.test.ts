/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSeedAssetRequests, emptySeedAssetManifest, parseSeedAssetManifest, putSeedAssetManifestEntry,
  readySeedAssetUrls, seedAssetWarnings,
} from './seedAssetsCore.js';

test('collectSeedAssetRequests creates stable local WebP targets', () => {
  const plan = {
    summary: 'A pet ready for adoption.',
    localTables: [],
    mdmEntities: [{ entityId: 'AdoptablePet', rows: [{ key: 'rex', fields: [
      { name: 'name', value: 'Rex' }, { name: 'species', value: 'dog' },
      { name: 'photoUrl', value: { asset: 'AdoptablePet/rex', kind: 'image' as const } },
    ], relationships: [] }] }],
  };
  const requests = collectSeedAssetRequests('petShop', plan, [{ entityId: 'AdoptablePet', title: 'Adoptable pet', kind: 'mdm', fields: [] }]);
  assert.deepEqual(requests.map(request => ({ assetId: request.assetId, path: request.path, publicUrl: request.publicUrl })), [{
    assetId: 'AdoptablePet/rex', path: 'seed/AdoptablePet/rex.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/rex.webp',
  }]);
  assert.match(requests[0].prompt, /Rex/);
});

test('manifest exposes only ready assets and preserves failed-image warnings', () => {
  let manifest = emptySeedAssetManifest('petShop');
  manifest = putSeedAssetManifestEntry(manifest, {
    id: 'AdoptablePet/rex', path: 'seed/AdoptablePet/rex.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/rex.webp',
    source: 'imagem', promptHash: 'fnv1a32:1', status: 'ready',
  });
  manifest = putSeedAssetManifestEntry(manifest, {
    id: 'AdoptablePet/mia', path: 'seed/AdoptablePet/mia.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/mia.webp',
    source: 'imagem', promptHash: 'fnv1a32:2', status: 'failed', warning: 'service unavailable',
  });
  assert.deepEqual(readySeedAssetUrls(manifest), { 'AdoptablePet/rex': '/petShop/assets/seed/AdoptablePet/rex.webp' });
  assert.deepEqual(seedAssetWarnings(manifest), ['AdoptablePet/mia: service unavailable']);
  assert.deepEqual(parseSeedAssetManifest(manifest, 'petShop'), manifest);
});
