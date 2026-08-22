/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-table/fixtures/appointmentAvailability.ts" enhancement="_blank"/>

// Real petShop artifact (mls-102047 appointmentAvailability.ts) that declared
// `appointment_availability_pkey` alongside primaryKey: ['availability_id'] and
// collided with the implicit Postgres PK index at publish (42P07).
// Shape is local: l2 is DOM-only and must not import l1/server of 102034.

export const appointmentAvailabilityTableDef = {
  moduleId: 'petShop',
  repositoryName: 'petShopAppointmentAvailability',
  tableName: 'appointment_availability',
  purpose: 'cadastro',
  description: 'Stores service appointment availability windows.',
  backupHot: false,
  storageProfile: 'postgres',
  writeMode: 'sync',
  columns: [
    {
      name: 'availability_id',
      postgresType: 'UUID',
      description: 'Primary key and availability identifier.',
    },
    {
      name: 'service_id',
      postgresType: 'UUID',
      description: 'Foreign key to the service.',
    },
    {
      name: 'business_hours_id',
      postgresType: 'UUID',
      description: 'Foreign key to the business hours definition.',
    },
    {
      name: 'details',
      postgresType: 'JSONB',
      description: 'Availability details including startsAt and endsAt.',
    },
  ],
  primaryKey: ['availability_id'],
  indexes: [
    {
      name: 'appointment_availability_pkey',
      columns: ['availability_id'],
      unique: true,
    },
    {
      name: 'appointment_availability_service_id_idx',
      columns: ['service_id'],
    },
    {
      name: 'appointment_availability_business_hours_id_idx',
      columns: ['business_hours_id'],
    },
  ],
  version: 1,
};
