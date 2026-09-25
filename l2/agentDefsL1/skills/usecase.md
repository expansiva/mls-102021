<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/usecase.md" enhancement="_blank" -->

# usecase

One planned operation. `functions[].functionName`, `input` and `output` are the
projection the L1 inventory reads. They are not a second DTO. Per-route output
lives in `routeProjections`. The usecase id and the route strings come from
the plan. No page id, HTTP, SQL or adapter import.

`sequence`, `uses`, `rules`, `rulePlan`, `transaction`, `lifecycle` and `mdm` are the
behavior `readUsecaseFidelity` reads back from the serialized file and its
dependency texts. `rulePlan` is the applicability decision: origin, consumer and
enforcement (`local`, `delegated`, `pending`). A transition citation is `local`
on that transition. A write records `uniqueKeys` as its own `local` row with an
empty `ruleId` and consumer `operation:<operation>`. A module rule no transition
cites is `pending` `RULE_UNBOUND` on that write, and is not assigned to the
unique key. A read does not infer an actor or a route: a `rules[]` id that a
transition also cites is one `pending` `APPLICABILITY_UNDECLARED` row on
`operation:<operation>`. A platform rule with no structured method field is
`pending` `DELEGATION_UNPROVEN`. `rulesApplied` without that plan is not
coverage. Pending is not a step. A rule is a path and a symbol, not a copy of
the rule text. An effect names the integration source. It does not deliver the event.
