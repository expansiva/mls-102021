# usecases50 — one operation per selected usecase

The dispatcher launches one worker per selected usecase (`parallel_dynamic`,
at most 5). A worker returns operation steps. It does not choose ids, routes
or type sources, and it does not write TypeScript.

## Input

The step prompt is the entry10 JSON with `planId: usecases50`. The checkpoint
must already have `persistence40` approved. `input.json` must have released
consumer phases. The domain draft, the persistence draft, the module rules,
the integration events and every page contract are read again.

A worker prompt is compact JSON: `planId`, `moduleName`, `project`,
`usecaseId`, `attempt`, `unitAttempts`, `globalAttempts`.

## Output

`drafts/usecases50.json` is the build. `drafts/usecases50-work.json` is the
mechanical packet the workers read. Each attempt is
`traces/usecases50-<usecaseId>.json`.

One usecase def is written per selected usecase when the build has no error.
`usecases50-done` is minted only then. The same bytes are not rewritten.

## Reading rules

- The usecase id, the entity, the operation and the route strings come from
  the selection. A route matches by exact id.
- Every page contract that serves the usecase is read. A type is used only
  when that page's `routes` map binds the route string to a symbol. The first
  interface, and a symbol whose name matches the usecase, are not an identity.
- Two pages keep one usecase. Each route projects its own output. The
  function output may be wider. A field is not copied onto a route that does
  not declare it. Two types for one field are a conflict, not `any`.
- `data.functions` is the inventory projection (`functionName`, `input`,
  `output`). It is not a second DTO.
- Application depends on the domain and, when the entity is module-database,
  the repository port. It does not import an adapter. MDM is `ctx.mdm` under
  the namespace the ontology already names.
- A transition payload may name only contract inputs. A derived field is not
  an input. A rule id that is not in the module or the platform catalog is
  unresolved.
- Outbound effects are kept by id even when the reply omits them. The
  omission is a finding.
- Two or more writes need one local transaction boundary. An external
  boundary is not atomic.
- Domain enumerations (`path` + `values`) are not copied. The projection has
  no values slot, and the contract AST is the type authority. They stay
  `consumed: false` with `ENUMERATIONS_NOT_CONSUMED`.

## Repair

One repair per usecase. The global ceiling is 8. The host completes the
fan-out parent without calling its afterPrompt, so the barrier is its own
step and depends on `usecases50-fanout`. The barrier adds the repair step.
A worker does not add a step. The repair prompt repeats the refused trace.
`unitAttempts` on that repair is 1, which is the per-unit ceiling. An
operational failure (no reply) pauses with a trace and does not take a
repair. A missing trace is still named. A later barrier depends on the
repair plan ids and commits only when every unit parsed.
