/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/meu_cadastro_recepcao.defs.ts" enhancement="_blank"/>

export interface RecepcionistaLoad {
  id: string;
  readonly version: number;
  details: {
    identification: string;
    person: string;
  };
}

export interface RecepcionistaCreateOwnReceptionist {
  id: string;
  readonly version: number;
  details: {
    identification: {
      name: string;
      docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other';
      docId: string;
      countryCode: string;
    };
    person: {
      privacyConsent: string;
    };
  };
}

export interface Meu_cadastro_recepcaoContracts {
  'agendaClinica.meu_cadastro_recepcao.load': {
    kind: 'qry';
    input: {};
    output: { recepcionista: RecepcionistaLoad[] };
    meta: { output: { recepcionista: { entity: 'Recepcionista'; many: true } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['consultarProprioCadastroRecepcao']; scope: 'own' };
  };
  'agendaClinica.meu_cadastro_recepcao.createOwnReceptionist': {
    kind: 'cmd';
    writes: 'Recepcionista.create';
    input: { details: { identification: { name: string; docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other'; docId: string; countryCode: string }; person: { privacyConsent: string } } };
    output: { recepcionista: RecepcionistaCreateOwnReceptionist };
    meta: { output: { recepcionista: { entity: 'Recepcionista'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['consultarProprioCadastroRecepcao']; scope: 'own' };
  };
  'agendaClinica.meu_cadastro_recepcao.updateOwnReceptionist': {
    kind: 'cmd';
    writes: 'Recepcionista.update';
    input: { details: { identification: { name: string; docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other'; docId: string; countryCode: string }; person: { privacyConsent: string } }; id: string; version: number };
    output: { recepcionista: RecepcionistaCreateOwnReceptionist };
    meta: { output: { recepcionista: { entity: 'Recepcionista'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['consultarProprioCadastroRecepcao']; scope: 'own' };
  };
}
