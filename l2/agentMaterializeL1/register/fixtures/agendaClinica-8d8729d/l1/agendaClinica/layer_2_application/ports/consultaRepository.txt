/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { Consulta } from '/_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.js';

export type ConsultaFilter = Record<string, unknown>;

export interface ConsultaRepository {
  create(consulta: Consulta): Promise<Consulta>;
  list(consultaFilter: ConsultaFilter): Promise<Consulta[]>;
  update(consulta: Consulta): Promise<Consulta>;
  transition(consulta: Consulta, transitionId: string): Promise<Consulta>;
}

export const pendingConsultaRepository: ConsultaRepository = {
  async create(consulta: Consulta): Promise<Consulta> { throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'create is not implemented.', 501); },
  async list(consultaFilter: ConsultaFilter): Promise<Consulta[]> { throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'list is not implemented.', 501); },
  async update(consulta: Consulta): Promise<Consulta> { throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'update is not implemented.', 501); },
  async transition(consulta: Consulta, transitionId: string): Promise<Consulta> { throw new AppError('REPOSITORY_NOT_IMPLEMENTED', 'transition is not implemented.', 501); },
};
