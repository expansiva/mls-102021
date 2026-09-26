/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.ts" enhancement="_blank"/>
export interface ContatoPaciente {
  id: string;
  version: number;
  details: {
    identification: {
      subtype: string;
      name: string;
      status: string;
      countryCode: string;
    };
    base: Record<string, unknown>;
    contactChannel: {
      contactType: string;
      value: string;
      isVerified: boolean;
    };
    general: Record<string, unknown>;
    agendaClinica: Record<string, unknown>;
  };
}
