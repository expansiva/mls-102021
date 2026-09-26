export const createConsultaRoute = "agendaClinica.consultas.cmdCreateConsulta" as const;

export interface CreateConsultaInput {
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export interface CreateConsultaOutput {
  "id": string;
  "version": number;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export const registrarFaltaRoute = "agendaClinica.consultas.cmdRegistrarFalta" as const;

export interface RegistrarFaltaInput {
  "id": string;
}

export interface RegistrarFaltaOutput {
  "id": string;
  "version": number;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export const updateConsultaRoute = "agendaClinica.consultas.cmdUpdateConsulta" as const;

export interface UpdateConsultaInput {
  "id": string;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export interface UpdateConsultaOutput {
  "id": string;
  "version": number;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export const listConsultaRoute = "agendaClinica.consultas.qryListConsulta" as const;

export interface ListConsultaInput {
  "id": string;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "page"?: number;
}

export interface ListConsultaItem {
  "id": string;
  "version": number;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "telephoneConfirmation"?: {
      "confirmedAt": string;
    };
  };
}

export type ListConsultaOutput = ListConsultaItem[];

export const listPacienteRoute = "agendaClinica.consultas.qryListPaciente" as const;

export interface ListPacienteInput {
  "id": string;
  "details": {
    "identification"?: {
      "subtype": "Person";
      "name": string;
      "docType"?: "CPF" | "NationalId" | "Passport" | "Other";
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

export const listProfissionalRoute = "agendaClinica.consultas.qryListProfissional" as const;

export interface ListProfissionalInput {
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

export interface ListProfissionalItem {
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
    "person"?: {
      "occupation"?: string;
    };
    "general"?: object;
    "agendaClinica"?: object;
  };
}

export type ListProfissionalOutput = ListProfissionalItem[];
