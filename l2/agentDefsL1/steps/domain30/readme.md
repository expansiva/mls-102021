# domain30 — models and lifecycle

Deterministic. No LLM. No `prompt.md`. One worker, `buildD1Domain`, reads the
L4 record tree and writes domain defs through the d1_03 writer.

## Input

The step prompt is the entry10 JSON with `planId: domain30`. The checkpoint
must already have `input20` approved, and `input.json` must have released
consumer phases. Ontology bodies are read again by entity id. A catalog is
opened only at the `source` path an entity names.

## Output

`l1/<module>/pipeline/agentDefsL1/drafts/domain30.json` records the plans,
problems, mechanical normalizations and the bytes that were eligible to write.
Domain files are `layer_3_domain/entities/<lowerFirst>.defs.ts`. A value object
is written only when a record reference names that nested object. Nested fields
that nothing else names stay on the entity.

`domain30-done` is minted only when the build has no error. The same bytes are
not rewritten. A `preserve` file and every file this step does not own stay as
they were.

## Reading rules

- `record.fields` is the v3 map, walked depth first. An NS4 field list is a
  problem. It is not converted.
- A `record` field uses `to` when that list has one id. `of` is not a target.
  A name ending in `Id` is not a target. Zero or several targets are problems
  and nothing is chosen.
- A structural cycle in those record targets is a problem. Nothing in the
  cycle is written.
- Two outputs that share a def path or a field path are a name collision.
  Nothing is written.
- Module rule ids match the module rules artifact exactly. A rule on no
  transition, or on every transition, is an invariant. A rule on only some
  transitions stays on those transitions and is referenced for application.
  It does not become a read.
- A rule id that is a key of the source catalog keeps that spelling and that
  owner. It is not copied into invariants and it is not matched to a different
  spelling in the module artifact.
- `reachedBy: time` is kept. A transition that writes that state is refused.
  The state no transition reaches, ignoring time states, is the derived initial
  state.
- A role is `mdm`. This step writes no table, repository or adapter. A plan
  table for a role is an error.
- Enum values, including a single business value, stay on the draft. The
  definition field stays `type: enum`. The field schema is not extended.
