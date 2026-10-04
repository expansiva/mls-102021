/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/profissionais_recepcao.defs.ts" enhancement="_blank"/>

export interface ProfissionalLoad {
  id: string;
  details: {
    identification: string;
    person: string;
  };
}

export interface Profissionais_recepcaoContracts {
  'agendaClinica.profissionais_recepcao.load': {
    kind: 'qry';
    input: { search?: string; page?: number; pageSize?: number };
    output: { profissionaisRecepcao: ProfissionalLoad[]; pageListaProfissionais: number; pageSizeListaProfissionais: number; hasMoreListaProfissionais: boolean };
    meta: { output: { profissionaisRecepcao: { entity: 'Profissional'; many: true } }; lists: { listaProfissionais: { key: 'profissionaisRecepcao'; page: 'pageListaProfissionais'; pageSize: 'pageSizeListaProfissionais'; hasMore: 'hasMoreListaProfissionais' } }; params: { search: { filters: 'profissionaisRecepcao'; field: 'details.identification.name' }; page: { pages: 'listaProfissionais' }; pageSize: { pages: 'listaProfissionais' } } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
  'agendaClinica.profissionais_recepcao.loadProfissionaisRecepcao': {
    kind: 'qry';
    input: { search?: string; page?: number; pageSize?: number };
    output: { profissionaisRecepcao: ProfissionalLoad[]; pageListaProfissionais: number; pageSizeListaProfissionais: number; hasMoreListaProfissionais: boolean };
    meta: { output: { profissionaisRecepcao: { entity: 'Profissional'; many: true } }; lists: { listaProfissionais: { key: 'profissionaisRecepcao'; page: 'pageListaProfissionais'; pageSize: 'pageSizeListaProfissionais'; hasMore: 'hasMoreListaProfissionais' } }; params: { search: { filters: 'profissionaisRecepcao'; field: 'details.identification.name' }; page: { pages: 'listaProfissionais' }; pageSize: { pages: 'listaProfissionais' } } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['consultarProfissionaisParaAgenda']; scope: 'organization' };
  };
}
