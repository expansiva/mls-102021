"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.ts" enhancement="_blank"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_ASSET_SCHEMA_VERSION = void 0;
exports.emptySeedAssetManifest = emptySeedAssetManifest;
exports.parseSeedAssetManifest = parseSeedAssetManifest;
exports.putSeedAssetManifestEntry = putSeedAssetManifestEntry;
exports.readySeedAssetUrls = readySeedAssetUrls;
exports.seedAssetWarnings = seedAssetWarnings;
exports.collectSeedAssetRequests = collectSeedAssetRequests;
// Pure planning/manifest helpers for optional seed images. Browser storage and image conversion stay
// in agentCbSeedAssets.ts because this step is the sole owner of the L3 asset boundary.
var cbSeedsCore_js_1 = require("../../helpers/cbSeedsCore.js");
exports.SEED_ASSET_SCHEMA_VERSION = 1;
var ASSET_ID = /^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u;
function emptySeedAssetManifest(moduleId) {
    return { schemaVersion: exports.SEED_ASSET_SCHEMA_VERSION, moduleId: moduleId, assets: [] };
}
function parseSeedAssetManifest(value, moduleId) {
    if (!isRecord(value) || value.schemaVersion !== exports.SEED_ASSET_SCHEMA_VERSION || value.moduleId !== moduleId || !Array.isArray(value.assets)) {
        return emptySeedAssetManifest(moduleId);
    }
    var assets = value.assets.flatMap(function (entry) {
        if (!isRecord(entry) || !ASSET_ID.test(string(entry.id)) || typeof entry.path !== 'string' || typeof entry.publicUrl !== 'string'
            || entry.source !== 'imagem' || typeof entry.promptHash !== 'string' || (entry.status !== 'ready' && entry.status !== 'failed'))
            return [];
        return [__assign({ id: string(entry.id), path: string(entry.path), publicUrl: string(entry.publicUrl), source: 'imagem', promptHash: string(entry.promptHash), status: entry.status }, (typeof entry.warning === 'string' ? { warning: entry.warning } : {}))];
    }).sort(function (left, right) { return left.id.localeCompare(right.id); });
    return { schemaVersion: exports.SEED_ASSET_SCHEMA_VERSION, moduleId: moduleId, assets: assets };
}
function putSeedAssetManifestEntry(manifest, entry) {
    var assets = new Map(manifest.assets.map(function (item) { return [item.id, item]; }));
    assets.set(entry.id, entry);
    return __assign(__assign({}, manifest), { assets: __spreadArray([], assets.values(), true).sort(function (left, right) { return left.id.localeCompare(right.id); }) });
}
function readySeedAssetUrls(manifest) {
    return Object.fromEntries(manifest.assets
        .filter(function (asset) { return asset.status === 'ready'; })
        .map(function (asset) { return [asset.id, asset.publicUrl]; })
        .sort(function (_a, _b) {
        var left = _a[0];
        var right = _b[0];
        return left.localeCompare(right);
    }));
}
function seedAssetWarnings(manifest) {
    return manifest.assets.filter(function (asset) { return asset.status === 'failed'; })
        .map(function (asset) { return "".concat(asset.id, ": ").concat(asset.warning || 'image unavailable; seed value set to null'); }).sort();
}
function collectSeedAssetRequests(moduleId, plan, entities) {
    var entityById = new Map(entities.map(function (entity) { return [entity.entityId, entity]; }));
    var candidates = [];
    for (var _i = 0, _a = plan.localTables; _i < _a.length; _i++) {
        var table = _a[_i];
        for (var _b = 0, _c = table.rows; _b < _c.length; _b++) {
            var row = _c[_b];
            candidates.push.apply(candidates, assetFields(table.tableId, row.key, __spreadArray(__spreadArray([], row.columns, true), row.details, true)));
        }
    }
    for (var _d = 0, _e = plan.mdmEntities; _d < _e.length; _d++) {
        var entity = _e[_d];
        for (var _f = 0, _g = entity.rows; _f < _g.length; _f++) {
            var row = _g[_f];
            candidates.push.apply(candidates, assetFields(entity.entityId, row.key, row.fields));
        }
    }
    var unique = new Map();
    for (var _h = 0, _j = candidates.sort(function (left, right) { return left.assetId.localeCompare(right.assetId); }); _h < _j.length; _h++) {
        var candidate = _j[_h];
        if (!unique.has(candidate.assetId))
            unique.set(candidate.assetId, candidate);
    }
    return __spreadArray([], unique.values(), true).map(function (candidate) {
        var entity = entityById.get(candidate.entityId);
        var title = (entity === null || entity === void 0 ? void 0 : entity.title) || candidate.entityId;
        var description = describeSeedRow(title, candidate.rowKey, candidate.fields);
        var prompt = [
            'Create a realistic, original editorial image for a fictional example application.',
            "Subject: ".concat(description, "."),
            'Square composition, natural light, no text, watermark, logo, brand, celebrity, or identifiable real person.',
        ].join(' ');
        var path = "seed/".concat(candidate.assetId, ".webp");
        return {
            assetId: candidate.assetId,
            targetPath: "l3/".concat(moduleId, "/assets/").concat(path),
            path: path,
            publicUrl: "/".concat(moduleId, "/assets/").concat(path),
            alt: "".concat(title, " \u2014 ").concat(candidate.rowKey).slice(0, 180),
            prompt: prompt,
            promptHash: "fnv1a32:".concat(hash(prompt)),
            format: 'webp',
            maxWidth: 1200,
        };
    });
}
function assetFields(entityId, rowKey, fields) {
    return fields.flatMap(function (field) {
        var value = field.value;
        return (0, cbSeedsCore_js_1.isSeedAssetRef)(value) ? [{ assetId: value.asset, entityId: entityId, rowKey: rowKey, fields: fields }] : [];
    });
}
function describeSeedRow(title, rowKey, fields) {
    var details = fields.filter(function (field) { return /^(name|title|species|breed|type|color|description)$/iu.test(field.name); })
        .map(function (field) { return typeof field.value === 'string' ? "".concat(field.name, " ").concat(field.value.replace(/[\r\n<>]/g, ' ').slice(0, 80)) : ''; })
        .filter(Boolean).join(', ');
    return details ? "".concat(title, ": ").concat(details) : "".concat(title, " identified by ").concat(rowKey);
}
function hash(input) {
    var value = 0x811c9dc5;
    for (var index = 0; index < input.length; index++) {
        value ^= input.charCodeAt(index);
        value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
}
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function string(value) {
    return typeof value === 'string' ? value : '';
}
