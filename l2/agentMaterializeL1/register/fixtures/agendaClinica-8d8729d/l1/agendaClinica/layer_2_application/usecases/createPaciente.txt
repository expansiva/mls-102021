/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/createPaciente.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { CreatePacienteInput as CreatePacienteInput_0, CreatePacienteOutput as CreatePacienteOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/pacientes.defs.js';
export async function createPaciente(input: CreatePacienteInput_0, ctx: RequestContext): Promise<CreatePacienteOutput_0> {
  void input;
  void ctx;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'createPaciente is not implemented.', 501);
}
