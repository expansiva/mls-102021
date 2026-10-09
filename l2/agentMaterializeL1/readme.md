# agentMaterializeL1

New L1 backend materializer, built from `mls-102047/materializadorL1.md` (briefing of 05/10/2026). It reads the
defs v2 that `agentDefsL1` produces and generates the backend code; it decides no business and invents no field,
route or rule. The recipes are copies of `agentMaterializeL1` in `emitters/` (this agent imports nothing from it).

Invocation, as `agenteMaterializeL22`; the project is the current one:

- `@@agentMaterializeL1` — every l1 module of the project that has defs;
- `@@agentMaterializeL1 {"scope":"comandaRestaurante"}` — the whole backend of the module, every phase, then the
  l5 registration and the report. A deeper prefix (`comandaRestaurante/layer_2_application/usecases`) selects only
  those units and does not register;
- `@@agentMaterializeL1 {"target":"_102047_/l1/comandaRestaurante/layer_2_application/usecases/createMesa.defs.ts"}`
  — one unit (its `.defs.ts` or its `.ts`), regenerated regardless of reuse;
- `"force": true` next to a scope regenerates reusable units and overwrites outputs this agent did not write.

A unit that is not selected is only read as a dependency. Spec: `flow.json`.

## Flow

Per module: `domain10 → persistence20` (recipes) `→ usecases40 → requests50` (model) `→ controllers30` (recipe; it imports the request service, so it compiles after it) `→ tests60` (model) `→ register70 → finalize80`. The numbers are names, not the order.
(only the selected layers; register only for a whole-module run), modules one after the other.

| step | LLM | writes |
|---|---|---|
| domain10 | no | entities, value objects, ports, access scope, authority map |
| persistence20 | no | tables, repository adapters, registration, seeds (outbound without mechanism = declared gap) |
| usecases40 | always (one worker per usecase, recipe attempt as draft) | usecases |
| requests50 | always (one worker per page, from the contract JSDoc) | request services |
| controllers30 | no | controllers (read only the request-service def, the contract and the scope) |
| tests60 | one worker per page whose controller and request service are ready | `<controllers>/<pageId>.test.ts` in the monitor format (`export pageTests`) |
| register70 | no | `l5/project.json` backend of the module (copied reconcileL5) + `backend.pageTests` |
| finalize80 | no | `pipeline/agentMaterializeL1/report.json` and the summary |

## Guarantees

- A type the recipe derives only sometimes always goes to the model (05/10/2026): usecases and request
  services. Domain, persistence and controllers are recipes.

- Writes stay in memory: each file is registered with `mls.stor.addOrUpdateFile` and serves its bytes through
  `getContent`. No libStor, no `localStor.setContent`, no editor model; the Studio saves.
- Proof is the Studio compiler, l1 included: the model comes from `libModel.createModel` (the Studio's own l1 path)
  and `mls.l2.typescript.compile` runs under a 60 s deadline. Compiler errors fail the unit and feed the repair of
  a model unit. A worker that stops answering trips a breaker: the rest of the run ends `done COMPILE_UNAVAILABLE_L1`
  with the cause, and the l5 registration stays at phase `structure`.
- Never silent: a rule of the rulePlan that the generated code does not name blocks the unit (`RULE_NOT_EMITTED`);
  every unit ends with a status file (`done`, `reused`, `blocked`, `gap`, `failed`, `skipped`), a code and a
  diagnostic, and the report lists every one that is not generated.
- Reuse: same inputs and untouched outputs → nothing is written and no model is called.

## Layout

`agentMaterializeL1.ts` (root, deterministic), `helpers/` (core, names, io, units, compile, materialize, gates,
intents, worker, phase), `steps/<step>/` (agents, prompts, context), `emitters/` (copied recipes).

Tests: `node scripts/run-tests.mjs mls-102021 l2`. The bench test runs the deterministic flow over
`mls-102047/l1/comandaRestaurante` with an in-memory stor and a byte-checking compiler.
