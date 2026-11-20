/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/consultas.ts" enhancement="_blank"/>
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { ConsultasContracts } from '/_102047_/l2/agendaClinica/web/contracts/consultas.defs.js';
import { confirmarConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.js';
import { createConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.js';
import { getConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/getConsulta.js';
import { getPaciente } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/getPaciente.js';
import { getProfissional } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/getProfissional.js';
import { listConsulta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.js';
import { listPaciente } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.js';
import { listProfissional } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.js';
import { registrarFalta } from '/_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.js';

const statuses = ['scheduled', 'confirmed', 'noShow', 'attended'] as const;
type Status = (typeof statuses)[number];

function statusOf(value: string): Status {
  if ((statuses as readonly string[]).includes(value)) return value as Status;
  throw new Error(`Consulta returned unsupported status: ${value}`);
}

function documentType(value: string | undefined): 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other' | undefined {
  const values = ['SSN', 'EIN', 'Passport', 'DriversLicense', 'NationalId', 'CPF', 'CNPJ', 'VAT', 'Other'] as const;
  return value != null && (values as readonly string[]).includes(value) ? value as typeof values[number] : undefined;
}
function professionalDocumentType(value: string | undefined): 'CPF' | 'Passport' | 'NationalId' | 'Other' | undefined {
  const values = ['CPF', 'Passport', 'NationalId', 'Other'] as const;
  return value != null && (values as readonly string[]).includes(value) ? value as typeof values[number] : undefined;
}
function patientStatus(value: string): 'Active' | 'Inactive' | 'Merged' | 'Blocked' {
  const values = ['Active', 'Inactive', 'Merged', 'Blocked'] as const;
  if ((values as readonly string[]).includes(value)) return value as typeof values[number];
  throw new Error(`Paciente returned unsupported status: ${value}`);
}
function professionalType(value: string): 'medical' | 'therapist' {
  if (value === 'medical' || value === 'therapist') return value;
  throw new Error(`Profissional returned unsupported type: ${value}`);
}
function serialize(value: unknown, field: string): string {
  const result = JSON.stringify(value);
  if (result == null) throw new Error(`Cannot serialize ${field}`);
  return result;
}
function pageSizeOf(value: number): number { return Math.min(value, 200); }
function foldText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

async function patientSummary(id: string, ctx: RequestContext): Promise<ConsultasContracts['agendaClinica.consultas.carregarAgenda']['output']['agenda']['items'][number]['paciente']> {
  const p = await getPaciente({ id }, ctx);
  const identification = p.details.identification;
  const result: ConsultasContracts['agendaClinica.consultas.carregarAgenda']['output']['agenda']['items'][number]['paciente'] = {
    id: p.id,
    identification: { details: { identification: { subtype: 'Person', name: identification.name, status: patientStatus(identification.status) } } }
  };
  const type = documentType(identification.docType);
  if (type != null) result.identification.details.identification.docType = type;
  if (identification.docId != null) result.identification.details.identification.docId = identification.docId;
  return result;
}
async function professionalSummary(id: string, ctx: RequestContext): Promise<ConsultasContracts['agendaClinica.consultas.carregarAgenda']['output']['agenda']['items'][number]['profissional']> {
  const p = await getProfissional({ id }, ctx);
  const identification = p.details.identification;
  const result: ConsultasContracts['agendaClinica.consultas.carregarAgenda']['output']['agenda']['items'][number]['profissional'] = {
    id: p.id,
    identification: { details: { identification: { subtype: 'Person', name: identification.name, status: patientStatus(identification.status), countryCode: identification.countryCode } } },
    agendaClinica: { details: { agendaClinica: { professionalType: professionalType(p.details.agendaClinica.professionalType) } } }
  };
  const type = professionalDocumentType(identification.docType);
  if (type != null) result.identification.details.identification.docType = type;
  if (identification.docId != null) result.identification.details.identification.docId = identification.docId;
  return result;
}
async function agendaItems(items: Awaited<ReturnType<typeof listConsulta>>['items'], ctx: RequestContext): Promise<ConsultasContracts['agendaClinica.consultas.carregarAgenda']['output']['agenda']['items']> {
  return Promise.all(items.map(async (item) => ({
    id: item.id, pacienteId: item.pacienteId, profissionalId: item.profissionalId, scheduledAt: item.scheduledAt,
    status: statusOf(item.status), paciente: await patientSummary(item.pacienteId, ctx), profissional: await professionalSummary(item.profissionalId, ctx)
  })));
}
async function allConsultas(input: { dataAgenda: string; status?: Status }, ctx: RequestContext): Promise<Awaited<ReturnType<typeof listConsulta>>['items']> {
  const found: Awaited<ReturnType<typeof listConsulta>>['items'] = [];
  let page = 1;
  while (true) {
    const result = await listConsulta({ ...(input.status == null ? {} : { status: input.status }), page, pageSize: 200 }, ctx);
    found.push(...result.items.filter((item) => item.scheduledAt.slice(0, 10) === input.dataAgenda));
    if (!result.hasMore) return found;
    page += 1;
  }
}
async function agenda(input: { dataAgenda: string; status?: Status; page: number; pageSize: number }, ctx: RequestContext) {
  const records = (await allConsultas(input, ctx)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const size = pageSizeOf(input.pageSize), start = (input.page - 1) * size;
  return { items: await agendaItems(records.slice(start, start + size), ctx), page: input.page, pageSize: size, hasMore: start + size < records.length };
}
async function patientSearch(input: { termo: string; page: number; pageSize: number }, ctx: RequestContext) {
  const records: Awaited<ReturnType<typeof listPaciente>>['items'] = [];
  let page = 1;
  while (true) {
    const result = await listPaciente({ page, pageSize: 200 }, ctx);
    records.push(...result.items);
    if (!result.hasMore) break;
    page += 1;
  }
  const term = foldText(input.termo);
  const matching = records.filter((x) => foldText(x.details.identification.name).includes(term));
  const size = pageSizeOf(input.pageSize), start = (input.page - 1) * size;
  const items = await Promise.all(matching.slice(start, start + size).map((x) => patientSummary(x.id, ctx)));
  return { items, page: input.page, pageSize: size, hasMore: start + size < matching.length };
}
async function professionalSearch(input: { termo: string; page: number; pageSize: number }, ctx: RequestContext) {
  const records: Awaited<ReturnType<typeof listProfissional>>['items'] = [];
  let page = 1;
  while (true) {
    const result = await listProfissional({ page, pageSize: 200 }, ctx);
    records.push(...result.items);
    if (!result.hasMore) break;
    page += 1;
  }
  const term = foldText(input.termo);
  const matching = records.filter((x) => foldText(x.details.identification.name).includes(term));
  const size = pageSizeOf(input.pageSize), start = (input.page - 1) * size;
  const items = await Promise.all(matching.slice(start, start + size).map((x) => professionalSummary(x.id, ctx)));
  return { items, page: input.page, pageSize: size, hasMore: start + size < matching.length };
}
async function detail(id: string, ctx: RequestContext): Promise<ConsultasContracts['agendaClinica.consultas.consultarConsultaSelecionada']['output']['consulta']> {
  const c = await getConsulta({ id }, ctx);
  const p = await getPaciente({ id: c.pacienteId }, ctx);
  const identification = p.details.identification;
  const paciente: ConsultasContracts['agendaClinica.consultas.consultarConsultaSelecionada']['output']['consulta']['paciente'] = {
    id: p.id,
    identification: { details: { identification: { subtype: 'Person', name: identification.name, status: patientStatus(identification.status) } } },
    base: { details: { base: serialize(p.details.base, 'Paciente.base') }, contacts: { details: { base: { contacts: serialize(p.details.base.contacts, 'Paciente.base.contacts') } } } }
  };
  const pt = documentType(identification.docType);
  if (pt != null) paciente.identification.details.identification.docType = pt;
  if (identification.docId != null) paciente.identification.details.identification.docId = identification.docId;
  return { id: c.id, version: c.version, pacienteId: c.pacienteId, profissionalId: c.profissionalId, scheduledAt: c.scheduledAt, status: statusOf(c.status), paciente, profissional: await professionalSummary(c.profissionalId, ctx) };
}
async function redraw(input: { dataAgenda: string; statusAgenda?: Status; page: number; pageSize: number }, ctx: RequestContext) {
  const items = await agenda({ dataAgenda: input.dataAgenda, status: input.statusAgenda, page: input.page, pageSize: input.pageSize }, ctx);
  const all = await allConsultas({ dataAgenda: input.dataAgenda }, ctx);
  return { cabecalho: { dataAgenda: input.dataAgenda }, quantidadePendentes: all.filter((x) => x.status === 'scheduled' || x.status === 'confirmed').length, agenda: items };
}

export const requests: { [K in keyof ConsultasContracts]: (input: ConsultasContracts[K]['input'], ctx: RequestContext) => Promise<ConsultasContracts[K]['output']> } = {
  'agendaClinica.consultas.carregarAgenda': async function (input, ctx) { const agendaResult = await agenda(input, ctx); const all = await allConsultas({ dataAgenda: input.dataAgenda }, ctx); return { cabecalho: { dataAgenda: input.dataAgenda }, quantidadePendentes: all.filter((x) => x.status === 'scheduled' || x.status === 'confirmed').length, agenda: agendaResult }; },
  'agendaClinica.consultas.filtrarAgenda': async function (input, ctx) { const agendaResult = await agenda(input, ctx); const all = await allConsultas({ dataAgenda: input.dataAgenda }, ctx); return { cabecalho: { dataAgenda: input.dataAgenda }, quantidadePendentes: all.filter((x) => x.status === 'scheduled' || x.status === 'confirmed').length, agenda: agendaResult }; },
  'agendaClinica.consultas.carregarMaisAgenda': async function (input, ctx) { return { agenda: await agenda(input, ctx) }; },
  'agendaClinica.consultas.consultarConsultaSelecionada': async function (input, ctx) { return { consulta: await detail(input.id, ctx) }; },
  'agendaClinica.consultas.localizarPacientesParaAgendamento': async function (input, ctx) { return { pacientes: await patientSearch(input, ctx) }; },
  'agendaClinica.consultas.carregarMaisPacientesParaAgendamento': async function (input, ctx) { return { pacientes: await patientSearch(input, ctx) }; },
  'agendaClinica.consultas.localizarProfissionaisParaAgendamento': async function (input, ctx) { return { profissionais: await professionalSearch(input, ctx) }; },
  'agendaClinica.consultas.carregarMaisProfissionaisParaAgendamento': async function (input, ctx) { return { profissionais: await professionalSearch(input, ctx) }; },
  'agendaClinica.consultas.agendarConsulta': async function (input, ctx) { return ctx.data.moduleData.runInTransaction(async (tx) => { const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }; /* consultaSemConflito: enforced by the unique consultation key/usecase. */ const created = await createConsulta({ pacienteId: input.pacienteId, profissionalId: input.profissionalId, scheduledAt: input.scheduledAt, details: {} }, bound); return { consulta: await detail(created.id, bound), ...(await redraw(input, bound)) }; }); },
  'agendaClinica.consultas.confirmarConsulta': async function (input, ctx) { return ctx.data.moduleData.runInTransaction(async (tx) => { const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }; /* transicaoConsultaValida: the transition usecase accepts only scheduled -> confirmed. */ const changed = await confirmarConsulta({ id: input.id, version: input.version }, bound); return { consulta: await detail(changed.id, bound), ...(await redraw(input, bound)) }; }); },
  'agendaClinica.consultas.registrarFalta': async function (input, ctx) { return ctx.data.moduleData.runInTransaction(async (tx) => { const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }; /* transicaoConsultaValida: the transition usecase accepts scheduled/confirmed -> noShow. */ const changed = await registrarFalta({ id: input.id, version: input.version }, bound); return { consulta: await detail(changed.id, bound), ...(await redraw(input, bound)) }; }); }
};
