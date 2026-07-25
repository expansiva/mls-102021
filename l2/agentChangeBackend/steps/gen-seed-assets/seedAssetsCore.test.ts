/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSeedAssetRequests, emptySeedAssetManifest, parseSeedAssetManifest, putSeedAssetManifestEntry,
  readySeedAssetUrls, seedAssetWarnings,
} from './seedAssetsCore.js';
import { updateSeedAssetUrlsInSource, SEED_ASSET_URLS_START, SEED_ASSET_URLS_END } from '../../helpers/cbSeedsCore.js';

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

// T8 acceptance ("Simulação de falha do provider de imagem: task termina completed com aviso, seeds
// intactos"): when the image provider fails (INVALID_JSON_CONTENT / IMAGE_ENDPOINT_REQUIRED), the
// agent records a FAILED entry and calls updateSeedAssetUrlsInSource. This is the deterministic
// consequence — the seeded rows survive byte-for-byte, only the asset-URL block changes, the failed
// asset yields a warning (not a URL, not a thrown error). Proven without any image model / runtime.
test('T8: a failed image asset degrades to a warning and leaves the seeded rows intact', () => {
  const source = [
    'export const productSeeds = [',
    "  { id: '11111111-1111-1111-1111-111111111111', name: 'Espresso', logoUrl: null },",
    '];',
    '',
    SEED_ASSET_URLS_START,
    'const seedAssetUrls: Record<string, string> = {};',
    'const seedAssetWarnings: string[] = [];',
    SEED_ASSET_URLS_END,
    '',
    'export const mdmSeeds = [];',
    '',
  ].join('\n');

  let manifest = emptySeedAssetManifest('cafeFlow');
  manifest = putSeedAssetManifestEntry(manifest, {
    id: 'Product/logo', path: 'seed/Product/logo.webp', publicUrl: '/cafeFlow/assets/seed/Product/logo.webp',
    source: 'imagem', promptHash: 'h1', status: 'ready',
  });
  manifest = putSeedAssetManifestEntry(manifest, {
    id: 'Product/hero', path: 'seed/Product/hero.webp', publicUrl: '/cafeFlow/assets/seed/Product/hero.webp',
    source: 'imagem', promptHash: 'h2', status: 'failed', warning: 'IMAGE_ENDPOINT_REQUIRED: image model on chat endpoint',
  });

  const updated = updateSeedAssetUrlsInSource(source, readySeedAssetUrls(manifest), seedAssetWarnings(manifest));

  // Seeded rows OUTSIDE the asset block are preserved (seeds intactos).
  assert.ok(updated.includes("{ id: '11111111-1111-1111-1111-111111111111', name: 'Espresso', logoUrl: null }"));
  assert.ok(updated.includes('export const mdmSeeds = [];'));
  // The ready URL is wired in; the failed asset appears only as a warning, never as a URL.
  assert.ok(updated.includes('"Product/logo": "/cafeFlow/assets/seed/Product/logo.webp"'));
  assert.ok(!updated.includes('"Product/hero":'));
  assert.ok(updated.includes('Product/hero: IMAGE_ENDPOINT_REQUIRED'));
});
