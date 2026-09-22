# agentDefsL1

L1 defs agent. CLI, project identity, resume, the input20 inventory, the
domain30 defs, the persistence40 defs and the usecases50 plans. usecases50
is the step that calls a model, and only for operation steps. A step that is
only declared in `docs/flow.json` reports that it is not implemented.

## Invocation

```
@@agentDefsL1 <lowerCamel> /run
@@agentDefsL1 <lowerCamel> /resume
@@agentDefsL1 <lowerCamel> /help
```

`/help` writes nothing. `/run` records a checkpoint when the module has none
in this project. `/resume` continues an intact checkpoint and does not rewrite
it. A second `/run` of an intact checkpoint is the same no-op.

The project id is `mls.actualProject`, captured once on the task
(`longTermMemory.project`). Later hooks use that value. The same module name
in another project is a different module.

## Refusals

English, no model, no writes:

- missing module, or a module token that is not lowerCamel
- missing project identity
- more than one command, an unexpected argument, or an unknown flag (`/fast`, `/rebuild` without `all`, `/candidates`)
- `/candidate`, including `/candidate tobe/plan` — same flag spelling as the L1 planner, refused here. Nothing is pointed at `tobe`
- `/candidate` with `..` — `Candidate path must not contain '..'.`
- any other `..` — `Path must not contain '..'.`
- `/rebuild all` — same flag spelling as agentNewSolution5, refused. Nothing is deleted
- `/resume` without an intact checkpoint
- a checkpoint that does not parse, or that belongs to another flow, project or module
- a step prompt that carries a field this step does not know (`candidate` is not dropped)

## Write surface

| path | this delivery |
|---|---|
| `l1/<module>/pipeline/agentDefsL1/pipeline.json` | written on the first `/run` |
| `l1/<module>/pipeline/pipeline.json` | planner file. Never written or removed |
| `l1/<module>/pipeline/agentDefsL1/input.json` | written by input20. Same bytes are not rewritten |
| `l1/<module>/pipeline/agentDefsL1/drafts/domain30.json` | written by domain30. A draft does not approve a step |
| `l1/<module>/pipeline/agentDefsL1/drafts/persistence40.json` | written by persistence40. A draft does not approve a step |
| `l1/<module>/pipeline/agentDefsL1/traces/<step>.json` | reserved |
| `l1/<module>/pipeline/agentDefsL1/report.json` | reserved for finalize80 |

Checkpoint reads and writes use `pipelineFile(project, module)`. Domain defs use
`artifactFile`, the same identity input20 uses. A remove of the planner file is
refused. domain30 and persistence40 write `.defs.ts` only. They do not write `.ts` outputs.
l4, l2, l5 and the pool are not written.

The display path includes the project: `_102047_/l1/<module>/pipeline/agentDefsL1/pipeline.json`.

## Resume metadata

Stored on the checkpoint and on the task: `project`, `moduleName`, `flowId`,
`flowVersion`, `schemaVersion`, `command`, `steps.entry10.status`,
`steps.entry10.artifactPaths`, `updatedAt`.

Intact means the file parses, those identities match the invocation, and
`entry10` is `approved` with its own artifact path. Resume then writes zero
bytes. A duplicate or late hook cannot move `entry10` off `approved` and
cannot move `awaitingStep` forward.

`input20` records the inventory and does not generate `.defs.ts`. It approves
itself and mints `input20-done` only when consumer phases are released. A missing
contract or a missing required source keeps the checkpoint where `entry10` left
it and says the phases are not released.

`domain30` writes one domain def per selected entity that is not `preserve`, and
a value object only when a record reference names it. It approves itself and
mints `domain30-done` only when the build has no error. The same bytes are not
rewritten.

`persistence40` writes one port, one table and one adapter per planned
module-database item. `uniqueKeys` come from the domain draft. Enumerations
stay on that draft. It approves itself and mints `persistence40-done` only
when the build has no error. The same bytes are not rewritten. It does not
write seeds or the repository registry.

`usecases50` writes one usecase def per selected usecase. A worker plans the
operation steps. Ids, routes and contract symbols stay mechanical. Enum
values stay on the domain draft. `controllers60` through `finalize80` are
declared and not implemented. Reaching one sets `pipeline.status` to
`awaitingStep` and the trace `step <id> not implemented yet`.
That is not success. The task step is completed so the run does not fail; the
trace and the checkpoint say the step does not exist yet.

## Defs contract

Schema `2026-09-21-d1-definition-v1`. The first data export is `definition`
(`schemaVersion`, `artifactType`, `artifactId`, `moduleName`, `data`). The
second is `pipeline`. There is no `status` field and no `agent`. A collision
of path, id, route or output is refused before `writeText`. The file identity
is `artifactFile`, which uses the same `fileInfoFromDisplay` as input20.
Nothing is stripped to make a document pass.

`readL1Inventory` reads `usecase`, `repositoryPort`, `table` and
`httpController`. For a table it uses `data.tableId` and `artifactId` as the
entity, so `data.entityId` must equal `artifactId`. Function `input`/`output`
are a projection (`name`, `type`, `fieldRef`), not a second DTO.
`handlers.route` is the route string from the plan.

| artifactType | file under `l1/<module>/` | export |
|---|---|---|
| domainEntity | `layer_3_domain/entities/<lowerFirst>.defs.ts` | `definition` |
| valueObject | `layer_3_domain/value-objects/<id>.defs.ts` | `definition` |
| repositoryPort | `layer_2_application/ports/<entity>Repository.defs.ts` | `definition` |
| table | `layer_1_external/adapters/persistence/<tableId>.defs.ts` | `definition` |
| repositoryAdapter | `layer_1_external/adapters/persistence/<entity>RepositoryAdapter.defs.ts` | `definition` |
| usecase | `layer_2_application/usecases/<usecaseId>.defs.ts` | `definition` |
| httpController | `layer_1_external/adapters/http/controllers/<pageId>.defs.ts` | `definition` |
| accessScope | `layer_2_application/scope/accessScope.defs.ts` | `definition` |
| authorityMap | `layer_1_external/auth/authorityMap.defs.ts` | `definition` |
| repositoryRegistration | `layer_1_external/adapters/persistence/registerRepositories.defs.ts` | `definition` |
| persistenceSeeds | `layer_1_external/adapters/persistence/seeds.defs.ts` | `definition` |
| integrationOutbound | `layer_1_external/adapters/integration/outbound.defs.ts` | `definition` |

`export default definition` points at that object. Pipeline item fields are
`id`, `type`, `defPath`, `outputPath`, `outputAvailability`, `dependsFiles`,
`dependsOn`, `skills`, and `routes` on a controller. `id` is
`project/module/type/owner`. `outputAvailability: future` is the `.ts` the
materializer does not write in this delivery. A `.d.ts` with no item
`outputPath` is an uncontracted declaration. A path that is neither a planned
def, a present file nor a declared output is a missing input.

Every property in the three schemas has a reader in `D1_FIELD_READERS`.
Auxiliary types (`valueObject`, `accessScope`, `authorityMap`,
`repositoryRegistration`, `persistenceSeeds`, `integrationOutbound`) are not
dispatched by agentChangeBackend. A value object with an empty `referencedBy`
is not emitted. The agendaClinica example records that absence instead of a
file.

The design forecast of 26 is 5 models, 1 port, 1 table, 1 adapter, 13 usecases
and 5 controllers. The measured plan fixture has 6 controllers, so the same
core categories sum to 27, plus 5 justified auxiliaries (32 planned defs).
That sum is not a count of files this agent generated. usecases50 writes the
usecase defs. Controllers, access, seeds and integration are still later steps.

## Flow

`docs/flow.json` is the contract. Done-anchors (`<step>-done`) unlock the next
step. Fan-out, worker and repair ids are reserved (`<step>-fanout`,
`<step>-worker-<itemId>`, `<step>-repair-<n>`). One repair per unit, eight
attempts globally, and finalize80 does not open another repair cycle. Child
hooks do not create a task and do not add steps. `update-status` cleans with
`input_output`.

This flow never dispatches `agentCbMaterialize`, `agentChangeBackend` or
`agentChangeFrontend`.
