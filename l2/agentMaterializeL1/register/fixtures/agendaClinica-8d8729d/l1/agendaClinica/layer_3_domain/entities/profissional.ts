/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.ts" enhancement="_blank"/>
export interface Profissional {
  id: string;
  version: number;
  details: {
    identification: {
      subtype: string;
      name: string;
      status: string;
      docType: string;
      docId: string;
      countryCode: string;
    };
    base: Record<string, unknown>;
    person: {
      occupation: string;
    };
    general: Record<string, unknown>;
    agendaClinica: Record<string, unknown>;
  };
}
