/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/agenda_profissional.defs.ts" enhancement="_blank"/>

export interface ConsultaLoad {
  id: string;
  readonly version: number;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'attended' | 'missed';
  pacienteId: string;
  details: {
    attendanceNote: string;
  };
}

export interface PacienteLoad {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
  };
}

export interface ConsultaRegistrarAtendimento {
  id: string;
  readonly version: number;
  details: {
    attendanceNote: string;
  };
}

export interface Agenda_profissionalContracts {
  'agendaClinica.agenda_profissional.load': {
    kind: 'qry';
    input: { pacienteId?: string; page?: number; pageSize?: number };
    output: { agendaProfissional: ConsultaLoad[]; pacientes: PacienteLoad[]; pageConsultasDoDia: number; pageSizeConsultasDoDia: number; hasMoreConsultasDoDia: boolean };
    meta: { output: { agendaProfissional: { entity: 'Consulta'; many: true }; pacientes: { entity: 'Paciente'; many: true } }; lists: { consultasDoDia: { key: 'agendaProfissional'; page: 'pageConsultasDoDia'; pageSize: 'pageSizeConsultasDoDia'; hasMore: 'hasMoreConsultasDoDia' } }; params: { pacienteId: { filters: 'agendaProfissional'; field: 'pacienteId' }; page: { pages: 'consultasDoDia' }; pageSize: { pages: 'consultasDoDia' } } };
    rules: [];
    access: { actors: ['profissional']; grants: ['consultarPropriaAgenda', 'consultarPacientesDaPropriaAgenda']; scope: 'own' };
  };
  'agendaClinica.agenda_profissional.loadAgendaProfissional': {
    kind: 'qry';
    input: { pacienteId?: string; page?: number; pageSize?: number };
    output: { agendaProfissional: ConsultaLoad[]; pageConsultasDoDia: number; pageSizeConsultasDoDia: number; hasMoreConsultasDoDia: boolean };
    meta: { output: { agendaProfissional: { entity: 'Consulta'; many: true } }; lists: { consultasDoDia: { key: 'agendaProfissional'; page: 'pageConsultasDoDia'; pageSize: 'pageSizeConsultasDoDia'; hasMore: 'hasMoreConsultasDoDia' } }; params: { pacienteId: { filters: 'agendaProfissional'; field: 'pacienteId' }; page: { pages: 'consultasDoDia' }; pageSize: { pages: 'consultasDoDia' } } };
    rules: [];
    access: { actors: ['profissional']; grants: ['consultarPropriaAgenda', 'consultarPacientesDaPropriaAgenda']; scope: 'own' };
  };
  'agendaClinica.agenda_profissional.registrarAtendimento': {
    kind: 'cmd';
    writes: 'Consulta.registrarAtendimento';
    input: { details: { attendanceNote: string }; pacienteId: string; profissionalId: string };
    output: { consulta: ConsultaRegistrarAtendimento };
    meta: { output: { consulta: { entity: 'Consulta'; many: false } }; lists: {}; params: {} };
    rules: ['transicoesConsultaValidas', 'atendimentoExigeAnotacao'];
    access: { actors: ['profissional']; grants: ['consultarPropriaAgenda', 'consultarPacientesDaPropriaAgenda']; scope: 'own' };
  };
}
