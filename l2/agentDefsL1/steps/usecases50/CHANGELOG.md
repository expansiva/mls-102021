# usecases50

## 2026-09-21 (d1_06)

- One worker per selected usecase, at most 5 at once. The model plans steps only.
- Ids, routes and contract symbols stay mechanical. The contract AST binds a route, not a type name.
- Enum values stay on the domain draft (`ENUMERATIONS_NOT_CONSUMED`).
- One repair per usecase, eight globally. An operational failure does not retry.
