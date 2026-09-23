# controllers60 — one controller per page

Deterministic. No LLM. No `prompt.md`. `buildD1Controllers` reads the
selection, the usecase draft, the access artifact and the page contracts.
It writes one http controller def per page through the d1_03 writer.

## Input

The step prompt is the entry10 JSON with `planId: controllers60`. The
checkpoint must already have `usecases50` approved, and `input.json` must
have released consumer phases. Contracts, grants, page actors and
relationships are read again. A controller file already on disk is parsed,
not evaluated.

## Output

`drafts/controllers60.json` is the binding. Each handler names the usecase
function and the input/output symbols of its own route. The projection lists
the fields of that symbol. A list result keeps the array shape the contract
declared. The transport envelope is `passthrough`.

The def itself stays the closed httpController record: `pageId` and
`handlers` of `route`, `kind`, `usecaseId`, `grantIds`. The route string is
the one the pool published. The pipeline depends on the usecase defs. It
does not import L2.

The scope plan (anchor, disclosure, declared relationships) is on the draft
for support70. An anchor that contradicts a required relationship stays
pending. Nothing is joined by a field suffix, and L4 is not rewritten.

`controllers60-done` is minted only when the build has no error. The same
bytes are not rewritten.

## Reading rules

- A route matches by exact string. A missing usecase or a missing contract
  keeps the route and records the gap.
- Grants are the page actor's grants for that entity. A grant of another
  page is a union and is refused. An operation with no grant is
  `AUTHORITY_REQUIRED`. There is no public fallback.
- `fieldsOnly` matches by path (`Entity.a.b`), not by the last segment.
  A container is not a violation when a grant discloses a sub-path: the
  projection keeps those sub-paths and does not keep the container. A
  named branch covers its descendants. A path the grant does not name
  stays `DISCLOSURE`. `fullRecord` keeps the declared fields whole. A
  container whose nested shape cannot be read is not released.
- A form field named `actorId` is not the session. The session is verified.
- A route bound by a type assertion is not a projection.
- A done route keeps the handler already on disk. Updating another route of
  the same page recomposes the file around those handlers.
- An extra route in an existing file is `STALE_ARTIFACT`. The file is not
  overwritten.
- Domain enumerations stay `consumed: false` with `ENUMERATIONS_NOT_CONSUMED`.
