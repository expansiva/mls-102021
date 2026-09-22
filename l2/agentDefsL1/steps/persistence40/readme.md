# persistence40 — ports, tables and adapters

Deterministic. No LLM. No `prompt.md`. One worker, `buildD1Persistence`, reads
the domain30 draft and the L4 record and writes persistence defs through the
d1_03 writer.

## Input

The step prompt is the entry10 JSON with `planId: persistence40`. The checkpoint
must already have `domain30` approved, and `input.json` must have released
consumer phases. Ontology bodies are read again by entity id. An external
catalog is opened only at the `source` path an external entity names, and it
is not written.

## Output

`l1/<module>/pipeline/agentDefsL1/drafts/persistence40.json` records the plans,
the unique keys taken from the domain draft, and the enumerations that were
not copied. Domain enumerations (`path` + `values`) have no slot on `table` or
`repositoryAdapter`. They stay on the domain draft. `uniqueKeys` are copied
onto `table.data.uniqueKeys` and onto the unique index.

Files are one repository port, one table and one adapter per planned
module-database item. A preserved port is not rewritten. A preserved port that
does not implement a selected operation is a `PORT_INCOMPATIBLE` error and
nothing is written. MDM, derived and external entities do not get a local
table, port or adapter. Seeds and the repository registry are not written.

`persistence40-done` is minted only when the build has no error. The same
bytes are not rewritten.

## Reading rules

- The physical name is `storage.table`, verbatim. A second citation that
  differs is `DIVERGENT_BINDING`. Nothing is snake-cased or pluralized.
- The adapter cites the logical `tableId`, not a second physical name.
- `id` stays the logical primary-key column. A row `version` that is not
  indexed stays the logical field inside the runtime `details` JSONB column.
  It is not the table schema version.
- Indexed fields and unique-key fields are columns named by the logical path.
  Every other leaf is `json:<logical path>`. The mapping round-trips.
- Methods are the selected operations (`create`, `list`, `update`,
  `transition`, `delete`). The adapter lists the same methods. An unknown
  operation is an error. An NS4 field list is not converted.
