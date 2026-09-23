# finalize80

## 2026-09-23

- A declared dependency that this pipeline does not generate is a read source, not a future output. It is accepted only when that file was opened. The project in the path is part of the identity. A path that is not on disk stays `REF_INVALID` and `SOURCE_ABSENT`. A missing symbol stays `RULE_TEXT_ABSENT`.

## 2026-09-22

- The step reads persisted defs, drafts and the snapshot. It writes `report.json`.
- A missing future `.ts` is pending materialization. An absent L2 contract is a real gap.
- `ENUMERATIONS_NOT_CONSUMED` names the enum that still has no consumer.
- `INTEGRATION_UNBOUND` and `PAYLOAD_UNDECLARED` are reported and not repaired.
- A run held at an earlier step does not claim the later phases ran.
- No model. No second repair cycle. Inventory recognition is not an executable backend.
