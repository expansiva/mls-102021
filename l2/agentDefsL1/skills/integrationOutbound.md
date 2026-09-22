<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/integrationOutbound.md" enhancement="_blank" -->

# integrationOutbound

Outbound events the plan already named. `consumer` is the usecase id on `on`.
An empty `mechanism` stays on the event and is reported as unbound.
`RequestContext` has no `publishEvent` or `emitEvent`. The measured publish
symbol is `IQueueRuntime.publish` on `RequestContext.data.pgQueue`. Copy it
only when the artifact already names it. Do not call it, and do not add a
scheduler, broker, outbox, or endpoint.
This type is not dispatched by agentChangeBackend.
