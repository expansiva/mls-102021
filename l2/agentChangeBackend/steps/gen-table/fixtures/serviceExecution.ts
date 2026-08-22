/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-table/fixtures/serviceExecution.ts" enhancement="_blank"/>

// Real petShop artifact (mls-102047 serviceExecution.ts) that declared only
// secondary indexes with suffix `_idx` — the shape the generator must emit.
// Shape is local: l2 is DOM-only and must not import l1/server of 102034.

export const serviceExecutionTableDef = {
  moduleId: 'petShop',
  repositoryName: 'petShopServiceExecution',
  tableName: 'service_execution',
  purpose: 'transacao',
  description: 'Stores service execution lifecycle records. Non-indexed fields are stored in details (JSONB).',
  backupHot: false,
  storageProfile: 'postgres',
  writeMode: 'sync',
  columns: [
    {
      name: 'service_execution_id',
      postgresType: 'UUID',
      description: 'Primary key and execution identifier.',
    },
    {
      name: 'service_appointment_id',
      postgresType: 'UUID',
      description: 'Foreign key to the service appointment.',
    },
    {
      name: 'status',
      postgresType: 'TEXT',
      description: 'Current service-execution status.',
    },
    {
      name: 'details',
      postgresType: 'JSONB',
      nullable: true,
      description: 'Execution details including arrivedAt, serviceStartedAt, completedAt, and pickedUpAt.',
    },
  ],
  primaryKey: ['service_execution_id'],
  indexes: [
    {
      name: 'service_execution_service_appointment_id_idx',
      columns: ['service_appointment_id'],
    },
    {
      name: 'service_execution_status_idx',
      columns: ['status'],
    },
  ],
  version: 1,
};
