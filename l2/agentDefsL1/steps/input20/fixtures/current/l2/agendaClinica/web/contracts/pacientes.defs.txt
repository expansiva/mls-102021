/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts" enhancement="_blank"/>

export const createPacienteRoute = "agendaClinica.pacientes.cmdCreatePaciente" as const;

export interface CreatePacienteInput {
  "details": {
    "identification": {
      "name": string;
      "docType"?: "CPF" | "NationalId" | "Passport" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
  };
}

export interface CreatePacienteOutput {
  "id": string;
  "version": number;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "docType"?: "CPF" | "NationalId" | "Passport" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export const listPacienteRoute = "agendaClinica.pacientes.qryListPaciente" as const;

export interface ListPacienteInput {
  "id"?: string;
  "details"?: {
    "identification"?: {
      "subtype"?: "Person";
      "name"?: string;
      "docType"?: "CPF" | "NationalId" | "Passport" | "Other";
      "docId"?: string;
      "countryCode"?: string;
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
      "docType"?: "CPF" | "NationalId" | "Passport" | "Other";
      "docId"?: string;
      "countryCode": string;
    };
    "base"?: object;
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export type ListPacienteOutput = ListPacienteItem[];
