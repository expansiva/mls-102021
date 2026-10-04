/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/meu_cadastro_profissional.defs.ts" enhancement="_blank"/>

export interface ProfissionalLoad {
  id: string;
  readonly version: number;
  details: {
    identification: string;
    person: string;
  };
}

export interface ProfissionalPersistProfessionalCreate {
  id: string;
  readonly version: number;
  details: {
    identification: {
      name: string;
      docType: 'CPF' | 'Passport' | 'NationalId' | 'Other';
      docId: string;
      countryCode: string;
    };
    person: {
      occupation: string;
    };
  };
}

export interface Meu_cadastro_profissionalContracts {
  'agendaClinica.meu_cadastro_profissional.load': {
    kind: 'qry';
    input: {};
    output: { profissionaisRecepcao: ProfissionalLoad[] };
    meta: { output: { profissionaisRecepcao: { entity: 'Profissional'; many: true } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['profissional']; grants: ['consultarProprioCadastroProfissional']; scope: 'own' };
  };
  'agendaClinica.meu_cadastro_profissional.persistProfessionalCreate': {
    kind: 'cmd';
    writes: 'Profissional.create';
    input: { details: { identification: { name: string; docType: 'CPF' | 'Passport' | 'NationalId' | 'Other'; docId: string; countryCode: string }; person: { occupation: string } } };
    output: { profissional: ProfissionalPersistProfessionalCreate };
    meta: { output: { profissional: { entity: 'Profissional'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['profissional']; grants: ['consultarProprioCadastroProfissional']; scope: 'own' };
  };
  'agendaClinica.meu_cadastro_profissional.persistProfessionalUpdate': {
    kind: 'cmd';
    writes: 'Profissional.update';
    input: { details: { identification: { name: string; docType: 'CPF' | 'Passport' | 'NationalId' | 'Other'; docId: string; countryCode: string }; person: { occupation: string } }; id: string; version: number };
    output: { profissional: ProfissionalPersistProfessionalCreate };
    meta: { output: { profissional: { entity: 'Profissional'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['profissional']; grants: ['consultarProprioCadastroProfissional']; scope: 'own' };
  };
}
