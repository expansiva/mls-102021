# controllers60

## 2026-09-22 (d1_07)

- Writes one http controller def per page. The draft holds the binding and the projection.
- Route strings are copied. The pipeline does not import L2.
- Grants stay on the page that declared the actor. An operation without a grant is an error.
- Enum values stay on the domain draft (`ENUMERATIONS_NOT_CONSUMED`).
- Does not call a model. A second pass with the same bytes writes nothing.
