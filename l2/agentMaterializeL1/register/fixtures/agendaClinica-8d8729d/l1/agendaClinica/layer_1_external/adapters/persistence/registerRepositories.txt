/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/registerRepositories.ts" enhancement="_blank"/>
import { registerRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { createConsultaRepository } from '/_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.js';

export function registerRepositories(): void {
  registerRepository("ConsultaRepository", ctx => createConsultaRepository(ctx));
}

registerRepositories();
