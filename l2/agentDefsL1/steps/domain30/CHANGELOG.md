# domain30

## 2026-09-21 (d1_04)

- Writes domain entity defs, and a value object only when a record reference names it.
- Reads `record.fields` as a v3 map. Does not rebuild an NS4 field list.
- Keeps platform rule spelling and owner. Does not copy those rules into invariants.
- Reports a missing reference, an ambiguous target, a structural cycle and a name collision with a path.
- Does not call a model. A second pass with the same bytes writes nothing.
