# Seed assets

Reads `SeedAssetRef` values from the finalized `seeds.ts` plan. Each request is sent through the
configured image response route, then converted to a bounded WebP blob in L3. The step owns
`l3/{module}/assets/seed-assets.json`; it reuses a ready entry only when its prompt hash and file
still match. Image failures are recorded in that manifest and leave the seed field as `null`.
