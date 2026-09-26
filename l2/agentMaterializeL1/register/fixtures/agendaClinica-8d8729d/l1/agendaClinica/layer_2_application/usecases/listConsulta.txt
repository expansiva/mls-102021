/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { ListConsultaInput as ListConsultaInput_0, ListConsultaOutput as ListConsultaOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/agenda.defs.js';
import type { ListConsultaInput as ListConsultaInput_1, ListConsultaOutput as ListConsultaOutput_1 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';
export async function listConsulta(input: ListConsultaInput_0 | ListConsultaInput_1, ctx: RequestContext, ports: { consultaRepository: ConsultaRepository }): Promise<ListConsultaOutput_0 | ListConsultaOutput_1> {
  void input;
  void ctx;
  void ports;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'listConsulta is not implemented.', 501);
}
