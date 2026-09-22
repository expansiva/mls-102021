# usecases50

## 2026-09-22 (d1_13b)

- The fan-out parent carries the interaction `agentNewSolution5` `parallelEntityStep` gives its parent: system `<!-- modelType: reasoning -->`, cost 0, one queue trace, payload null, status `in_progress`. A parallel child `update-status` is refused when that parent has progress and no interaction.
- The worker system prompt keeps `<!-- modelType: reasoning -->`. The skill comment is still removed. The step prompt is not.

## 2026-09-22 (d1_07b)

- Contract types are read in the agent, without importing `typescript`.
- An exported declaration that does not close is `CONTRACT_UNPARSED` on the contract path.
- Exported routes, interfaces, type aliases, fields and optional markers stay the same.

## 2026-09-21 (d1_06)

- One worker per selected usecase, at most 5 at once. The model plans steps only.
- Ids, routes and contract symbols stay mechanical. The contract AST binds a route, not a type name.
- Enum values stay on the domain draft (`ENUMERATIONS_NOT_CONSUMED`).
- One repair per usecase, eight globally. An operational failure does not retry.
