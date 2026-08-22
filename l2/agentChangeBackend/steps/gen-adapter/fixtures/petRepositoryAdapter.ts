/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/fixtures/petRepositoryAdapter.ts" enhancement="_blank"/>

// Real petShop adapter (mls-102047 petRepositoryAdapter.ts). JSON.parse(row.details) on a JSONB
// column: pg returns an object, parse throws, mute catch empties every field on read.

export const PET_ADAPTER_DEFECT = String.raw`function parseDetails(row: PetRow): PetDetails {
let parsed: Partial<PetDetails> = {};
try {
parsed = (JSON.parse(row.details ?? '{}') ?? {}) as Partial<PetDetails>;
} catch {
parsed = {};
}
return { ...detailsDefaults(), ...parsed };
}`;
