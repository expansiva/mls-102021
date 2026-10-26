# resolve25 — the open parts of the contract routes

Between `input20` and `domain30` (d1_62). The input20 derivation (`input20/deriveRequest.ts`) reads each
contract route from its types, the ontology and L4. What it cannot decide is a gap with closed candidates,
computed by code, and `none` last. This step asks the model only for those gaps.

## Input

The step prompt with `planId: resolve25`. `input20` approved and `input20.json` present. The sources are read
with `readD1InputArtifacts`, the same loader as input20, and their `d1SourceKey` must equal the `sourceKey` of
`input20.json`; otherwise the step stops and writes nothing.

## Flow

- No gap: `resolve25.json` with no route and `llmCalls: 0`, then `resolve25-done`. No model call.
- Gaps: one worker per route (`resolve25-worker-r<n>`) on `helpers/d1Fanout.ts`, the fan-out, barrier and
  repair usecases50 also uses. The prompt carries the route JSDoc, the input and output types with the
  interfaces they name, the rules, and the gaps. The tool `resolveRouteGaps` has one `enum` per gap.
- The gate (`checkResolveReply`) accepts only a candidate for every gap. Otherwise the barrier opens one
  repair with the refusal; after it, a gap without an accepted choice is `none`. An operational failure
  pauses.

## Output

`l1/<module>/pipeline/agentDefsL1/resolve25.json`: `sourceKey`, `llmCalls`, and per route the answers
(`path`, `kind`, `choice`, `call`). `call` is the plan id that gave the choice, empty for `none` without an
accepted answer. `/resume` (and a second `/run`) keeps a receipt with the same source key and calls no model.

Then the step builds the final inventory, `input.json`, through the same `buildD1InputSnapshot` with the
answers (`answersByRoute`) and the `input.json` of the run before as previous, so a def already written for a
usecase an answer brought keeps its inventory. When that inventory does not release the consumer phases, the
step is held (`awaitingStep: resolve25`, the codes on `steps.resolve25.error`), as input20 holds. `domain30`
needs `resolve25` approved.
