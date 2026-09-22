export const createProfissionalRoute = "agendaClinica.dados_profissional.cmdCreateProfissional" as const;

export interface CreateProfissionalInput {
  "details": {
    "identification"?: {
      "name": string;
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export interface CreateProfissionalOutput {
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
    "base"?: object;
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export const updateProfissionalRoute = "agendaClinica.dados_profissional.cmdUpdateProfissional" as const;

export interface UpdateProfissionalInput {
  "id": string;
  "details": {
    "identification"?: {
      "name": string;
      "docType"?: "SSN" | "EIN" | "Passport" | "DriversLicense" | "NationalId" | "CPF" | "CNPJ" | "VAT" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export interface UpdateProfissionalOutput {
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
    "base"?: object;
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export const listProfissionalRoute = "agendaClinica.dados_profissional.qryListProfissional" as const;

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
    "base"?: object;
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export type ListProfissionalOutput = ListProfissionalItem[];
