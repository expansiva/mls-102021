export const createProfissionalRoute = "agendaClinica.dados_recepcionista.cmdCreateProfissional" as const;

export interface CreateProfissionalInput {
  "details": {
    "identification"?: {
      "name": string;
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
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
  };
}

export const createRecepcionistaRoute = "agendaClinica.dados_recepcionista.cmdCreateRecepcionista" as const;

export interface CreateRecepcionistaInput {
  "details": {
    "identification"?: {
      "name": string;
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export interface CreateRecepcionistaOutput {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export const updateProfissionalRoute = "agendaClinica.dados_recepcionista.cmdUpdateProfissional" as const;

export interface UpdateProfissionalInput {
  "id": string;
  "details": {
    "identification"?: {
      "name": string;
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
    "person"?: {
      "occupation": string;
      "privacyConsent"?: object;
    };
  };
}

export const updateRecepcionistaRoute = "agendaClinica.dados_recepcionista.cmdUpdateRecepcionista" as const;

export interface UpdateRecepcionistaInput {
  "id": string;
  "details": {
    "identification"?: {
      "name": string;
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export interface UpdateRecepcionistaOutput {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export const listProfissionalRoute = "agendaClinica.dados_recepcionista.qryListProfissional" as const;

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

export const listRecepcionistaRoute = "agendaClinica.dados_recepcionista.qryListRecepcionista" as const;

export interface ListRecepcionistaInput {
  "id": string;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
  };
  "page"?: number;
}

export interface ListRecepcionistaItem {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "status": "Active" | "Inactive" | "Merged" | "Blocked";
      "docType"?: "CPF" | "Passport" | "NationalId" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "person"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export type ListRecepcionistaOutput = ListRecepcionistaItem[];
