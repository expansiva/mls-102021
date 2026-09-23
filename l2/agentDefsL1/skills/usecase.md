<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/usecase.md" enhancement="_blank" -->

# usecase

One planned operation. `functions[].functionName`, `input` and `output` are the
projection the L1 inventory reads. They are not a second DTO. Per-route output
lives in `routeProjections`. The usecase id and the route strings come from
the plan. No page id, HTTP, SQL or adapter import.

`sequence`, `uses`, `rules`, `transaction`, `lifecycle` and `mdm` are the
behavior `readUsecaseFidelity` reads back from the serialized file and its
dependency texts. A rule is a path and a symbol, not a copy of the rule text.
An effect names the integration source. It does not deliver the event.
