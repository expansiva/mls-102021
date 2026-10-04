/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/consultas_recepcao.defs.ts" enhancement="_blank"/>

export interface ConsultaLoad {
  id: string;
  readonly version: number;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'attended' | 'missed';
}

export interface PacienteLoad {
  id: string;
  details: {
    identification: string;
  };
}

export interface ProfissionalLoad {
  id: string;
  details: {
    identification: string;
    person: string;
  };
}

export interface PacienteLoadConsulta {
  id: string;
  details: {
    identification: string;
    base: string;
  };
}

export interface ContatoPacienteLoadConsulta {
  id: string;
  details: {
    identification: string;
    contactChannel: string;
  };
}

export interface ConsultaRegistrarAgendamento {
  id: string;
  readonly version: number;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
}

export interface Consultas_recepcaoContracts {
  'agendaClinica.consultas_recepcao.load': {
    kind: 'qry';
    input: { pacienteId?: string; page?: number; pageSize?: number };
    output: { consultasRecepcao: ConsultaLoad[]; pacientes: PacienteLoad[]; profissionaisRecepcao: ProfissionalLoad[]; pageListaConsultas: number; pageSizeListaConsultas: number; hasMoreListaConsultas: boolean };
    meta: { output: { consultasRecepcao: { entity: 'Consulta'; many: true }; pacientes: { entity: 'Paciente'; many: true }; profissionaisRecepcao: { entity: 'Profissional'; many: true } }; lists: { listaConsultas: { key: 'consultasRecepcao'; page: 'pageListaConsultas'; pageSize: 'pageSizeListaConsultas'; hasMore: 'hasMoreListaConsultas' } }; params: { pacienteId: { filters: 'consultasRecepcao'; field: 'pacienteId' }; page: { pages: 'listaConsultas' }; pageSize: { pages: 'listaConsultas' } } };
    rules: ['profissionalHorarioUnico'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.consultas_recepcao.loadConsultasRecepcao': {
    kind: 'qry';
    input: { pacienteId?: string; page?: number; pageSize?: number };
    output: { consultasRecepcao: ConsultaLoad[]; pageListaConsultas: number; pageSizeListaConsultas: number; hasMoreListaConsultas: boolean };
    meta: { output: { consultasRecepcao: { entity: 'Consulta'; many: true } }; lists: { listaConsultas: { key: 'consultasRecepcao'; page: 'pageListaConsultas'; pageSize: 'pageSizeListaConsultas'; hasMore: 'hasMoreListaConsultas' } }; params: { pacienteId: { filters: 'consultasRecepcao'; field: 'pacienteId' }; page: { pages: 'listaConsultas' }; pageSize: { pages: 'listaConsultas' } } };
    rules: ['profissionalHorarioUnico'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.consultas_recepcao.loadConsulta': {
    kind: 'qry';
    input: { id?: string };
    output: { consulta: ConsultaLoad };
    meta: { output: { consulta: { entity: 'Consulta'; many: false } }; lists: {}; params: { id: { filters: 'consulta'; field: 'id' } } };
    rules: ['transicoesConsultaValidas'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.consultas_recepcao.registrarAgendamento': {
    kind: 'cmd';
    writes: 'Consulta.create';
    input: { pacienteId: string; profissionalId: string; scheduledAt: string };
    output: { consulta: ConsultaRegistrarAgendamento };
    meta: { output: { consulta: { entity: 'Consulta'; many: false } }; lists: {}; params: {} };
    rules: ['profissionalHorarioUnico'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.consultas_recepcao.registrarConfirmacao': {
    kind: 'cmd';
    writes: 'Consulta.confirmarConsulta';
    input: { pacienteId: string; profissionalId: string; scheduledAt: string };
    output: { consulta: ConsultaRegistrarAgendamento };
    meta: { output: { consulta: { entity: 'Consulta'; many: false } }; lists: {}; params: {} };
    rules: ['transicoesConsultaValidas'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.consultas_recepcao.registrarFalta': {
    kind: 'cmd';
    writes: 'Consulta.registrarFalta';
    input: { pacienteId: string; profissionalId: string; scheduledAt: string };
    output: { consulta: ConsultaRegistrarAgendamento };
    meta: { output: { consulta: { entity: 'Consulta'; many: false } }; lists: {}; params: {} };
    rules: ['transicoesConsultaValidas'];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes', 'organizarAgenda', 'consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
}
