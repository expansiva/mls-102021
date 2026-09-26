/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.ts" enhancement="_blank"/>
import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveGrant } from '/_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.js';
import { createConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.js';
import { registrarFalta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.js';
import { updateConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.js';
import { listConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.js';
import { listPaciente } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.js';
import { listProfissional } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.js';
import type { CreateConsultaInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { RegistrarFaltaInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { UpdateConsultaInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ListConsultaInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ListPacienteInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import type { ListProfissionalInput } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import { pendingConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';

export const routes: ControllerRoute[] = [
  { key: 'agendaClinica.consultas.cmdCreateConsulta', handler: handleCmdCreateConsulta },
  { key: 'agendaClinica.consultas.cmdRegistrarFalta', handler: handleCmdRegistrarFalta },
  { key: 'agendaClinica.consultas.cmdUpdateConsulta', handler: handleCmdUpdateConsulta },
  { key: 'agendaClinica.consultas.qryListConsulta', handler: handleQryListConsulta },
  { key: 'agendaClinica.consultas.qryListPaciente', handler: handleQryListPaciente },
  { key: 'agendaClinica.consultas.qryListProfissional', handler: handleQryListProfissional },
];

async function handleCmdCreateConsulta(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']);
  if (invalid) throw invalid;
  const data = await createConsulta(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as CreateConsultaInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
}

async function handleCmdRegistrarFalta(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id']);
  if (invalid) throw invalid;
  const data = await registrarFalta(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as RegistrarFaltaInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
}

async function handleCmdUpdateConsulta(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']);
  if (invalid) throw invalid;
  const data = await updateConsulta(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as UpdateConsultaInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
}

async function handleQryListConsulta(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'pacienteId', 'profissionalId', 'scheduledAt', 'status']);
  if (invalid) throw invalid;
  const data = await listConsulta(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as ListConsultaInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
}

async function handleQryListPaciente(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'details']);
  if (invalid) throw invalid;
  const data = await listPaciente(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as ListPacienteInput, input.ctx);
  return { ok: true, data: projectOutput(data, ['id', 'version', 'details']), error: null };
}

async function handleQryListProfissional(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['recepcionistaGestaoAgenda']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'details']);
  if (invalid) throw invalid;
  const data = await listProfissional(scopeParams(input.request.params, input.ctx, ['recepcionistaGestaoAgenda']) as unknown as ListProfissionalInput, input.ctx);
  return { ok: true, data: projectOutput(data, ['id', 'version', 'details']), error: null };
}

function scopeParams(params: unknown, ctx: { sessionContext?: { actorId?: string } }, grantIds: readonly string[]): Record<string, unknown> {
  const body = params && typeof params === 'object' && !Array.isArray(params) ? { ...(params as Record<string, unknown>) } : {};
  for (const grantId of grantIds) {
    const resolved = resolveGrant(grantId);
    if (!('grantId' in resolved) || resolved.scopeMode !== 'own' || !resolved.recordField) continue;
    const actorId = ctx.sessionContext?.actorId ?? '';
    // enforce:scope
    body[resolved.recordField] = actorId;
  }
  return body;
}

function authorize(request: BffRequest, grantIds: readonly string[]): AppError | null {
  const source = request.meta?.source ?? 'http';
  const authorities = request.meta?.verifiedAuthorities ?? [];
  if (source === 'http' && authorities.length === 0) {
    return new AppError('FORBIDDEN_ACTOR', 'You have no authority to call this routine.', 403);
  }
  for (const grantId of grantIds) {
    const resolved = resolveGrant(grantId);
    if (!('grantId' in resolved)) return new AppError(resolved.code, resolved.detail, 403);
    if (resolved.pending) return new AppError(resolved.pending, `Grant ${grantId} is pending ${resolved.pending}.`, 403);
    if (authorities.length > 0 && resolved.actorRef && !authorities.some(item => item === resolved.actorRef || item.endsWith(':' + resolved.actorRef))) {
      return new AppError('FORBIDDEN_ACTOR', 'You have no authority to call this routine.', 403);
    }
  }
  return null;
}

function validateInput(params: unknown, fields: readonly string[]): AppError | null {
  const body = params && typeof params === 'object' && !Array.isArray(params) ? params as Record<string, unknown> : null;
  for (const field of fields) {
    if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
      return new AppError('VALIDATION_ERROR', `${field} is required.`, 400);
    }
  }
  return null;
}

function projectOutput(data: unknown, fields: readonly string[]): unknown {
  if (Array.isArray(data)) return data.map(item => projectOutput(item, fields));
  const source = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const projected: Record<string, unknown> = {};
  for (const field of fields) if (field in source) projected[field] = source[field];
  return projected;
}
