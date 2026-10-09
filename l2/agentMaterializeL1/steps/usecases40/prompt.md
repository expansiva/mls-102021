<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Usecase of the L1 backend

You write one TypeScript file: the usecase of one entity and one operation of a hexagonal backend. The prompt
carries what the deterministic recipe produced for it ("Recipe attempt"): a draft to keep where it is right, or
the reason the recipe could not derive it (a rule it cannot bind, more than one port, an operation outside the
derived ones). You write the whole file.

The source is the l4: the ontology of the entity (its fields, which are derived, its states) and the text of the
rules. The definition says which usecase exists (entity + operation) and gives hints: its input and output lists,
its rulePlan and its sequence. Where a hint diverges from the l4, the l4 wins (materializadorL1.md §2.1). You do not
decide business: you do not invent a field, a route, a rule, an operation, a port or a type.

## How to read the context

Each section of the prompt answers one question. When two sections disagree, the source wins over the hint.

| Section | Kind | What it decides |
|---|---|---|
| l4 ontology → `record.fields` | source | the fields, their types, which are required, the lifecycle states |
| l4 ontology → `derived: true` | source | what is calculated every time and never read from or written to storage |
| l4 ontology → `capabilities` | source | which reads exist and what they filter by. `listByForeignKey` = the list of the records of one parent, filtered by that foreign key (`ItemComanda` by `comandaId`); `locate.byColumn` = the columns a list filters by exact value; `locate.byText` / `locate.byName` = a search by a piece of text (contains, see "Searching is not filtering"), not an exact filter; `read.byId` = get by id |
| l4 ontology → `relationships` | source | how this entity reaches another one (`itens` of a Comanda are the ItemComanda with that `comandaId`) |
| Rules (l4 text) | source | what to check, and the error when it is broken |
| Entity cited by a rule / Dependency | source | the exact field names and the port of another entity |
| The platform MDM (only for an entity kept in the MDM) | source | how the engine stores and returns that entity TODAY (flat `details`, list rows without `version`); it wins over the grouped shape of the entity ontology for what you read from and write to `ctx.mdm` |
| Definition (`uses`, `rulePlan`, `sequence`, input and output lists) | hint | a first guess: where it leaves out or contradicts the ontology, follow the ontology |
| Scaffold | contract | the exported names and the input and output interfaces |
| Recipe attempt | draft | keep what is right, fix what the sections above contradict |

For a list: every filter the scaffold's input declares is applied (a filter absent from the call does not narrow).
The filters come from the `capabilities` — the foreign key of `listByForeignKey` and the columns of `locate.*` —
even when the definition's `uses` lists fewer (`uses` with `role: "filter"` is a hint and may be incomplete). A
declared filter that is never applied returns the records of every parent (the items of every comanda).

## The file

- First line: exactly the header line of the scaffold (`/// <mls fileReference="…" enhancement="_blank"/>`).
- Keep the exported names of the scaffold: the input and output interface names and the exported async function,
  with exactly two parameters `(input, ctx: RequestContext)` — every usecase of the module is called that way. A
  `ports` parameter in the scaffold is dropped: repositories are resolved inside with
  `resolveRepository<Port>(ctx, '<Port>')`. The input accepts what the entity accepts by the l4: what the system sets is not
  an input and is set here — the initial state of the lifecycle, a number from a sequence, a field another
  operation fills (a discount or a payment of the closing), a value a rule copies (a unit price copied from the
  menu at launch).
- Read from `input` only the members its interface declares. A value the system sets is calculated in this file, not
  read from the input: a number from a sequence is the highest stored number plus one (list the records of the entity
  and take the maximum; 1 when there is none). createComanda declared only `mesaId` and then required `input.number`,
  so no comanda could be opened.
- Imports start with `/` and end with `.js`: the platform files and the dependency files given in the prompt.
  Nothing else: no `node:`, no npm package, no `fetch`, no `localStorage`, no other module.
- The usecase is independent of any page: it accepts what the entity accepts and returns the entity record.
- Read and write only through repository ports of this module, resolved the way the example does: the ports of
  the definition first; another port of the module only when a listed rule needs its records (e.g. the items of
  a comanda to compare a discount with the subtotal). The entity and port of another entity a rule names come under
  "Entity cited by a rule": import that port, type its records with that entity and read its fields by those names.
  Never declare a repository type of your own and never guess a field name.
- When the definition asks for more than one write, keep them inside one transaction boundary, as the
  definition's `transaction` says.

## Rules

- Each rule under "Rules" is enforced in this file. When it is broken, throw
  `new AppError('<CODE>', '<message in English>', <status>, { ruleId: '<ruleId>' })` with the rule id as a
  string literal exactly as given. Use 409 for a state conflict, 400 for a missing or invalid value, 404 when
  a record that must exist is not found.
- A ruleId goes on the check that enforces that rule, never on another check. A rule about a parent record of this
  entity (the comanda of an item: "um item só pode ser lançado em uma comanda aberta") is enforced by reading that
  parent through its port and checking its state; a file that names such a rule and never reads the parent is refused.
- A record that is not found is `new AppError('NOT_FOUND', …, 404)`.
- No silent fallback: no empty `catch`, no invented default value. An error names its cause.

- A rule the definition attaches to this usecase whose text is about another operation or entity (attached here
  by mistake) is not checked: list it in `notApplicable` with the reason. A rule of the module whose text is about
  this entity and operation is enforced even when the definition did not attach it.

## Typing (no compiler checks this file before it runs: write it so it compiles under `strict`)

- `input` is `Record<string, unknown>`: convert each value before use (`String(input.id)`, `Number(input.version)`, or a
  checked cast); never pass an `unknown` where a type is expected.
- A nested input object the caller may not send (`details.person`, `details.general`, the module branch, any optional
  group) is read with optional chaining (`input.details?.person?.privacyConsent`) and its absence means "not given":
  never dereference a nested input object without checking it exists (createProfissional and createConsulta threw a
  TypeError on `input.details.person.privacyConsent` / `input.details.attendanceNote`).
- `resolveRepository` returns what you cast it to: `resolveRepository<ComandaRepository>(ctx, 'ComandaRepository')`.
- A function returns exactly its declared type: build the output object field by field. No `as unknown as` and no
  `as any`: they hide a wrong shape from the compiler (a list declared `{ items, hasMore }` that returned a bare
  array reached a page as `{}`).

## Data rules every module follows

- A transition writes its target state: `repository.transition(record, '<transitionId>')` stores the record as given (the
  id is a label, it does not move the state). Build the record with the state the l4 transition leads to
  (`status: 'confirmed'` for confirmarConsulta) and its payload fields, then call it; passing the read record unchanged
  only bumps the version.
- The version is the repository's: a write (`update`, `transition`) carries the version that was read, unchanged.
  The repository compares it with the stored row and increments it itself; a record that arrives with `version + 1`
  is refused with `CONCURRENCY_CONFLICT` ("Version does not match the stored row"). Compare the input version with
  the read one when the operation takes it (a stale version is a 409), never add 1 to it. A create sets `version: 1`.

- A field the l4 ontology marks `derived` (for example a table's availability, a subtotal, a total, a line value) is
  never read from storage: it is calculated from its description and rule every time it is returned or checked.
  Never read it as a property of a record (`mesa.details.disponivel`): it is not stored, so the read is `undefined`.
  Compute it into a local value (a mesa is available when it has no open comanda: list the open comandas of the mesa)
  and check or return that value. Do not store it on a create or update either.
- A list usecase returns `{ items, hasMore }` (its declared output) on every path. With no filter it returns every
  record of the entity, paginated; a filter only narrows (an empty result without a filter is a defect).
- Lists are 1-based: `page` 1 is the first page, `pageSize` 20 by default and at most 200 (the platform's
  `resolveListPage`). A list usecase applies every filter its input declares; a caller passes only the filters it
  means, never a placeholder (`''`, `0`, `{}`) for an unused one.
- An entity kept in the platform MDM is read and written through `ctx.mdm` in the flat shape the section "The platform
  MDM" describes, and returned in the grouped shape this usecase declares. Never expect `details.identification`,
  `details.base` or `details.person` in what `ctx.mdm` returns, and never require a field the engine may not have.
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
  mesa of a comanda), read that record through its own port (`resolveRepository` of that entity) and check its
  state; checking only this record's own state does not enforce it, whatever the error message says.

## Answer

Return only the `writeUsecase` tool: the whole file in `code`, and `notApplicable` (empty when every rule applies).
