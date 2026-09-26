/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.ts" enhancement="_blank"/>
export interface Paciente {
  id: string;
  version: number;
  details: {
    identification: {
      subtype: string;
      name: string;
      docType: string;
      docId: string;
      countryCode: string;
    };
    base: Record<string, unknown>;
    person: {
      birthDate: string;
      privacyConsent: Record<string, unknown>;
    };
    general: Record<string, unknown>;
    agendaClinica: Record<string, unknown>;
  };
}
