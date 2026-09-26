export const registrarAtendimentoRoute = "agendaClinica.consultas_profissional.cmdRegistrarAtendimento" as const;

export interface RegistrarAtendimentoInput {
  "id": string;
  "details": {
    "attendanceNote"?: string;
  };
}

export interface RegistrarAtendimentoOutput {
  "id": string;
  "version": number;
  "patientId": string;
  "professionalId": string;
  "scheduledAt": string;
  "status": "scheduled" | "confirmed" | "noShow" | "attended";
  "details": {
    "attendanceNote"?: string;
  };
}

export const listConsultaRoute = "agendaClinica.consultas_profissional.qryListConsulta" as const;

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
  "details": {
    "attendanceNote"?: string;
  };
}

export type ListConsultaOutput = ListConsultaItem[];
