# persistence40

## 2026-09-21 (d1_05)

- Writes one repository port, one table and one adapter per planned module-database item.
- Copies `uniqueKeys` from the domain draft onto the table. Does not copy enumerations.
- Uses `storage.table` as the only physical name. A divergent citation is refused.
- Does not call a model. A second pass with the same bytes writes nothing.
