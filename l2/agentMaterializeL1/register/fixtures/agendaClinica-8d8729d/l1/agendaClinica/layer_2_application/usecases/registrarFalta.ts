/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RegistrarFaltaInput as RegistrarFaltaInput_0, RegistrarFaltaOutput as RegistrarFaltaOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';
export async function registrarFalta(input: RegistrarFaltaInput_0, ctx: RequestContext, ports: { consultaRepository: ConsultaRepository }): Promise<RegistrarFaltaOutput_0> {
  void input;
  void ctx;
  void ports;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'registrarFalta is not implemented.', 501);
}
