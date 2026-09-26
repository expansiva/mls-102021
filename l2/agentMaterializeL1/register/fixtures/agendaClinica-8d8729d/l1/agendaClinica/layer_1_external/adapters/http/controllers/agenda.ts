/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda.ts" enhancement="_blank"/>
import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveGrant } from '/_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.js';
import { registrarAtendimento } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.js';
import { listConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.js';
import type { RegistrarAtendimentoInput } from '/_102047_/l2/agendaClinica/web/contracts/agenda.defs.js';
import type { ListConsultaInput } from '/_102047_/l2/agendaClinica/web/contracts/agenda.defs.js';
import { pendingConsultaRepository } from '/_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.js';

export const routes: ControllerRoute[] = [
  { key: 'agendaClinica.agenda.cmdRegistrarAtendimento', handler: handleCmdRegistrarAtendimento },
  { key: 'agendaClinica.agenda.qryListConsulta', handler: handleQryListConsulta },
];

async function handleCmdRegistrarAtendimento(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['profissionalAgendaPropria']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'details']);
  if (invalid) throw invalid;
  const data = await registrarAtendimento(scopeParams(input.request.params, input.ctx, ['profissionalAgendaPropria']) as unknown as RegistrarAtendimentoInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
}

async function handleQryListConsulta(input: IRequestEnvelope): Promise<BffResponse> {
  const denied = authorize(input.request, ['profissionalAgendaPropria']);
  if (denied) throw denied;
  const invalid = validateInput(input.request.params, ['id', 'pacienteId', 'profissionalId', 'scheduledAt', 'status']);
  if (invalid) throw invalid;
  const data = await listConsulta(scopeParams(input.request.params, input.ctx, ['profissionalAgendaPropria']) as unknown as ListConsultaInput, input.ctx, { consultaRepository: pendingConsultaRepository });
  return { ok: true, data: projectOutput(data, ['id', 'version', 'pacienteId', 'profissionalId', 'scheduledAt', 'status', 'details']), error: null };
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
