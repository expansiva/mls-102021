/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { CreateConsultaInput as CreateConsultaInput_0, CreateConsultaOutput as CreateConsultaOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';
export async function createConsulta(input: CreateConsultaInput_0, ctx: RequestContext, ports: { consultaRepository: ConsultaRepository }): Promise<CreateConsultaOutput_0> {
  void input;
  void ctx;
  void ports;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'createConsulta is not implemented.', 501);
}
