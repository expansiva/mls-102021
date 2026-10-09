<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Request service (BFF) of one page of the L1 backend

You write one TypeScript file: the request service of one page. Each route of the page contract is one function:
it has a purpose, an input, a processing and an output, written in its JSDoc. The contract says what the page
needs, not where it comes from: you decide how to provide it from the usecases of the module.

The source is the contract (types, JSDoc, rules, access) and the l4 (ontology, rule texts). The request-service
def says which page and routes exist; its `uses`, `params` and output tree are hints: where they diverge from the
contract or the l4, the contract and the l4 win, and an empty or `unresolved` field means "decide by the contract
and the l4" (materializadorL1.md §2.1) — an input of the contract with no param still filters what its JSDoc says;
a usecase missing from `uses` is still called when an output needs it; a type of the contract is opened to its
leaves. You do not decide business: you do not invent a route, a field, a rule or an error.

## The file

- First line: exactly `/// <mls fileReference="<the file>" enhancement="_blank"/>` as given in the task.
- `export const requests: { [K in keyof <Page>Contracts]: (input: <Page>Contracts[K]['input'], ctx: RequestContext) => Promise<<Page>Contracts[K]['output']> } = { "<route>": async function (input, ctx) { … }, … };`
  with `import type { <Page>Contracts } from '<the contract .defs.js>'`. Each function takes exactly its route's
  input type and returns exactly its route's output type, so the compiler proves both: every path you read from the
  input (a contract type nests as it nests: the attendance note is `input.details.details.attendanceNote`) and the
  output shape (a list, its page fields `page`, `pageSize`, `hasMore`, every key). Leave `input` unannotated in a
  route function (it takes the declared type); a helper takes `<Page>Contracts['<route>']['input']` or the member it
  needs, never `Record<string, unknown>`, and the input is never cast to `Record<…>`.
  with one entry per contract route, keyed by the route string, and nothing else in it.
- Imports start with `/` and end with `.js`: the platform files given, the usecases of this module (the paths given),
  and `import type` of the page contract. No `node:`, no npm package, no `fetch`, no browser storage.
- Call usecases; do not resolve repositories here. A usecase is called with `(input, ctx)` as its signature says.
  Build the usecase input field by field from the contract input (`{ id: String(input.id), details: { … } }`); never
  pass the contract input as it is with a cast (`input as Parameters<typeof createX>[0]`): the shapes differ and the
  cast hides it until the usecase reads a field that is not there.

## What each function does

- Purpose, input, processing and output come from its JSDoc, and it returns exactly the contract output type:
  the same keys, the same nesting, nothing more. Compose (a comanda with its mesa and its items), filter ("only
  open comandas"), calculate (totals, indicators) here, in the request service, never in a usecase.
- A value marked `readonly` in the contract is calculated by this function from the rule its route lists (for
  example a subtotal from the items that are not canceled); it is not read from the input.
- A list in a page wrapper (`{ items, page, pageSize, hasMore }`) is paginated: `page` and `pageSize` from the
  input (page 1 and 20 by default, pageSize at most 200), `hasMore` true when there are records after the page.
  An input that pages one list of a group pages each list of that group.
- A command (`kind: 'cmd'`) is atomic: the whole function body runs inside
  `ctx.data.moduleData.runInTransaction(async (tx) => { const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }; … })`,
  and every usecase of the command is called with `bound`. Its return value is what the page redraws.
- A rule a route lists is applied where the JSDoc says. Name it where it is applied: the `ruleId` of an
  `AppError` (`new AppError('<CODE>', '<message>', <status>, { ruleId: '<ruleId>' })`) for a check, or a comment
  with the rule id on a calculation. A rule a usecase already enforces for this call may be named in a comment
  on that call only when that usecase really carries it (its code throws an AppError with that ruleId: see its
  file under "Dependency"); a comment that hands a rule to a usecase that does not apply it is refused — check it
  here instead. A listed rule that does not concern this route goes to `notApplicable`, with the reason.
- A value a usecase returns may be `null` where the record has no such field (the platform MDM returns `null` for a
  document a patient does not have). `null` is the same as absent: test with `== null`, leave the optional field out of
  the output, and never throw because a field is `null`.
- An optional field of the contract output (`docType?`, `docId?`, a `?:` member) that the record does not have is
  left out of the output: never throw for it and never convert an absent value as if it were there (a patient with no
  document made the detail route fail with "unsupported document type: null").
- A record that must exist and is not found is `new AppError('NOT_FOUND', '<message>', 404)`.
- No silent fallback: no empty `catch`, no invented default value. An error names its cause.

## Typing (no compiler checks this file before it runs: write it so it compiles under `strict`)

- `input` has its contract type: read each field where that type puts it, and convert only what a usecase needs in
  another type (`Number(input.version)` when the usecase takes a number); never pass an `unknown` where a type is
  expected.
- `resolveRepository` returns what you cast it to: `resolveRepository<ComandaRepository>(ctx, 'ComandaRepository')`.
- A function returns exactly its declared type: build the output object field by field. No `as unknown as` and no
  `as any`: they hide a wrong shape from the compiler (a list declared `{ items, hasMore }` that returned a bare
  array reached a page as `{}`).

## Data rules every module follows

- A field the l4 ontology marks `derived` (for example a table's availability, a subtotal, a total, a line value) is
  never read from storage: it is calculated from its description and rule every time it is returned or checked.
  A usecase returns a derived field as it is stored, and nothing maintains it: calculate it here, from the records
  its description names, before you return it or check it (an availability that depends on open records is
  computed by listing those records; a total by summing the lines it names).
- Lists are 1-based: `page` 1 is the first page, `pageSize` 20 by default and at most 200 (the platform's
  `resolveListPage`). A list usecase filters by every field you pass: pass only the filters you mean, never a
  placeholder (`''`, `0`, `{}`) for an unused one.
- Searching is not filtering. A filter is an exact match (the platform repository compares by equality). Two
  kinds of input are searches, not filters:
  - a text search: `locate.byText` / `locate.byName` in the l4 capabilities, or a contract input that searches "um
    trecho do nome" / a name term: a case-insensitive "contains" that also ignores accents;
  - a day on a date-and-time field (the day of an agenda over `scheduledAt`): the interval from the start to the end
    of that day.
  Never pass such a term as an exact-match filter: the search "caf" then finds nothing and "Cafe" only by its full
  name. List the records with the exact filters you have, keep the ones whose field contains the term (or falls in
  that day), and paginate what you kept yourself (`page`, `pageSize`, `hasMore` over the kept records).
- A rule is enforced by its text: when the text is about the state of another record (the comanda of an item, the
  mesa of a comanda), read that record and check it.

## Answer

Return only the `writeRequestService` tool: the whole file in `code`, and `notApplicable` (empty when every rule applies).
