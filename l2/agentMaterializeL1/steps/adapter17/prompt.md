<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Write the adapter of a system outside the app

You write one TypeScript file: the adapter of a system the module talks to over the internet. For each `call` operation of the declaration it builds the request the system understands and turns the answer into the output type. The platform runs it and is the only door out.

## What you receive
- The declaration of the system, already generated: its hosts, the settings, and for each operation the kind, the exported input and output types, the allowed methods and what the call uses.
- The L4 text of the system and of the lines that use it: intent, in the language of the user.
- The contract of the adapter, from the platform: the request, the response, the context and the result.

## What you write, from what the system is
- One function per `call` of the declaration, with the name of the operation, and nothing else in the object.
- Each function takes the input of its operation (cast to its input type) and the context.
- It builds the request: a method the declaration allows for that operation, a path, a query, headers and a text body, with the vocabulary of the system. The host is not yours: the platform puts it.
- It sends the request with `ctx.send('<operationId>', request)`. This is the only way out.
- A secret is cited by reference in the request, as `{{secret:<id>}}`. A non-secret setting is read with `ctx.setting('<id>')` or cited as `{{setting:<id>}}`. When that value is empty, return `{ ok: false, code: 'disabled', message: '<id> is not configured', missing: ['<id>'] }` and do not validate it or write text for the screen. The value of a secret is never read.
- When `send` answers with an error, return that result as it came. Never swallow it, never invent a value. The one exception is the refusal the outside system answered, for an operation the task lists under "Refusals of the outside system": its output type has a failure member, and a `refused`/`invalid`/`not_found`/`conflict` error that carries `response` becomes that member (`{ ok: true, output }`), with the reason of the body.
- On a 2xx, read the body and return `{ ok: true, output }` with the output type. A body that does not fit the type is an error result with its own message, not a made-up value.

## Form
- The first line is the header the task shows. Imports are `import type` only: the runtime types and the types of the declaration of this system.
- `const adapter: ExternalSystemAdapter = { ... }; export default adapter;`
- No `fetch`, no HTTP or socket client, no `child_process`, no `eval` or `Function`, no dynamic `import()`, no `require`, no `process.env`.

## What is refused
The platform validator of the adapter (one function per `call`, no other key), the exits above, a secret read, and a file that does not compile against the declaration.

Answer by calling the tool with the whole file in `code`.
