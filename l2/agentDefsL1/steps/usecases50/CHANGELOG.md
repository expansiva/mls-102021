# usecases50

## 2026-09-22 (d1_13d)

- `planUsecaseSteps` is an `anyOf` of one closed object per `kind`, built from `STEP_KEYS`. A branch requires only that kind's keys, and `kind` is `const`. `parseStep` is unchanged.

## 2026-09-22 (d1_13c)

- The human prompt and the system prompt list each step kind's keys from `STEP_KEYS`. `prompt.md` does not copy that list.
- The host completes a parallel parent without calling its afterPrompt. Repair is a barrier step that depends on `usecases50-fanout`. A worker still does not add a step.
- One repair per usecase (`D1_REPAIR_PER_UNIT` is 1) and eight repairs globally (`D1_REPAIR_GLOBAL_MAX` is 8). The repair trace starts with `Repair request:` and the stored `unitAttempts` is the repair count, not 0.
- A later barrier depends on the repair plan ids. It commits only when every unit parsed, and it closes the `usecases50` step.

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
