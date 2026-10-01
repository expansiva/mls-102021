<!-- mls fileReference="_102021_/l2/agentDefsL1/skills/httpController.md" enhancement="_blank" -->

# httpController

One controller per page. `handlers[].route` is the string the plan already
published and the string the L1 inventory reads.

A v2 page is an adapter. Each handler has `route`, `kind`, `grantIds` and one
`serviceFunction` — the request route of this page's request service. The def
stores `contractPath` and `contractInterface` (`<Page>Contracts`) and nothing
derived (`XInput`, `XOutput`). The call site reads
`<Page>Contracts['<route>']['input'|'output']`. Dependencies are that
request service, the access scope and the authority map. The handler does
not name a usecase.

A v1 contract still names the usecase. The controller does not take a grant
from another page.
