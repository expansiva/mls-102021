"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.test.ts" enhancement="_blank"/>
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var seedAssetsCore_js_1 = require("./seedAssetsCore.js");
(0, node_test_1.default)('collectSeedAssetRequests creates stable local WebP targets', function () {
    var plan = {
        summary: 'A pet ready for adoption.',
        localTables: [],
        mdmEntities: [{ entityId: 'AdoptablePet', rows: [{ key: 'rex', fields: [
                            { name: 'name', value: 'Rex' }, { name: 'species', value: 'dog' },
                            { name: 'photoUrl', value: { asset: 'AdoptablePet/rex', kind: 'image' } },
                        ], relationships: [] }] }],
    };
    var requests = (0, seedAssetsCore_js_1.collectSeedAssetRequests)('petShop', plan, [{ entityId: 'AdoptablePet', title: 'Adoptable pet', kind: 'mdm', fields: [] }]);
    strict_1.default.deepEqual(requests.map(function (request) { return ({ assetId: request.assetId, path: request.path, publicUrl: request.publicUrl }); }), [{
            assetId: 'AdoptablePet/rex', path: 'seed/AdoptablePet/rex.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/rex.webp',
        }]);
    strict_1.default.match(requests[0].prompt, /Rex/);
});
(0, node_test_1.default)('manifest exposes only ready assets and preserves failed-image warnings', function () {
    var manifest = (0, seedAssetsCore_js_1.emptySeedAssetManifest)('petShop');
    manifest = (0, seedAssetsCore_js_1.putSeedAssetManifestEntry)(manifest, {
        id: 'AdoptablePet/rex', path: 'seed/AdoptablePet/rex.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/rex.webp',
        source: 'imagem', promptHash: 'fnv1a32:1', status: 'ready',
    });
    manifest = (0, seedAssetsCore_js_1.putSeedAssetManifestEntry)(manifest, {
        id: 'AdoptablePet/mia', path: 'seed/AdoptablePet/mia.webp', publicUrl: '/petShop/assets/seed/AdoptablePet/mia.webp',
        source: 'imagem', promptHash: 'fnv1a32:2', status: 'failed', warning: 'service unavailable',
    });
    strict_1.default.deepEqual((0, seedAssetsCore_js_1.readySeedAssetUrls)(manifest), { 'AdoptablePet/rex': '/petShop/assets/seed/AdoptablePet/rex.webp' });
    strict_1.default.deepEqual((0, seedAssetsCore_js_1.seedAssetWarnings)(manifest), ['AdoptablePet/mia: service unavailable']);
    strict_1.default.deepEqual((0, seedAssetsCore_js_1.parseSeedAssetManifest)(manifest, 'petShop'), manifest);
});
