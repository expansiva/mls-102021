/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/fixtures/n10/closeTab.ts" enhancement="_blank"/>

/**
 * Compile fixture for a command that writes N entities in one transaction
 * (ce02-like: close the tab, persist the close record, free the table).
 * Frontend tsc is the compile gate.
 */

interface RequestContext {
  idGenerator: { newId(): string };
  clock: { nowIso(): string };
  data: {
    runInTransaction<T>(fn: () => Promise<T>): Promise<T>;
  };
}

interface Tab {
  tabId: string;
  tableId: string;
  status: string;
  updatedAt: string;
}
interface TabClose {
  tabCloseId: string;
  tabId: string;
  createdAt: string;
}
interface TableRecord {
  tableId: string;
  status: string;
  updatedAt: string;
}

interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(record: T): Promise<T>;
}

class AppError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

function resolveRepository<T>(_ctx: RequestContext, _name: string): Repository<T> {
  throw new Error('fixture stub');
}

export interface CloseTabInput { tabId: string }
export interface CloseTabOutput { tabId: string; tableId: string; status: string }

export async function closeTab(ctx: RequestContext, input: CloseTabInput): Promise<CloseTabOutput> {
  const tabs = resolveRepository<Tab>(ctx, 'Tab');
  const tabCloses = resolveRepository<TabClose>(ctx, 'TabClose');
  const tables = resolveRepository<TableRecord>(ctx, 'Table');
  const tab = await tabs.findById(input.tabId);
  if (!tab) throw new AppError('NOT_FOUND', 'Tab not found.', 404);
  const now = ctx.clock.nowIso();
  const saved = await ctx.data.runInTransaction(async () => {
    const closed: Tab = { ...tab, status: 'closed', updatedAt: now };
    await tabs.save(closed);
    await tabCloses.save({ tabCloseId: ctx.idGenerator.newId(), tabId: tab.tabId, createdAt: now });
    const table = await tables.findById(tab.tableId);
    if (table) await tables.save({ ...table, status: 'free', updatedAt: now });
    return closed;
  });
  return { tabId: saved.tabId, tableId: saved.tableId, status: saved.status };
}
