/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RegistrarAtendimentoInput as RegistrarAtendimentoInput_0, RegistrarAtendimentoOutput as RegistrarAtendimentoOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/agenda.defs.js';
import type { ConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';
export async function registrarAtendimento(input: RegistrarAtendimentoInput_0, ctx: RequestContext, ports: { consultaRepository: ConsultaRepository }): Promise<RegistrarAtendimentoOutput_0> {
  void input;
  void ctx;
  void ports;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'registrarAtendimento is not implemented.', 501);
}
