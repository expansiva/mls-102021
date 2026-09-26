/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { ListPacienteInput as ListPacienteInput_0, ListPacienteOutput as ListPacienteOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ListPacienteInput as ListPacienteInput_1, ListPacienteOutput as ListPacienteOutput_1 } from '/_102047_/l2/agendaClinica/web/contracts/pacientes.defs.js';
export async function listPaciente(input: ListPacienteInput_0 | ListPacienteInput_1, ctx: RequestContext): Promise<ListPacienteOutput_0 | ListPacienteOutput_1> {
  void input;
  void ctx;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'listPaciente is not implemented.', 501);
}
