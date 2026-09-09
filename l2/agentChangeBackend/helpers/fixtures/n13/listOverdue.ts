/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/fixtures/n13/listOverdue.ts" enhancement="_blank"/>

/**
 * Compile fixture: a list usecase computes a time status on read and does not persist it.
 * Frontend tsc is the compile gate.
 */

interface RequestContext {
  clock: { nowIso(): string };
}

interface Tuition {
  tuitionId: string;
  dueDate: string;
  balance: number;
  status: string;
}

interface Repository<T> {
  list(): Promise<T[]>;
}

class AppError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

function resolveRepository<T>(_ctx: RequestContext, _name: string): Repository<T> {
  throw new Error('fixture stub');
}

export interface ListTuitionInput { }
export interface ListTuitionOutput { tuitions: Tuition[] }

export async function listTuition(ctx: RequestContext, _input: ListTuitionInput): Promise<ListTuitionOutput> {
  const tuitions = resolveRepository<Tuition>(ctx, 'Tuition');
  const rows = await tuitions.list();
  const today = ctx.clock.nowIso().slice(0, 10);
  return {
    tuitions: rows.map(row => {
      // time status computed on read (2026-09-09): overdue via overdueWhenPastDue
      const status = row.dueDate < today && row.balance > 0 ? 'overdue' : row.status;
      return { ...row, status };
    }),
  };
}

void AppError;
