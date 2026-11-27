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
  — one unit (its `.defs.ts` or its `.ts`). A unit without a model (recipe) is regenerated. A **model unit** that has an output
  answers in one line (d1_329): `reused` (nothing moved), `kept` (only a dependency moved and the file compiles against it:
  only the receipt changes, cost zero), `repaired` (only a dependency moved and the file does not compile or passes no gate:
  the file on disk goes to the existing repair) or `generated` (the def or the L4 moved, the receipt has no `inputParts`, or `force`).
  A target alone is **not** `force` for a model unit any more: over a valid, stamped receipt it does nothing. A recipe whose fix is
  in the text of the generator (not in a dependency) must say `"force": true` in the recipe;
- `{"target":"…","asserted":true}`: for a model unit whose receipt has no `inputParts` (it could not be stamped), the operator asserts that its def and L4 did not move (the recipe proves it with `git diff` of the defs and the L4 between the two commits); the unit goes through keep/repair and answers `kept (asserted)` or `repaired (asserted)`. Refused together with `force`, or without `target`;
- `@@agentMaterializeL1 {"stamp":true,"scope":"<module>"}` (add `"dry":true` to only count) writes `inputParts` into the receipts
  of the model units (external, adapter, usecases, workflows, requests) whose receipt hash equals the hash of their inputs now; nothing else,
  no model, no output touched. A receipt that does not match is listed and stays as it is (the unit generates from scratch on a target).
  Run it where the receipts were made (old contracts still in place), before the dependencies change;
- the same `target` for a def that no longer exists (d1_252) removes the `.ts` this agent wrote for it, and its status file, when the bytes are still
  the recorded ones; a file edited by hand stays and is reported `ORPHAN_EDITED`;
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

- Writes persist on the collabmsg path: a new or deleted file is `createStorFile(..., false, false, false)`
  (no editor model); an existing file is `localStor.setContent`. This session still serves those bytes.
- Proof is the Studio compiler, l1 included: a missing model is created by the canonical Studio path (`getStudioModel` / `file.getOrCreateModel`)
  and `mls.l2.typescript.compile` runs under a 60 s deadline. Compiler errors fail the unit and feed the repair of
  a model unit. A worker that stops answering trips a breaker: the rest of the run ends `done COMPILE_UNAVAILABLE_L1`
  with the cause, and the l5 registration stays at phase `structure`.
- Never silent: a rule of `rulesApplied` that the generated code does not name blocks the unit (`RULE_NOT_EMITTED`);
  every unit ends with a status file (`done`, `reused`, `blocked`, `gap`, `failed`, `skipped`), a code and a
  diagnostic, and the report lists every one that is not generated.
- Reuse: same inputs and untouched outputs → nothing is written and no model is called.

## Layout

`agentMaterializeL1.ts` (root, deterministic), `helpers/` (core, names, io, units, compile, materialize, gates,
intents, worker, phase), `steps/<step>/` (agents, prompts, context), `emitters/` (copied recipes).

Tests: `node scripts/run-tests.mjs mls-102021 l2`. The bench test runs the deterministic flow over
`mls-102047/l1/comandaRestaurante` with an in-memory stor and a byte-checking compiler.

## The smoke and the `complete` (d1_333)

A module is `complete` only when its smoke says so. The smoke cannot run inside the agent (child process, `tsx`, `git`): `testing/smoke/smokeCli.ts` runs it and writes
`l1/<module>/pipeline/agentMaterializeL1/smoke.json`; finalize80 reads it. Without the file the report is `partial` with `SMOKE_PENDING`; with receipts or contracts that are not the
ones the smoke ran on, `SMOKE_STALE`; with a block, `SMOKE_BLOCKED` and the cases. What blocks: a 5xx or 501, an exception, an output outside the contract type, and a difference against
the commit that last delivered a `smoke.json` without a block. What does not: a refusal alone, the arrivals (`serve`, report only), a case that could not be built (`skipped`, listed).

Procedure (the owner of the module):
1. materialize: `@@agentMaterializeL1 {"scope":"<module>"}`; the report says `SMOKE_PENDING` or `SMOKE_STALE`.
2. smoke: `cd mls-102021/l2 && TSX_TSCONFIG_PATH=<base>/test/tsconfig.runtime.json <base>/node_modules/.bin/tsx --import <base>/test/register-hooks.mjs --import <base>/test/setup-l2.ts agentMaterializeL1/testing/smoke/smokeCli.ts <module> <repository mls-102047> --write`
   (a difference made on purpose is accepted one by one: the BLOCK line prints the exact text of the case; add `--accept "<case>" --reason "<why this one changed, 20 characters or more>"` for each one that is on purpose, in the same line, and `--by <name>`. There is no "accept all": a difference you do not name keeps blocking. One entry per exact difference in `smokeAccepted.json`.)
3. run the scope again (every unit is reused): the report is `complete`; commit the module with `smoke.json` and `smokeAccepted.json` (the commit is what the next smoke compares against).
