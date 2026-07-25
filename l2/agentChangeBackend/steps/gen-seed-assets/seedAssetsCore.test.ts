/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSeedAssetRequests, emptySeedAssetManifest, parseSeedAssetManifest, putSeedAssetManifestEntry,
  readySeedAssetUrls, seedAssetWarnings,
  capSeedAssetRequests, seedAssetCapWarning, SEED_ASSET_CAP,
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

// ── T11: per-run cap on image candidates ────────────────────────────────────────
const req = (id: string) => ({
  assetId: id, targetPath: `l3/m/assets/seed/${id}.webp`, path: `seed/${id}.webp`,
  publicUrl: `/m/assets/seed/${id}.webp`, alt: id, prompt: `p ${id}`, promptHash: `fnv1a32:${id}`,
  format: 'webp' as const, maxWidth: 1200,
});

test('T11: the cap keeps the first N candidates and REPORTS the dropped ones (no silent caps)', () => {
  const requests = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map(req);
  const { kept, dropped } = capSeedAssetRequests(requests, 8);
  assert.equal(kept.length, 8);
  assert.deepEqual(dropped, ['i', 'j']);
  // the warning names every dropped id — a silent truncation would read as "all assets generated".
  const warning = seedAssetCapWarning(dropped, 8);
  assert.match(warning, /2 seed image\(s\) over the per-run cap of 8 were skipped: i, j/u);
  // under the cap -> nothing dropped, no warning at all.
  const small = capSeedAssetRequests(requests.slice(0, 3), 8);
  assert.equal(small.kept.length, 3);
  assert.deepEqual(small.dropped, []);
  assert.equal(seedAssetCapWarning(small.dropped, 8), '');
});

test('T11: the default cap is 8 and cap<=0 drops everything (reported)', () => {
  assert.equal(SEED_ASSET_CAP, 8);
  const requests = ['a', 'b'].map(req);
  assert.equal(capSeedAssetRequests(requests).kept.length, 2);
  const none = capSeedAssetRequests(requests, 0);
  assert.deepEqual(none.kept, []);
  assert.deepEqual(none.dropped, ['a', 'b']);
});

// CACHE (T11 item 3): the short-circuit condition the agent applies BEFORE any image call —
// entry ready + same promptHash (+ the .webp still on disk, checked separately by hasReadyImage).
test('T11: an unchanged ready asset is cached (same promptHash) and a changed prompt is not', () => {
  const request = req('Product/logo');
  let manifest = emptySeedAssetManifest('m');
  manifest = putSeedAssetManifestEntry(manifest, {
    id: request.assetId, path: request.path, publicUrl: request.publicUrl,
    source: 'imagem', promptHash: request.promptHash, status: 'ready',
  });
  const entry = manifest.assets.find(a => a.id === request.assetId)!;
  assert.equal(entry.status === 'ready' && entry.promptHash === request.promptHash, true, 'unchanged -> cached, no image call');
  // the seed text changed -> the hash differs -> the asset IS regenerated.
  const changed = { ...request, promptHash: 'fnv1a32:different' };
  assert.equal(entry.status === 'ready' && entry.promptHash === changed.promptHash, false, 'changed prompt -> regenerate');
  // a FAILED entry is never treated as cached (a transient provider failure gets retried).
  let failedManifest = putSeedAssetManifestEntry(manifest, {
    id: request.assetId, path: request.path, publicUrl: request.publicUrl,
    source: 'imagem', promptHash: request.promptHash, status: 'failed', warning: 'provider error',
  });
  const failedEntry = failedManifest.assets.find(a => a.id === request.assetId)!;
  assert.equal(failedEntry.status === 'ready', false);
});
