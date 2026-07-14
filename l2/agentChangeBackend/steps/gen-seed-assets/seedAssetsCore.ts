/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seed-assets/seedAssetsCore.ts" enhancement="_blank"/>

// Pure planning/manifest helpers for optional seed images. Browser storage and image conversion stay
// in agentCbSeedAssets.ts because this step is the sole owner of the L3 asset boundary.

import { isSeedAssetRef, type SeedEntityDefinition, type SeedFieldValue, type SeedPlan } from '../../helpers/cbSeedsCore.js';

export const SEED_ASSET_SCHEMA_VERSION = 1;

export interface SeedAssetManifestEntry {
  id: string;
  path: string;
  publicUrl: string;
  source: 'imagem';
  promptHash: string;
  status: 'ready' | 'failed';
  warning?: string;
}

export interface SeedAssetManifest {
  schemaVersion: number;
  moduleId: string;
  assets: SeedAssetManifestEntry[];
}

export interface SeedAssetRequest {
  assetId: string;
  targetPath: string;
  path: string;
  publicUrl: string;
  alt: string;
  prompt: string;
  promptHash: string;
  format: 'webp';
  maxWidth: number;
}

const ASSET_ID = /^[A-Za-z][A-Za-z0-9_-]*\/[A-Za-z][A-Za-z0-9_-]*$/u;

export function emptySeedAssetManifest(moduleId: string): SeedAssetManifest {
  return { schemaVersion: SEED_ASSET_SCHEMA_VERSION, moduleId, assets: [] };
}

export function parseSeedAssetManifest(value: unknown, moduleId: string): SeedAssetManifest {
  if (!isRecord(value) || value.schemaVersion !== SEED_ASSET_SCHEMA_VERSION || value.moduleId !== moduleId || !Array.isArray(value.assets)) {
    return emptySeedAssetManifest(moduleId);
  }
  const assets = value.assets.flatMap((entry): SeedAssetManifestEntry[] => {
    if (!isRecord(entry) || !ASSET_ID.test(string(entry.id)) || typeof entry.path !== 'string' || typeof entry.publicUrl !== 'string'
      || entry.source !== 'imagem' || typeof entry.promptHash !== 'string' || (entry.status !== 'ready' && entry.status !== 'failed')) return [];
    return [{
      id: string(entry.id), path: string(entry.path), publicUrl: string(entry.publicUrl), source: 'imagem',
      promptHash: string(entry.promptHash), status: entry.status, ...(typeof entry.warning === 'string' ? { warning: entry.warning } : {}),
    }];
  }).sort((left, right) => left.id.localeCompare(right.id));
  return { schemaVersion: SEED_ASSET_SCHEMA_VERSION, moduleId, assets };
}

export function putSeedAssetManifestEntry(manifest: SeedAssetManifest, entry: SeedAssetManifestEntry): SeedAssetManifest {
  const assets = new Map(manifest.assets.map(item => [item.id, item]));
  assets.set(entry.id, entry);
  return { ...manifest, assets: [...assets.values()].sort((left, right) => left.id.localeCompare(right.id)) };
}

export function readySeedAssetUrls(manifest: SeedAssetManifest): Record<string, string> {
  return Object.fromEntries(manifest.assets
    .filter(asset => asset.status === 'ready')
    .map(asset => [asset.id, asset.publicUrl])
    .sort(([left], [right]) => left.localeCompare(right)));
}

export function seedAssetWarnings(manifest: SeedAssetManifest): string[] {
  return manifest.assets.filter(asset => asset.status === 'failed')
    .map(asset => `${asset.id}: ${asset.warning || 'image unavailable; seed value set to null'}`).sort();
}

export function collectSeedAssetRequests(moduleId: string, plan: SeedPlan, entities: SeedEntityDefinition[]): SeedAssetRequest[] {
  const entityById = new Map(entities.map(entity => [entity.entityId, entity]));
  const candidates: Array<{ assetId: string; entityId: string; rowKey: string; fields: SeedFieldValue[] }> = [];
  for (const table of plan.localTables) {
    for (const row of table.rows) candidates.push(...assetFields(table.tableId, row.key, [...row.columns, ...row.details]));
  }
  for (const entity of plan.mdmEntities) {
    for (const row of entity.rows) candidates.push(...assetFields(entity.entityId, row.key, row.fields));
  }
  const unique = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates.sort((left, right) => left.assetId.localeCompare(right.assetId))) {
    if (!unique.has(candidate.assetId)) unique.set(candidate.assetId, candidate);
  }
  return [...unique.values()].map(candidate => {
    const entity = entityById.get(candidate.entityId);
    const title = entity?.title || candidate.entityId;
    const description = describeSeedRow(title, candidate.rowKey, candidate.fields);
    const prompt = [
      'Create a realistic, original editorial image for a fictional example application.',
      `Subject: ${description}.`,
      'Square composition, natural light, no text, watermark, logo, brand, celebrity, or identifiable real person.',
    ].join(' ');
    const path = `seed/${candidate.assetId}.webp`;
    return {
      assetId: candidate.assetId,
      targetPath: `l3/${moduleId}/assets/${path}`,
      path,
      publicUrl: `/${moduleId}/assets/${path}`,
      alt: `${title} — ${candidate.rowKey}`.slice(0, 180),
      prompt,
      promptHash: `fnv1a32:${hash(prompt)}`,
      format: 'webp',
      maxWidth: 1200,
    };
  });
}

function assetFields(entityId: string, rowKey: string, fields: SeedFieldValue[]) {
  return fields.flatMap(field => {
    const value = field.value;
    return isSeedAssetRef(value) ? [{ assetId: value.asset, entityId, rowKey, fields }] : [];
  });
}

function describeSeedRow(title: string, rowKey: string, fields: SeedFieldValue[]): string {
  const details = fields.filter(field => /^(name|title|species|breed|type|color|description)$/iu.test(field.name))
    .map(field => typeof field.value === 'string' ? `${field.name} ${field.value.replace(/[\r\n<>]/g, ' ').slice(0, 80)}` : '')
    .filter(Boolean).join(', ');
  return details ? `${title}: ${details}` : `${title} identified by ${rowKey}`;
}

function hash(input: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, '0');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
