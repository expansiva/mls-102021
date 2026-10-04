/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts" enhancement="_blank"/>

export interface PacienteLoad {
  id: string;
  details: {
    identification: {
      name: string;
      docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other';
      docId: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      countryCode: string;
    };
    base: {
      readonly contacts: string;
    };
    person: {
      privacyConsent: string;
    };
  };
}

export interface PacienteLoadPaciente {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other';
      docId: string;
      countryCode: string;
    };
    base: {
      readonly contacts: string;
    };
    person: {
      privacyConsent: string;
    };
  };
}

export interface ContatoPacienteLoadPaciente {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    contactChannel: {
      contactType: 'Phone';
      value: string;
      isVerified: boolean;
    };
  };
}

export interface PacienteSubmitPatientCreate {
  id: string;
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

export interface PacientesContracts {
  'agendaClinica.pacientes.load': {
    kind: 'qry';
    input: { search?: string; page?: number; pageSize?: number };
    output: { pacientes: PacienteLoad[]; pagePatientList: number; pageSizePatientList: number; hasMorePatientList: boolean };
    meta: { output: { pacientes: { entity: 'Paciente'; many: true } }; lists: { patientList: { key: 'pacientes'; page: 'pagePatientList'; pageSize: 'pageSizePatientList'; hasMore: 'hasMorePatientList' } }; params: { search: { filters: 'pacientes'; field: 'details.identification.name' }; page: { pages: 'patientList' }; pageSize: { pages: 'patientList' } } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes']; scope: 'organization' };
  };
  'agendaClinica.pacientes.loadPacientes': {
    kind: 'qry';
    input: { search?: string; page?: number; pageSize?: number };
    output: { pacientes: PacienteLoad[]; pagePatientList: number; pageSizePatientList: number; hasMorePatientList: boolean };
    meta: { output: { pacientes: { entity: 'Paciente'; many: true } }; lists: { patientList: { key: 'pacientes'; page: 'pagePatientList'; pageSize: 'pageSizePatientList'; hasMore: 'hasMorePatientList' } }; params: { search: { filters: 'pacientes'; field: 'details.identification.name' }; page: { pages: 'patientList' }; pageSize: { pages: 'patientList' } } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes']; scope: 'organization' };
  };
  'agendaClinica.pacientes.loadPaciente': {
    kind: 'qry';
    input: { id?: string };
    output: { paciente: PacienteLoadPaciente };
    meta: { output: { paciente: { entity: 'Paciente'; many: false } }; lists: {}; params: { id: { filters: 'paciente'; field: 'id' } } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes']; scope: 'organization' };
  };
  'agendaClinica.pacientes.submitPatientCreate': {
    kind: 'cmd';
    writes: 'Paciente.create';
    input: { details: { identification: { name: string; docType: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other'; docId: string; countryCode: string }; person: { privacyConsent: string } } };
    output: { paciente: PacienteSubmitPatientCreate };
    meta: { output: { paciente: { entity: 'Paciente'; many: false } }; lists: {}; params: {} };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['cadastrarPacientes', 'consultarCanaisDosPacientes']; scope: 'organization' };
  };
}
