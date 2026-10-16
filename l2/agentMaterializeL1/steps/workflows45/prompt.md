<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Workflow service of one process of the L1 backend

You write one TypeScript file: the workflow service of one process of a module (materializadorL1.md §11). It lives in
the application layer, next to the usecases of the entities and the request services of the pages. It is not another
usecase and not an endpoint: the request service of the page calls its functions, and **the function decides** —
whether it opens the occurrence or advances its step, who acts now, what it tells.

## The source

- The **l4 process** is the source: its `functions[].description` says, for each function, who calls it, what it
  checks, what it writes, what it tells, what it returns and what happens when it runs twice. Follow it; do not
  invent a step, a rule, a field or an actor.
- The **definition** says which functions exist, what starts the process (`trigger`), which record it keeps an
  occurrence of (`occurrence`) and which entity operations its steps reach (`operations`).
- The **usecases** of those operations are called with `(input, ctx)` as their signatures say. An operation with no
  usecase (a system transition, `by: []`) is applied here through the entity port: read the record, check the
  transition is allowed from its state (the l4 ontology), write the state it leads to with
  `repository.transition(record, '<transitionId>')`, keeping the version it read.

## The file

- First line: exactly `/// <mls fileReference="<the file>" enhancement="_blank"/>` as given in the task.
- One `export async function <functionId>(input: <FunctionId>Input, ctx: RequestContext): Promise<<FunctionId>Output>`
  per function of the definition, with the interfaces exported. Input and output are what the prose says the function
  receives and returns.
- A scheduled process also exports `onTick(ctx: RequestContext, now: Date): Promise<void>`: it asks
  `evaluateSchedule(<the schedule prose>, now, lastRun)` whether an occurrence is due — `lastRun` is what the module
  recorded (for a daily notice, the notice of that day already stored) — and when it is, runs the scheduled work.
  Never a hard-coded hour.
- Imports start with `/` and end with `.js`: the platform files and the files of this module given in the prompt.
  No `node:`, no npm package, no `fetch`, no browser storage. Repositories only through the ports of this module
  (`resolveRepository<Port>(ctx, '<Port>')`).

## The occurrence and its Task

- The business record stays in the module table. The Task keeps only the reference
  `{ project, module, entity, recordId, processId, workflowVersion }` and the progress `{ step, actorNow, history }`,
  through `taskOccurrence` (`open`, `find`, `advance`). Nothing of the business goes to the Task; nothing of the
  progress goes to the table, unless the l4 declares the field.
- Opening is idempotent: the key is `ctx.requestMeta?.requestId`. The same key returns the same record and the same
  occurrence — a function that creates the record first looks for the occurrence the key already opened.
- Do not advance a step the occurrence is not in, do not mix occurrences of different records, do not skip a step.
  A failure between writing the record and moving the Task leaves something the next call can finish: never assume
  one transaction spans the app and the Task.
- `workflowVersion` is the version of the l4 process the occurrence started on (`'1'` when the l4 names none).

## Rules and errors

- A rule the prose or the operation names is checked here or by the usecase that already applies it.
  When broken: `new AppError('<CODE>', '<message in English>', <status>, { ruleId: '<ruleId>' })` — 409 for a state
  conflict, 403 for an actor who may not act now, 400 for a missing or invalid value, 404 for a record not found.
- No silent fallback: no empty `catch`, no invented default. An error names its cause.
- No `as unknown as`, no `as any`: build each value with its type. The file must compile under `strict`.

## Answer

Return only the `writeWorkflowService` tool: the whole file in `code`, and `notApplicable: []`.
