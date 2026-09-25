<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/usecase.md" enhancement="_blank" -->

# usecase

One planned operation. `functions[].functionName`, `input` and `output` are the
projection the L1 inventory reads. They are not a second DTO. Per-route output
lives in `routeProjections`. The usecase id and the route strings come from
the plan. No page id, HTTP, SQL or adapter import.

`sequence`, `uses`, `rules`, `rulePlan`, `transaction`, `lifecycle` and `mdm` are the
behavior `readUsecaseFidelity` reads back from the serialized file and its
dependency texts. `mdm.calls[]` is the facade plan: each call has an `id`, a
`when` list and an `origin` on every argument. `when` empty means the call
always runs. A `contract` origin is a path on this operation's input. A route contract that was not read is `MDM_CONTRACT_UNREAD`; the call that needs that argument is not emitted, and a missing field list is not treated as present. Evidence
`writePrecondition` means the ontology marks that path and the input carries
it; the field name is not the mark, and the plan does not read a newer version
after a conflict. A `prior` origin names earlier call ids; the first
that produced the field is the value. A later id is not a source. `ctx` is
context. The role tag is a literal. `register.createOrAttach` is find (only
when that input declares the arguments; `locate.byContact` on the role does
not add contact), then `create` only when those finds missed, then
`attachRole` using that `mdmId`. Optional document fields are a presence
condition, not an unconditional call. The calls are not one transaction.
`rulePlan` is the applicability decision: origin, consumer and
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
