export const registrarAtendimentoRoute = "agendaClinica.agenda.cmdRegistrarAtendimento" as const;

export interface RegistrarAtendimentoInput {
  "id": string;
  "details": {
    "attendanceNote"?: string;
  };
}

export interface RegistrarAtendimentoOutput {
  "id": string;
  "version": number;
  "pacienteId": string;
  "profissionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "noShow" | "attended";
  "details": {
    "attendanceNote"?: string;
  };
}

export const listConsultaRoute = "agendaClinica.agenda.qryListConsulta" as const;

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
    "attendanceNote"?: string;
  };
}

export type ListConsultaOutput = ListConsultaItem[];
