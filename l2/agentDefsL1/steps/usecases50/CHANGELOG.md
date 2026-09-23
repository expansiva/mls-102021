# usecases50

## 2026-09-23 (d1_24)

- `boundary` comes from the same operation catalog as `source`. A repository operation admits `local`. An MDM operation admits no transaction step, so that branch is omitted. The schema does not offer `external`. The gate still refuses a reply that names it.

## 2026-09-23 (d1_23)

- `readUsecaseFidelity` re-reads persisted `integrationOutbound` defs. Naming `IQueueRuntime.publish` is `MECHANISM_INCOMPATIBLE`. A wrong path is `MECHANISM_REF`. `publishEvent` / `emitEvent` stay `FICTIONAL_API`. Empty mechanism is not treated as a missing API.

## 2026-09-23 (d1_19)

- `source` comes from the same operation catalog as the other step values. Every operation admits `ctx`. The schema does not offer `input`. The gate still refuses a reply that names it.
- A nested derived field on a list or get input is a filter, matched by its full path. `details.identification.status` is that case. `details.id` is not the identity field and stays a write. `version` on a read stays a write. Create, patch and a transition payload that assign a derived field stay refused.
- A derived path is not offered on a transition payload. `id` on `confirmarConsulta` is a selector of the input, not a payload value. A reply that still puts it in the payload is refused.

## 2026-09-23 (d1_18)

- The serialized usecase keeps the validated sequence, the selector, filter, concurrency and write uses, the MDM binding, the lifecycle payload, rule references, the transaction boundary and effect references. `rulesApplied` stays the id list the inventory reads. A rule reference is a path and a symbol. The rule text stays in the source file.
- `readUsecaseFidelity` reads the rendered `.defs.ts` and the dependency texts. It does not read the draft. A missing note payload, rule text, rule reference, MDM call, route projection or contract dependency fails with its own code. A rule id or a file count does not pass.
- The pipeline `dependsFiles` names the ontology, the contracts, the rule source and the integration source. A changed hash of one of those sources is the existing stale check.
- The same request renders the same bytes. The reader does not evaluate the file.

## 2026-09-23 (d1_17)

- A catalog this operation was given, including an empty one, is not a free string. An empty catalog omits that branch. A CRUD usecase does not offer `transition`. A usecase with no outbound event does not offer `effect`. An MDM role does not offer a repository port.
- A transition offers its own id and the payload paths the contract or the lifecycle payload already lists, including a nested path. An empty payload list is an empty array, not a free string.
- Port call is the operation, on that entity's port. MDM is one branch per facade method and capability the binding names, with that namespace and entity. A call from the facade catalog that this operation does not use is not in the schema.
- The step text and the tool are the same selection. The prompt does not list the facade catalog or a kind this operation cannot use.
- `parseWorkerReply` and the gate are unchanged. A reply that bypasses the schema is still refused there.

## 2026-09-23 (d1_16)

- An MDM plan names the facade method that executes the capability. `update` of platform fields is `entity.update` with `mdmId`, `expectedVersion` and the platform patch. It is not `attachRole`. The caller namespace is the same update, one version bump, because two updates would resubmit a stale version.
- `register.createOrAttach` is `findByDocument` (and `findByContact` when the role declares that lookup), then `create` for a new person, then `attachRole` for the role tag. An existing document skips `create`. The calls are not one transaction. No module repository is introduced.
- A list names each read: `get` and `findByDocument` are point lookups; `listByType` is a collection. The method is not chosen because it is called `read`.
- A namespace of another module, a call the facade does not have, a call the operation does not use, a missing write, and a CRUD transition are refused. `audit` and `statusHistory.read` stay unbound: the facade has no such method.

## 2026-09-23 (d1_15)

- Derived identity on a list or get input is a filter. On an update or transition input it is a selector. It is not assigned on create, on a patch, or in a transition payload. The field stays on the declared input; the gate does not delete it.
- Declared concurrency (`version`) is classified on its own. Freeing `id` does not free every derived field, and a name `id` or `*Id` is not enough without the entity, field, operation and contract path.
- A nested homonym is matched by its full path. A use that those sources cannot classify is `DERIVED_AMBIGUOUS` with that path. Unequivocal filter, selector and concurrency uses are recorded as normalizations.
- The d1_13g rule that kept `Derived field id` on every input is replaced by this classification. The review that held that rule is preserved.

## 2026-09-23 (d1_14)

- The worker prompt carries the operation's contract fields, rule text, lifecycle payload or MDM capability, port signature, access grants and effects. Module rule ids stay the catalog the gate uses to validate an id. The prompt does not list every module rule.
- A source is kept only when its hash still matches the approved snapshot. A missing or changed file is a finding and that usecase is not sent to the model.
- The assembled prompt, its size and those hashes are stored on the attempt. A repair sends the same business context and adds the refusal.
- A transition payload may name a nested path the contract or the lifecycle payload already lists. The contract source remains the type authority.

## 2026-09-22 (d1_13g)

- A type that differs across routes of one usecase is not a conflict. Each route projection keeps the fields that route declares. The function output keeps the name and does not store one of the types.
- Two types for the same field inside one route stay `TYPE_CONFLICT`. No cast is applied.

## 2026-09-22 (d1_13f)

- An exported `*Route` const whose value is the route string binds that route to `StemInput`/`StemOutput`. The `routes` map still binds by key. The first interface is not an identity.
- `projectFields` follows an array alias to its element type so a list output keeps the declared item fields.
- An unresolved projection records `PROJECTION_UNRESOLVED` with the route and the missing symbol. It is no longer silent.

## 2026-09-22 (d1_13e)

- `mdm.call` in the tool schema is an enum of `D1_MDM_CALLS`. `parseStep` still refuses any other call.
- A catalog known for that one usecase is an enum too: port id and port methods, module and entity rule ids, the entity id, the namespace when the ontology named one, the usecase id when it is a transition of that entity, and the outbound event ids declared for it. An empty catalog stays a string. `payload` stays a list of strings: the allowed names are contract inputs, not a constant. `boundary` and `source` were already enums.
- A unit still unresolved after the repair ceiling does not discard the units that parsed. Their defs are written. The draft keeps the unresolved usecase id with no definition. The checkpoint sets `awaitingStep` to `usecases50`, the step to `failed`, and `error` to `CODE:count`. `usecases50-done` is not minted. Waiting siblings close with `stopped:`. An operational failure still pauses and does not take a repair.

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
