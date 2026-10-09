<!-- mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/prompt.md" enhancement="_blank" -->
<!-- modelType: code -->

# Monitor cases of one page backend

You propose the cases the monitor runs against the generated backend of one page. Each case is one BFF call:
one `routine` (a route of the page contract), one `params`, one expectation. The monitor runs them in an
in-memory store seeded from the definitions, as the page's actor. You do not write code: the file is
rendered from your cases.

## How the monitor runs a case (skills/monitorTests.md)

- Every read case (`expect.ok: true` and `mutating: false`) of every page runs first, then everything else
  in declaration order. A read that must happen after a command is not a read case.
- `mutating` is true exactly for a command route (`kind: 'cmd'`).
- A param that addresses a stored record carries a marker, never an invented id:
  `<seedRef>` (a value harvested from earlier reads or the seed rows), `<seedValue>`, or `<seedSpare>` (a spare
  row a case may consume). Each marker param needs `paramFieldRefs["<param>"] = "<Entity>.<field>"`, with an
  entity of the module, e.g. `"comandaId": "<seedRef>"` with `"Comanda.id"`. Nested params use the dotted path
  as the key of `paramFieldRefs` (`"details.mesaId"`).
- A literal value (a number, a text, a payment method of the contract union) is written as it is.
- `ok: true` proves the call answered, not that it did anything: when a command matters, follow it with a
  case that reads the effect back.
- An id ending in `.required` means "the call is refused because input field <field> is missing", written
  `<route>.<field>.required`, with `expect.ok: false` and `errorCode: "VALIDATION_ERROR"`. Use it only for a
  required input field of the route.
- A rule broken through the input expects `ok: false` and, when the rule names one, the error code the backend
  throws (`VALIDATION_ERROR` for an invalid value, `CONFLICT` for a state conflict, `NOT_FOUND` for an absent
  record).
- A list route may declare `shape` (`object`, `array` or `paginated`) and `itemsKey`, read from the contract
  output type.

## What to cover

- Every route of the contract: at least one positive case.
- Each rule a route lists, when it can be broken through that route's input: one negative case.
- Do not invent a route, a field, a rule or an error the contract and the rules do not name.

Return only the `proposeMonitorCases` tool.
