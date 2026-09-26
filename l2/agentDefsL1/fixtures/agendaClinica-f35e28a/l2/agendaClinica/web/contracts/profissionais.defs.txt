export const createConsultaRoute = "agendaClinica.profissionais.cmdCreateConsulta" as const;

export interface CreateConsultaInput {
  "patientId": string;
  "professionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "confirmed" | "noShow" | "attended";
}

export interface CreateConsultaOutput {
  "id": string;
  "version": number;
  "patientId": string;
  "professionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "confirmed" | "noShow" | "attended";
}

export const listConsultaRoute = "agendaClinica.profissionais.qryListConsulta" as const;

export interface ListConsultaInput {
  "id": string;
  "patientId": string;
  "professionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "confirmed" | "noShow" | "attended";
  "page"?: number;
}

export interface ListConsultaItem {
  "id": string;
  "version": number;
  "patientId": string;
  "professionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "confirmed" | "noShow" | "attended";
}

export type ListConsultaOutput = ListConsultaItem[];

export const listPacienteRoute = "agendaClinica.profissionais.qryListPaciente" as const;

export interface ListPacienteInput {
  "id": string;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
  };
  "page"?: number;
}

export interface ListPacienteItem {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: {
      "aliases": Array<string>;
      "contacts": Array<object>;
      "relationshipRefs": object;
      "notes"?: string;
    };
  };
}

export type ListPacienteOutput = ListPacienteItem[];

export const listProfissionalRoute = "agendaClinica.profissionais.qryListProfissional" as const;

export interface ListProfissionalInput {
  "id": string;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
  };
  "page"?: number;
}

export interface ListProfissionalItem {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
  };
}

export type ListProfissionalOutput = ListProfissionalItem[];
