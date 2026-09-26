/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { UpdateConsultaInput as UpdateConsultaInput_0, UpdateConsultaOutput as UpdateConsultaOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';
export async function updateConsulta(input: UpdateConsultaInput_0, ctx: RequestContext, ports: { consultaRepository: ConsultaRepository }): Promise<UpdateConsultaOutput_0> {
  void input;
  void ctx;
  void ports;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'updateConsulta is not implemented.', 501);
}
