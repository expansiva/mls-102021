/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbTableNames.ts" enhancement="_blank"/>

// Physical tableName carries the module so two modules in one project never share a Postgres table.
// repositoryName already does (`{module}Order`); tableName did not, and the runtime's project prefix
// (`mls${projectId}_`) is per project, not per module. The lookup key (logicalTableName /
// getTable('order') / seedFor) stays the unprefixed name — only the physical name gains the module.
// Idempotent, same rule as applyProjectTableNamespace. l2 cannot import 102034 l1; keep the
// `mls${projectId}_` formula in sync with projectTableNamespacePrefix there.

export const POSTGRES_IDENTIFIER_MAX_LENGTH = 63;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Lowercased module token used as the physical-name prefix. `listaAssinatura3` → `listaassinatura3_`. */
export function moduleTableNamespacePrefix(moduleId: string): string {
  const token = moduleId.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return token ? `${token}_` : '';
}

/** Prefix a physical storage name with the module. Lowercased; a name that already starts with the prefix is unchanged. */
export function applyModuleTableNamespace(physicalName: string, moduleId: string): string {
  const prefix = moduleTableNamespacePrefix(moduleId);
  const name = physicalName.toLowerCase();
  if (!name || !prefix) return name;
  return name.startsWith(prefix) ? name : `${prefix}${name}`;
}

/** Undo the module prefix so lookup stays `petition_signature`, not `listaassinatura3_petition_signature`. */
export function logicalTableNameFromEmitted(emittedName: string, moduleId: string): string {
  const prefix = moduleTableNamespacePrefix(moduleId);
  const name = emittedName.toLowerCase();
  return prefix && name.startsWith(prefix) ? name.slice(prefix.length) : emittedName;
}

/** Final Postgres identifier after the runtime applies the per-project namespace. */
export function physicalPostgresTableName(projectId: string, emittedTableName: string): string {
  return `mls${projectId}_${emittedTableName}`;
}

export function assertPhysicalTableNameFitsPostgres(input: {
  projectId: string;
  moduleId: string;
  tableName: string;
  tableId?: string;
}): string {
  const physical = physicalPostgresTableName(input.projectId, input.tableName);
  if (physical.length <= POSTGRES_IDENTIFIER_MAX_LENGTH) return physical;
  const entity = input.tableId ? `, entity '${input.tableId}'` : '';
  throw new Error(
    `Postgres identifier exceeds ${POSTGRES_IDENTIFIER_MAX_LENGTH} characters (${physical.length}): '${physical}'. `
    + `Shorten the entity or module name (module '${input.moduleId}'${entity}, table '${input.tableName}').`,
  );
}

/** Prefix tableName with the module and fail generation when the final Postgres name would overflow. */
export function sanitizePlannerTableName<T extends Record<string, unknown>>(
  item: T,
  input: { moduleId: string; projectId: string; tableId?: string },
): T {
  const rawName = readString(item.tableName);
  if (!rawName) return item;
  const tableName = applyModuleTableNamespace(rawName, input.moduleId);
  assertPhysicalTableNameFitsPostgres({
    projectId: input.projectId,
    moduleId: input.moduleId,
    tableName,
    tableId: input.tableId || readString(item.tableId) || undefined,
  });
  if (tableName === rawName) return item;
  return { ...item, tableName };
}
