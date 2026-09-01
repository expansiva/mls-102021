# Skill: persistenceTable → `layer_1_external/adapters/persistence/{table}.ts`

Generate the `TableDefinition` for an aggregate root (or `event` entity) from the table `.defs.ts`.
JSONB-first: real columns ONLY for indexed fields (PK, queried FKs, status/lifecycle, searchable
`title`/`name`, ordering timestamps and dates); EVERYTHING else + the embedded child collections go
into one `details` JSONB column. Use `data.indexedColumns`/`data.detailsFields`/`data.childCollections`
when present. MDM/horizontal entities produce NO table.

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_1_external/adapters/persistence/order.ts" enhancement="_blank"/>
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const orderTableDef: TableDefinition = {
  moduleId: '{module}',
  repositoryName: '{module}Order',
  tableName: '{module}_orders',
  purpose: 'transacao',
  description: 'Pedidos. Itens e campos não indexados em details (JSONB).',
  backupHot: false,
  storageProfile: 'postgres',
  writeMode: 'sync',
  columns: [
    { name: 'order_id', postgresType: 'UUID' },
    { name: 'daily_shift_id', postgresType: 'UUID' },
    { name: 'table_id', postgresType: 'UUID', nullable: true },
    { name: 'kitchen_ticket_id', postgresType: 'UUID', nullable: true },
    { name: 'order_type', postgresType: 'TEXT' },
    { name: 'status', postgresType: 'TEXT' },
    { name: 'created_at', postgresType: 'TIMESTAMPTZ', defaultSql: 'NOW()' },
    { name: 'details', postgresType: 'JSONB', nullable: true },
  ],
  primaryKey: ['order_id'],
  indexes: [
    { name: 'idx_orders_daily_shift_id', columns: ['daily_shift_id'] },
    { name: 'idx_orders_status', columns: ['status'] },
    { name: 'idx_orders_table_id', columns: ['table_id'] },
    { name: 'idx_orders_created_at', columns: ['created_at'] },
  ],
  version: 1,
};
```

## Rules

- Column `postgresType` follows the l4 field type, never the field name: `string`/`text`/enum →
  `TEXT` (a field named `priority`/`rank`/`order` with a string enum is TEXT, never INTEGER);
  `uuid` → `UUID`; `date`/`datetime` → `TIMESTAMPTZ`; `integer` → `INTEGER`; `number` → `NUMERIC`.
- `tableName` and column `name` are snake_case; export const is `{tableId}TableDef`. `tableName`
  starts with the lowercased module id (`{module}_orders`) so two modules in one project never share
  a physical table. Do not prefix twice if the name already starts with the module. The final
  Postgres identifier (`mls{projectId}_{tableName}`) must be ≤ 63 characters.
- `purpose`: `transacao` (aggregate) | `controle` (metric) | `cadastro`. `storageProfile: 'postgres'`,
  `writeMode: 'sync'`, `backupHot: false` unless the defs says otherwise.
- ALWAYS include a `details` column `{ name: 'details', postgresType: 'JSONB', nullable: true }` when
  the aggregate has non-indexed fields or embedded collections. Keys *inside* that envelope are the
  entity fieldId verbatim (camelCase); snake_case is only for `tableName` and column `name`. The
  adapter and the seeds address the payload by fieldId — the table def does not rename those keys.
- One index per queryable column (FKs, status, searchable `title`/`name`, ordering timestamp/date). `version: 1` for new tables.
  Postgres already creates `<tableName>_pkey` from `primaryKey` — do not emit that index. Secondary
  index names end in `_idx` (real incident: `appointment_availability_pkey` on
  `primaryKey: ['availability_id']` collided at publish with 42P07; the correct sibling is
  `appointment_availability_service_id_idx`).
- `event` entities (`data.appendOnly === true`): append-only table. Set `purpose: 'controle'`, index the
  owner FK and the ordering timestamp, and when `data.retentionDays` is present add `retentionDays: <n>`
  to the `TableDefinition` (the platform applies the TTL); omit it for a permanent audit trail. Same
  JSONB rule — non-indexed fields go to `details`. MDM: emit NOTHING.
