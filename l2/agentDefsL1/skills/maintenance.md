<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/maintenance.md" enhancement="_blank" -->

# agentDefsL1 maintenance protocol

Before changing orchestration, read `docs/flow.json` and the canonical references
it names. Change the flow before the code.

Rules:

1. `docs/flow.json` is the contract. A step listed there and not implemented stops
   the run with `awaitingStep` and a trace that says it is not implemented.
2. A step owns its gate, tests, readme and changelog under `steps/<step>/`.
   Prompts are markdown files and appear only when a step calls a model.
3. Shared helpers are dispatch, stor and checkpoint mechanics. They do not own
   domain, SQL, access or prompts.
4. Every file this agent reads, writes or removes is built by one function
   (`pipelineFile` for the checkpoint). Do not delete by a literal folder while
   writing through another root.
5. Project and module are part of the file identity. Do not re-read
   `mls.actualProject` inside a later hook.
6. An approved step is monotonic. A duplicate or late callback must not rewrite
   an intact checkpoint.
7. A done-anchor unlocks the next step. A file under `drafts/` is not approval.
8. Child hooks never create a task and never add steps. They complete with a trace.
9. Repair is one attempt per unit and at most the global ceiling in `flow.json`.
   finalize80 does not start another repair cycle.
10. `update-status` uses cleaner `input_output`. Do not clean a clarification
    that is still pending.
11. Do not dispatch `agentCbMaterialize`, `agentChangeBackend` or
    `agentChangeFrontend`.
12. User-facing text is English. No `todo/` path in source. A filename has no
    dot except its extension.
13. The stor adapter is the only I/O. Call `diskPath` as a method when the host
    has it. Studio has no `diskPath`; that is a state, not an error.
