/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-adapter/fixtures/taskDetailsRoundTrip.ts" enhancement="_blank"/>

// Permanent fixture for the details-key contract: JSONB keys = l4 fieldId (camelCase).
// Shape is local — l2 is DOM-only and must not import l1/server of 102034.

export const TASK_L4_FIELDS = [
  { fieldId: 'taskId' },
  { fieldId: 'title' },
  { fieldId: 'description' },
  { fieldId: 'status' },
  { fieldId: 'priority' },
  { fieldId: 'dueDate' },
  { fieldId: 'ownerUserId' },
  { fieldId: 'createdAt' },
];

export const TASK_FIELD_IDS = TASK_L4_FIELDS.map(field => field.fieldId);

export interface TaskRow {
  task_id: string;
  owner_user_id: string;
  status: string;
  created_at: string;
  details: Record<string, unknown> | string | null;
}

export interface TaskDetails {
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
}

export interface Task {
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  ownerUserId: string;
  createdAt: string;
}

/** Seed-shaped row: details written under fieldId (camelCase), the way gen-seeds emits the envelope. */
export const TASK_SEED_ROW: TaskRow = {
  task_id: '11111111-1111-4111-8111-111111111111',
  owner_user_id: '22222222-2222-4222-8222-222222222222',
  status: 'pending',
  created_at: '2026-07-01T00:00:00.000Z',
  details: {
    title: 'Pay invoices',
    description: null,
    priority: 'medium',
    dueDate: '2026-07-02T12:00:00.000Z',
  },
};

function detailsDefaults(): TaskDetails {
  return { title: '', description: null, priority: 'medium', dueDate: null };
}

export function parseDetails(row: TaskRow): TaskDetails {
  let parsed: Partial<TaskDetails> = {};
  try {
    const raw = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details ?? {});
    parsed = (raw ?? {}) as Partial<TaskDetails>;
  } catch {
    parsed = {};
  }
  return { ...detailsDefaults(), ...parsed };
}

export function toDomain(row: TaskRow): Task {
  const d = parseDetails(row);
  return {
    taskId: row.task_id,
    title: d.title,
    description: d.description,
    status: row.status,
    priority: d.priority,
    dueDate: d.dueDate,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
  };
}

export function toRow(task: Task): TaskRow {
  const details: TaskDetails = {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
  };
  return {
    task_id: task.taskId,
    owner_user_id: task.ownerUserId,
    status: task.status,
    created_at: task.createdAt,
    details: JSON.stringify(details),
  };
}
