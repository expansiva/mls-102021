# support70 — registry, access scope and seed plan

Deterministic. No LLM. No `prompt.md`. Three emitters: `emitRegistry` lists
live adapters, `emitScope` transcribes the grants controllers60 already
resolved, and `emitSeeds` writes the seed plan. All go through the d1_03
writer.

## Input

The step prompt is the entry10 JSON with `planId: support70`. The checkpoint
must already have `controllers60` approved, and `input.json` must have
released consumer phases. The controllers draft, the persistence draft, the
domain draft, the access artifact, the ontology index and the journeys are
read again. A previous support draft, when it parses, supplies the helpers
and the datasets already shared.

## Output

`drafts/support70.json` records the resolutions, the join helpers, the
registry and the seed plan. The defs are the closed records: `accessScope`,
`authorityMap`, `repositoryRegistration` and `persistenceSeeds`.

The registry names each live adapter's factory and depends on that adapter.
A removed adapter is not listed. Application defs do not depend on the
registry or on an adapter.

A grant is copied with the anchor the access artifact declared. A join is a
chain of relationships that name a field. A field is not inferred from an
`Id` suffix. The session on every resolution is `verified`. A form field is
not authentication.

An unknown grant and an anchor with no path are diagnoses. Neither becomes
`organization` or `public`. `ACCESS_ANCHOR` stays pending for the owner.
The anchor is not rewritten.

Helpers are records on the draft. They are not TypeScript. A helper with two
consumers stays when one consumer is removed. It goes away only when none
remain.

The publication list is the future `.ts` the materializer will still
register. `seedPlan.phase` is `plan` and `materialized` is false: the def
describes scenarios, and this step does not write `seeds.ts` or any row.
Effects stay a later emitter. Nothing is written under l5 or to a database.

A seed scenario comes from a journey that names the local entity, or from
the model when no journey does. Constraints cite the model's unique keys,
column relationships and the states that journey reaches. A note constraint
is added only when that journey's transition cites the note rule and the
model declares the field. MDM roles are dependencies with `seeded: false`.
They do not get a local table or another namespace. A ref is emitted only
for a relationship that names a column. A structured field, or a target
that is a role tag rather than the entity id, is an error.

Maintenance does not reseed or reset. Removing one owner of a dataset that
still has another owner keeps the dataset.

An enum is `consumed: true` only when every one of its values is cited as a
seed state (`ENUMERATIONS_CONSUMED`). Any other enum stays `consumed: false`
with `ENUMERATIONS_NOT_CONSUMED`.

A seed error sets `awaitingStep` to `support70` and `steps.support70.error`
to `CODE:count`. The step is `failed`, not `approved`.

`support70-done` is minted only when the build has no error. A file whose
receipt hash does not match the bytes on disk is not overwritten. The same
bytes are not rewritten.

## Reading rules

- Adapter identity is the port id persistence40 planned. The factory is that
  artifact id. The dependency is that adapter's pipeline id.
- Authority entries are the grants already on the scope. The map adds none.
- `preserve` does not rewrite. `remove` of a file that still has a live
  consumer recomposes it. A seed file with a remaining owner is kept.
  `conflict` and a mismatched receipt write nothing.
- Seed dependencies are the table ids persistence40 planned. A role tag is
  not an entity id.
