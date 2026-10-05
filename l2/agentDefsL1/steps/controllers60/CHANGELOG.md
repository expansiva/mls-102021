# controllers60

## 2026-10-05 (d1_65)

- An aggregate no entity owns (a `computed` node without `entity`) takes its authority from the route `access.grants` the L4 access artifact has, for an actor of the page (and of the route, when the parser split the actors). A route grant L4 does not have, or of another actor, is `CONTRACT_ACCESS_DIVERGENT` (error); no valid one is `NO_AUTHORITY`. A route that also reads an entity keeps the entity authority and needs a valid route grant among it.
- `nodeDisclosure` discloses that aggregate to the route grants (D1 and M1), closed without one.

## 2026-10-01 (d1_45 r2)

- A v2 page controller is an adapter: one request-service function per handler, contract path and `<Page>Contracts`, no usecase dependency.
- Recipe `2026-10-01-d1-controllers-adapter`.

## 2026-09-23 (d1_21)

- `fieldsOnly` matches a disclosure path, not the last segment of it. A container covered by a sub-path is narrowed to those sub-paths. It is not released whole, and it is not rejected on the container name.
- A named branch covers its descendants. `fullRecord` still keeps every declared field. A nested shape that cannot be read does not release the container.

## 2026-09-22 (d1_07b)

- Reads the same contract slice. An unclosed declaration is `CONTRACT_UNPARSED`.

## 2026-09-22 (d1_07)

- Writes one http controller def per page. The draft holds the binding and the projection.
- Route strings are copied. The pipeline does not import L2.
- Grants stay on the page that declared the actor. An operation without a grant is an error.
- Enum values stay on the domain draft (`ENUMERATIONS_NOT_CONSUMED`).
- Does not call a model. A second pass with the same bytes writes nothing.
