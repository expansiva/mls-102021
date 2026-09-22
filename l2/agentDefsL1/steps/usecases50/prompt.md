<!-- mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# usecases50

Plan the operation steps for the one usecase named in the human message. Its id, entity, operation, routes, port, rules, effects and namespace are already fixed. You do not choose them.

Return only the `planUsecaseSteps` tool.

Do not write TypeScript. Do not invent a field, a rule, an operation, a route, a type name or an event id.

A transition payload may name only input fields the contract already lists. Do not add a field because a rule sounds like it needs one.

When the operation writes more than once, return one step with boundary `local`. Do not promise that an external effect is atomic.

Name MDM with the namespace you were given. Do not call a repository for an MDM role, and do not import an adapter.

Authorization is `ctx`. Do not take an actor id from the input.

A declared outbound effect stays in the steps, under its id. Do not drop it and do not replace it.
