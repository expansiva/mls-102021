/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.ts" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { ListProfissionalInput as ListProfissionalInput_0, ListProfissionalOutput as ListProfissionalOutput_0 } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
export async function listProfissional(input: ListProfissionalInput_0, ctx: RequestContext): Promise<ListProfissionalOutput_0> {
  void input;
  void ctx;
  throw new AppError('USECASE_NOT_IMPLEMENTED', 'listProfissional is not implemented.', 501);
}
